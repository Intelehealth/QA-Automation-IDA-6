import { test, expect } from '@playwright/test';

// ============================================================
// COUGH PROTOCOL - Full Test Suite
//
// Built from the "Cough" questionnaire (id ID-76884492). It has 10
// top-level questions:
//
//    1. Since when have you had this symptom?*       Acute / Subacute / Chronic
//    2. Specific time of occurence of cough?*        8 options
//    3. What aggravates the cough?*                  multi-select, 4 options
//    4. Is the cough dry or wet?*                    Dry / Wet (+ sputum colour)
//    5. Do you have the following symptom(s)?*      Yes/No checklist, 14 rows
//    6. Taken any medication recently?               3 options (optional)
//    7. Do you smoke/have ever smoked?*              Yes / No / Ex-smoker
//    8. What is your occupation?*                    3 options
//    9. Prior treatment sought                       Yes [Describe] / No (optional)
//   10. Additional information                       free text (optional)
//
// Question 1 is a CHOICE here (a length of time in three bands), not the
// number-and-unit duration used by most other protocols.
//
// FOLLOW-UPS
//   Question 2: "Seasonal" asks which season; "Other[Describe]" opens a text
//   box. Question 3: "Other[Describe]" opens a text box. Question 4: "Wet"
//   asks the colour of the sputum (a required multi-select, with Submit).
//   Question 5: Weight change asks gain, loss or since when; "Other
//   [describe]" opens a text box. Question 6: "Yes [Describe]" opens a text
//   box. Question 7: "Yes" and "Ex-smoker" each offer two options
//   (cigarettes per day, since when). Question 8: "Describe" opens a text
//   box, and "Exposure to dusts/fumes" asks a required Yes/No. Question 9:
//   "Yes [Describe]" opens a text box.
//
// In the questionnaire the last option of questions 2 and 3 is written
// "Other[Describe]" with no space; both spellings are accepted.
//
// Nothing in this questionnaire depends on gender or age, so every patient
// sees the same questions and options.
//
// WHAT IS CERTAIN AND WHAT IS INFERRED
//   Certain  : question and option wording, which questions are required
//              (the ones with an asterisk offer no Skip), which allow
//              several answers (3, and the sputum colour), and which answer
//              opens which follow-up.
//   Inferred : the screen layout, from the other protocols (required
//              single choices advance by themselves; multi-select needs
//              Submit; "Associated symptoms" is a Yes/No checklist whose
//              follow-ups appear under the row; optional questions offer
//              Skip). Follow-ups whose layout has not been seen are
//              detected, not assumed.
//   Not in the file: the Physical Examination questions. This questionnaire
//   lists no exam prompts at all, so that step is answered by an adaptive
//   handler on whatever questions the app shows.
//
// DEFAULT PATH
//   The optional question 6 is answered with a real value, not skipped, so
//   that a refused Skip cannot block every later test (this has happened on
//   another protocol). Skip is tested on its own.
//
// Console output is hidden by quiet:true in playwright.config.js, so
// diagnostics go to the test report (see diag() and attachDiagnostics()).
// ============================================================

const COUGH_REASON_BUTTON_RE = /^Cough$/i;
const COUGH_REASON_TEXT_RE = /^Cough$/i;

// An answer option: the label the app is expected to show, and an optional
// second spelling that is accepted too.
const opt = (label, text = label) => ({ label, text });
const OTHER_NO_SPACE = opt('Other[Describe]', 'Other [Describe]');

// ---- Question 1: how long (one answer) ----
const DURATION_OPTIONS = ['Acute (0-2 weeks)', 'Subacute ( 2 - 8 weeks)', 'Chronic (More than 8 weeks)'];

// ---- Question 2: time of occurence (one answer) ----
const TIMING_SEASONAL = 'Seasonal';
const TIMING_OPTIONS = ['Day', 'Night', 'Lying down', 'Talking', TIMING_SEASONAL, 'Constant', "Don't know", OTHER_NO_SPACE];

// ---- Question 3: what aggravates the cough (several can be chosen) ----
const AGGRAVATING_PLAIN = ['Cold weather', 'Presence of animals eg. cat or birds', 'None'];
const AGGRAVATING_OPTIONS = [...AGGRAVATING_PLAIN, OTHER_NO_SPACE];

// ---- Question 4: dry or wet, and the sputum colour (several can be chosen) ----
const COUGH_TYPE_OPTIONS = ['Dry', 'Wet'];
const SPUTUM_COLOURS = ['Clear', 'Yellow', 'Green', 'Red or pink', 'Brown', 'Black or grey'];

// ---- Question 5: the 14 associated symptoms, in questionnaire order ----
const SYMPTOMS = [
  'Wheezing',
  'Shortness of breath',
  'Pain/Tightness of chest',
  'Hemoptysis',
  'Weight change (kg)',
  'Fever',
  'Hoarseness',
  'Burning feeling in a throat at night/early in the morning',
  'Nasal congestion/Stuffy nose',
  'Runny nose',
  'Post nasal drip',
  'Recent severe stress',
  'Recurrent diarrhoea',
  'Other [describe]'
];
// Symptoms that open no question of their own.
const SYMPTOMS_PLAIN = SYMPTOMS.filter((s) => s !== 'Weight change (kg)' && s !== 'Other [describe]');
const WEIGHT_OPTIONS = ['Weight gain', 'Weight loss', 'since when'];

// ---- Question 6: medication (one answer, optional) ----
const MEDICATION_OPTIONS = ['Yes [Describe]', 'None', "Don't know"];

// ---- Question 7: smoking (one answer). "Yes" and "Ex-smoker" each offer
// two options, and each of those opens a box. ----
const SMOKING_OPTIONS = ['Yes', 'No', 'Ex-smoker'];
const SMOKING_CIGARETTES = 'How many cigarettes per day did you smoke?';
const SMOKING_SINCE = 'Enter since when';

// ---- Question 8: occupation (one answer) ----
const OCCUPATION_OPTIONS = ['Describe', 'Exposure to dusts/fumes', 'Declined to answer'];
const DUST_HEADING = 'Any exposure to dusts/fumes?';

// ---- Question 9: prior treatment (one answer, optional). Note "No", not "None". ----
const PRIOR_OPTIONS = ['Yes [Describe]', 'No'];

// Learned from the first question marker ("Question 1/10").
let ASSESSMENT_TOTAL = 10;

// How long to wait for the next question to appear. Normally a few seconds, but
// a recording showed a question still on its loading dots after a full minute
// while the shared server was busy, so this is patient. A wait that takes 15
// seconds or more is noted in the test report. NEXT_QUESTION_SECONDS=20
// shortens it, e.g.  NEXT_QUESTION_SECONDS=20 npx playwright test ...
const NEXT_QUESTION_TIMEOUT = Number(process.env.NEXT_QUESTION_SECONDS ?? 90) * 1000;

// Seconds each test waits before it starts using the shared dev server
// (login, a new patient, a new visit). Keeps the number of logins and
// patient registrations per minute low. PACE_SECONDS=0 turns it off, e.g.
//   PACE_SECONDS=40 npx playwright test tests/Protocol_Cough.spec.js
const PACE_SECONDS = Number(process.env.PACE_SECONDS ?? 20);

const labelOf = (option) => (typeof option === 'string' ? option : option.label);
const candidatesOf = (option) =>
  typeof option === 'string' ? [option] : [...new Set([option.label, option.text])];

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const questionRe = (n) => new RegExp(`^Question\\s*${n}\\/\\d+$`);

// ------------------------------------------------------------
// Diagnostics that survive quiet:true.
//
// diag() adds a short note to the test report. attachDiagnostics()
// attaches what is on screen (question marker, buttons, paragraphs,
// screenshot) and returns the same text so it can be put inside an
// error message too.
// ------------------------------------------------------------
function diag(...parts) {
  try {
    test.info().annotations.push({
      type: 'note',
      description: parts
        .map((p) => (typeof p === 'string' ? p : JSON.stringify(p)))
        .join(' ')
        .slice(0, 600)
    });
  } catch {
    // not inside a test - nothing to attach to
  }
}

async function attachDiagnostics(page, label) {
  const marker = await getQuestionMarker(page).catch(() => null);
  const buttons = await page.getByRole('button').allTextContents().catch(() => []);
  const paragraphs = await page.locator('main p').allTextContents().catch(() => []);

  const summary = [
    `where      : ${label}`,
    `url        : ${page.url()}`,
    `question   : ${marker || '(no question marker on screen)'}`,
    `buttons    : ${JSON.stringify(buttons.map((b) => b.trim()).filter(Boolean).slice(0, 60))}`,
    `paragraphs : ${JSON.stringify(paragraphs.map((p) => p.trim()).filter(Boolean).slice(0, 30))}`
  ].join('\n');

  try {
    await test.info().attach(`diagnostics - ${label}`, { body: summary, contentType: 'text/plain' });
    await test.info().attach(`screenshot - ${label}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png'
    });
  } catch {
    // outside a test, or the page is already closed
  }

  return summary;
}

// ============================================================
// SHARED HELPERS (carried over unchanged from the earlier protocol suites)
// ============================================================
async function robustClick(locator) {
  await locator.click({ timeout: 5000 }).catch(async () => {
    await locator.click({ force: true, timeout: 5000 }).catch(async () => {
      await locator.evaluate((el) => el.click()).catch(() => {});
    });
  });
}

async function scrollIntoViewWithClearance(page, locator, waitMs = 400) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150)).catch(() => {});
  await page.waitForTimeout(waitMs);
}

async function waitVisible(locator, timeout) {
  return expect(locator)
    .toBeVisible({ timeout })
    .then(() => true)
    .catch(() => false);
}

async function selectGenderRadio(page, gender, { attempts = 4 } = {}) {
  const radio = page.getByRole('radio', { name: gender, exact: true });

  for (let attempt = 1; attempt <= attempts; attempt++) {
    await radio.scrollIntoViewIfNeeded().catch(() => {});
    await radio.check({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);

    const isChecked = await radio.isChecked().catch(() => false);
    if (isChecked) return true;

    diag(
      `selectGenderRadio — "${gender}" was not checked after attempt ${attempt}/${attempts}; retrying.`
    );

    // Escalate to a forced click on later attempts, in case the
    // plain .check() is being swallowed by an overlay or an
    // in-flight re-render.
    await radio.click({ force: attempt >= 2, timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);

    const isCheckedAfterClick = await radio.isChecked().catch(() => false);
    if (isCheckedAfterClick) return true;
  }

  diag(`selectGenderRadio — "${gender}" could not be confirmed checked after ${attempts} attempts.`);
  return false;
}

async function fillAndVerify(page, locator, value, fieldName, { attempts = 3 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ timeout: 5000 }).catch(() => {});
    await locator.fill('').catch(() => {});
    await page.waitForTimeout(150);
    await locator.fill(value).catch(() => {});
    await page.waitForTimeout(350);

    const current = await locator.inputValue().catch(() => null);

    // Some fields reformat what they are given (spaces, dashes),
    // so compare on digits/letters only.
    const normalise = (t) => String(t || '').replace(/[^a-zA-Z0-9]/g, '');

    if (normalise(current) === normalise(value)) return true;

    diag(
      `fillAndVerify — "${fieldName}" did not keep its value on attempt ${attempt}/${attempts} (wanted "${value}", got "${current}"); retrying.`
    );

    await page.waitForTimeout(500);
  }

  diag(`fillAndVerify — "${fieldName}" could not be set to "${value}" after ${attempts} attempts.`);
  return false;
}

function optionButtonByLabel(scope, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return scope.getByRole('button', { name: new RegExp(`(^|\\s)${escaped}$`, 'i') }).first();
}

async function selectButtonDropdown(page, buttonName, optionText, { search = false } = {}) {

  const trigger = page.getByRole('button', { name: buttonName }).first();
  const triggerVisible = await trigger.isVisible({ timeout: 8000 }).catch(() => false);

  if (!triggerVisible) {
    diag(`selectButtonDropdown — the "${buttonName}" control was not found.`);
    return false;
  }

  await robustClick(trigger);
  await page.waitForTimeout(600);

  if (search) {
    const searchBox = page.getByRole('textbox', { name: 'Search options...' });
    const searchVisible = await searchBox.isVisible({ timeout: 5000 }).catch(() => false);
    if (searchVisible) {
      await searchBox.fill(optionText).catch(() => {});
      await page.waitForTimeout(800);
    }
  }

  let option = page.getByRole('option', { name: optionText, exact: true }).first();
  let optionVisible = await option.isVisible({ timeout: 6000 }).catch(() => false);

  if (!optionVisible) {
    option = page.getByText(optionText, { exact: true }).first();
    optionVisible = await option.isVisible({ timeout: 5000 }).catch(() => false);
  }

  if (!optionVisible) {
    // A missing OPTION is a real problem worth reporting. The
    // control's own label staying on screen afterwards is not -
    // these captions are permanent, which is why this function no
    // longer treats that as a failure.
    diag(`selectButtonDropdown — "${buttonName}" opened but the option "${optionText}" was never offered.`);
    await page
      .screenshot({ path: `debug-dropdown-${buttonName.replace(/\W+/g, '-')}-${Date.now()}.png`, fullPage: true })
      .catch(() => {});
    return false;
  }

  await robustClick(option);
  await page.waitForTimeout(800);

  return true;
}

async function selectSearchableOption(page, placeholderLabel, value, { attempts = 3 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {

    const control = page.locator(`text=${placeholderLabel}`).first();
    const controlVisible = await control.isVisible({ timeout: 5000 }).catch(() => false);

    // Placeholder gone already means a previous attempt succeeded.
    if (!controlVisible && attempt > 1) return true;

    if (controlVisible) {
      await control.click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
    }

    const searchBox = page.getByPlaceholder('Search options...');
    const searchBoxVisible = await searchBox.isVisible({ timeout: 5000 }).catch(() => false);

    if (searchBoxVisible) {
      await searchBox.fill('').catch(() => {});
      await searchBox.fill(value).catch(() => {});
      // Options are fetched/filtered asynchronously.
      await page.waitForTimeout(800);
    }

    const option = page.getByText(value, { exact: true }).first();
    const optionVisible = await option.isVisible({ timeout: 6000 }).catch(() => false);

    if (optionVisible) {
      await robustClick(option);
      await page.waitForTimeout(800);
    }

    // The placeholder disappearing is the signal that a real
    // value is now shown in the control.
    const stillUnset = await page
      .locator(`text=${placeholderLabel}`)
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (!stillUnset) return true;

    diag(
      `selectSearchableOption — "${placeholderLabel}" still unset after attempt ${attempt}/${attempts} (wanted "${value}"); retrying.`
    );

    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(600);
  }

  await page
    .screenshot({ path: `debug-dropdown-${placeholderLabel.replace(/\W+/g, '-')}-${Date.now()}.png`, fullPage: true })
    .catch(() => {});

  throw new Error(
    `selectSearchableOption — could not select "${value}" in the "${placeholderLabel}" dropdown after ${attempts} attempts. The form cannot be submitted without it.`
  );
}

async function findRevealedTextField(page, context) {
  const candidates = [
    page.getByPlaceholder('Describe...'),
    page.getByPlaceholder('Describe', { exact: false }),
    page.locator('main input[type="text"]:visible, main textarea:visible')
  ];

  for (const candidate of candidates) {
    const field = candidate.first();
    const visible = await field.isVisible({ timeout: 4000 }).catch(() => false);
    if (visible) return field;
  }

  const buttons = await page.getByRole('button').allTextContents().catch(() => []);
  diag(
    `findRevealedTextField — no free-text field appeared for "${context}". Buttons on page:`,
    JSON.stringify(buttons)
  );
  await page.screenshot({ path: `debug-ap-describe-${Date.now()}.png`, fullPage: true }).catch(() => {});
  return null;
}

// ============================================================
// SHARED SETUP: Login -> Patient -> Vitals -> Visit Reason (search +
// select "Cough") -> Start Assessment -> arrives at Question 1/10.
// birthYear sets the patient's age (default 2000 = 26).
// ============================================================

async function setupToCoughAssessment(page, { gender = 'Male', birthYear = 2000 } = {}) {

  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(30000);

  // Polite pause before this test starts using the shared dev server. The
  // page is still blank here, so nothing is requested while waiting.
  if (PACE_SECONDS > 0) await page.waitForTimeout(PACE_SECONDS * 1000);

  // Record failed/erroring network calls so that a data-loading
  // failure (e.g. the visit-reason list coming back empty) can be
  // reported with the actual request that failed, instead of just
  // "the button wasn't there".
  const networkProblems = [];
  page.on('requestfailed', (request) => {
    networkProblems.push(`FAILED ${request.method()} ${request.url()} — ${request.failure()?.errorText || 'unknown'}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      networkProblems.push(`HTTP ${response.status()} ${response.url()}`);
    }
  });

  // ------------------------------------------------------------
  // PREFLIGHT: the Visit Reason page (both its search box and its
  // "All reasons" grid) depends on one backend call -
  // /api/mindmap/details/IDA6 - which has failed with
  // ERR_CONNECTION_REFUSED intermittently across many runs. That
  // endpoint never appears anywhere in this test's own code (it's
  // purely the app's internal data load), and every failure log so
  // far shows search and grid going dark together, confirming
  // there's no alternate in-app path that avoids it.
  //
  // Previously, a dead backend was only discovered after the full
  // ~90-second cycle: login, patient creation, vitals, four
  // reason-selection attempts, and a page reload. This checks
  // reachability up front instead, so a bad environment costs
  // seconds per test rather than a minute and a half.
  //
  // It retries with backoff rather than failing on the first
  // attempt, because this backend's outages are frequently brief -
  // a process restart or a short load spike that clears within a
  // minute. A single fast failure works well when the backend is
  // GENUINELY down, but wastes an entire CI run on what would have
  // been a 15-second blip. Total worst-case budget here (~35s) is
  // still far cheaper than the ~90s the old failure mode cost, and
  // cheaper than a full Playwright-level test retry, which repeats
  // login and patient creation from scratch.
  //
  // A 401 counts as healthy - it means the service is listening
  // and rejecting the request for lacking auth, not that it's
  // down. Only a network-level failure (refused, DNS, timeout)
  // counts as unreachable.
  // ------------------------------------------------------------
  const mindmapUrl = 'https://dev.intelehealth.org:3004/api/mindmap/details/IDA6';

  // Extended from 3 attempts / 10s backoff (~30s total) to a much
  // longer budget (~15 attempts / 20s backoff, ~5 minutes total) so
  // that a backend restart or a brief outage window has real time to
  // clear before this gives up. Per the person's explicit choice:
  // retry substantially longer rather than mark this as skipped -
  // the test should end in a real pass or a real fail, not a third
  // "couldn't tell" state. This does mean a genuinely long outage now
  // costs several minutes of wall-clock time before failing, which is
  // the accepted tradeoff for removing the skip state.
  const PREFLIGHT_ATTEMPTS = 15;
  const PREFLIGHT_BACKOFF_MS = 20000;

  let preflightError = null;

  for (let attempt = 1; attempt <= PREFLIGHT_ATTEMPTS; attempt++) {
    preflightError = await page.request
      .get(mindmapUrl, { timeout: 6000 })
      .then(() => null)
      .catch((err) => err);

    if (!preflightError) break;

    if (attempt < PREFLIGHT_ATTEMPTS) {
      diag(
        `setupToCoughAssessment — preflight attempt ${attempt}/${PREFLIGHT_ATTEMPTS} failed ` +
        `(${preflightError.message || preflightError}); waiting ${PREFLIGHT_BACKOFF_MS / 1000}s before retrying.`
      );
      await page.waitForTimeout(PREFLIGHT_BACKOFF_MS);
    }
  }

  if (preflightError) {
    // No longer skipped - always a hard failure after exhausting the
    // full retry budget above (~5 minutes). This is a real outcome,
    // not an unknown one: the backend was confirmed unreachable for
    // that entire window.
    throw new Error(
      `setupToCoughAssessment — backend still unreachable after ${PREFLIGHT_ATTEMPTS} preflight ` +
      `attempts over ~${Math.round((PREFLIGHT_ATTEMPTS - 1) * PREFLIGHT_BACKOFF_MS / 60000)} minutes: ` +
      `${mindmapUrl} (${preflightError.message || preflightError}). This is the same backend the Visit ` +
      `Reason page depends on for both its search box and its "All reasons" grid, so the full test setup ` +
      `would fail at that step anyway. Check backend health with: ` +
      `curl -sS -o /dev/null -w "%{http_code}\\n" ${mindmapUrl}`
    );
  }

  // 1. LOGIN
  await page.goto('/hwwebapp#/auth/login', { waitUntil: 'domcontentloaded' });

  await expect(
    page.getByRole('textbox', { name: 'Enter your username' })
  ).toBeVisible({ timeout: 15000 });

  await page.getByRole('textbox', { name: 'Enter your username' }).fill('nurse1');
  await page.getByRole('textbox', { name: 'Enter your password' }).fill('Nurse@123');
  await page.getByRole('button', { name: 'Select Role' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for either the dashboard or the app's own "Login Failed" popup,
  // so a rejected login fails in seconds and explains itself instead of
  // timing out on a URL.
  const loginOutcome = await Promise.race([
    page.waitForURL(/.*dashboard/, { timeout: 30000 }).then(() => 'dashboard').catch(() => 'timeout'),
    page.getByText(/login failed/i).first().waitFor({ state: 'visible', timeout: 30000 }).then(() => 'rejected').catch(() => 'timeout')
  ]);

  if (loginOutcome !== 'dashboard') {
    const authProblems = networkProblems.filter((p) => /session|login|auth|token/i.test(p)).slice(-5);
    const info = await attachDiagnostics(page, 'login did not reach the dashboard');
    const headline = loginOutcome === 'rejected'
      ? 'The server rejected the login: the app showed "Login Failed" for the username and password in this suite. '
      : 'Login did not reach the dashboard within 30 seconds and no "Login Failed" message appeared. ';
    throw new Error(
      headline
    + `Login-related network problems: ${authProblems.join(' | ') || 'none recorded'}. `
    + 'Try the same username and password by hand: if that fails too, the account or the environment is the cause, not the tests.\n' + info
    );
  }

  // 2. ADD PATIENT
  //
  // Previously unguarded - a real run hit a bare 30-second timeout
  // here with zero diagnostic information, unlike the Visit Reason
  // and registration-form exit points which already capture what
  // actually happened. This closes that gap the same way: on
  // failure, gather the real evidence (URL, buttons, network log,
  // screenshot) before deciding whether this is the known backend
  // outage (skip) or something new (fail loudly with what was
  // found).
  const addPatientsButton = page.getByRole('button', { name: 'Add Patients' });
  const addPatientsVisible = await waitVisible(addPatientsButton, 30000);

  if (!addPatientsVisible) {
    const currentUrl = page.url();
    const visibleButtons = await page.getByRole('button').allTextContents().catch(() => []);

    diag('setupToCoughAssessment — "Add Patients" button never appeared on the dashboard.');
    diag('  current URL         :', currentUrl);
    diag('  buttons present     :', JSON.stringify(visibleButtons));
    diag('  network problemsseen:', JSON.stringify(networkProblems.slice(-10)));

    // Retry with reloads before giving up, matching the "retry
    // longer rather than skip" approach used for the preflight and
    // Visit Reason checks above - a dashboard that failed to load
    // its widgets once may well succeed after a couple of reloads if
    // the backend recovers within a minute or two.
    let recoveredAddPatients = false;

    for (let attempt = 1; attempt <= 3 && !recoveredAddPatients; attempt++) {
      diag(`setupToCoughAssessment — reloading the dashboard (attempt ${attempt}/3) to recover "Add Patients".`);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(8000);
      recoveredAddPatients = await waitVisible(addPatientsButton, 20000);
    }

    if (recoveredAddPatients) {
      diag('setupToCoughAssessment — "Add Patients" recovered after reload retries.');
    } else {
      await page
        .screenshot({ path: `debug-dashboard-add-patients-${Date.now()}.png`, fullPage: true })
        .catch(() => {});

      const hasConfirmedNetworkFailure = networkProblems.some(
        (p) => p.includes('ECONNREFUSED') || p.includes('ERR_CONNECTION_REFUSED')
      );

      // No longer skipped - always a hard failure after the retries
      // above, with the network evidence still reported so it's
      // clear whether this looks like the known outage or something
      // new.
      throw new Error(
        `setupToCoughAssessment — "Add Patients" button never appeared on the dashboard (URL: ${currentUrl}), ` +
        `even after reload retries. ${hasConfirmedNetworkFailure
          ? 'Confirmed backend connection failures were recorded, matching the known outage pattern.'
          : 'No confirmed backend network failure was recorded, so this may be a genuine new issue.'} ` +
        `See the screenshot and button list logged above.`
      );
    }
  }

  await addPatientsButton.click();
  await page.getByRole('button', { name: 'Accept' }).click();
  await page.getByRole('button', { name: 'Accept' }).click();

  await expect(
    page.getByRole('textbox', { name: 'First Name*' })
  ).toBeVisible({ timeout: 15000 });

  // 3. PATIENT DETAILS - unique last name avoids the strict-mode
  // "multiple matching patients" issue found in earlier suites
  // when running the full test list.
  const uniqueLastName = `Test${Date.now()}${Math.floor(Math.random() * 1000)}`;

  await page.getByRole('textbox', { name: 'First Name*' }).fill('Automation');
  await page.getByRole('textbox', { name: 'Last Name*' }).fill(uniqueLastName);

  // Every patient sees the same Cough questions, but gender is still
  // set explicitly and verified rather than left to a bare .check(): in the
  // Abdominal Pain suite an unverified click silently left the default gender.
  const genderApplied = await selectGenderRadio(page, gender);

  if (!genderApplied) {
    await page
      .screenshot({ path: `debug-gender-radio-${gender}-${Date.now()}.png`, fullPage: true })
      .catch(() => {});
    diag(
      `setupToCoughAssessment — WARNING: could not confirm the "${gender}" radio was checked. ` +
      'The patient may not have the requested gender if the default gender was used instead.'
    );
  }

  // 4. DATE OF BIRTH
  // The calendar's header changed in October 2026: a recording of the
  // old click sequence shows the calendar opening and then sitting
  // untouched for the full 30s timeout, because its first click
  // (`button:has(i.fa-chevron-down)`) no longer matches anything.
  //
  // The "Or Age" field is NOT a substitute. A real run entered age 26
  // there: the Date Of Birth box stayed empty, and saving the patient
  // came back as the toast "Add Patient Failed - Request failed with
  // status code 400" (HTTP 400 on openmrs/ws/rest/v1/patient). The
  // server needs a real date of birth.
  //
  // Route 1 types the date. Route 2 uses the calendar, finding its
  // controls by what they contain instead of by an icon class. The
  // field is checked afterwards either way, and if neither route works
  // the calendar's markup is printed so the exact fix can be written.
  const dobInput = page.getByPlaceholder('Enter Date Of Birth');
  const dobFilled = async () =>
    String((await dobInput.inputValue().catch(() => '')) || '').trim() !== '';

  let dobRoute = null;

  // Route 1: type it, then Tab to close the calendar. In
  // react-datepicker the field keeps a value only if the typed text was
  // a real date - junk such as "abc" or "45/45/2000" is cleared on
  // close - so a value that survives is a valid date. (Checked against
  // react-datepicker 7: "01/01/2000" was accepted for day-first,
  // month-first, dashed and ISO field formats alike.) Skipped when the
  // field is read-only.
  if (await dobInput.isEditable().catch(() => false)) {
    for (const typed of [`01/01/${birthYear}`, `01-01-${birthYear}`, `${birthYear}-01-01`, `01.01.${birthYear}`]) {
      await dobInput.click({ timeout: 5000 }).catch(() => {});
      await dobInput.fill('', { timeout: 3000 }).catch(() => {});
      await dobInput.fill(typed, { timeout: 3000 }).catch(() => {});
      await page.keyboard.press('Tab').catch(() => {});
      await page.waitForTimeout(500);

      if (await dobFilled()) {
        dobRoute = `typing ${typed}`;
        break;
      }
    }
  }

  // Route 2: the calendar.
  if (!dobRoute) {
    const picker = page.locator('.react-datepicker').first();
    let failedStep = 'open the calendar';

    try {
      await dobInput.click({ timeout: 5000 });
      await picker.waitFor({ state: 'visible', timeout: 5000 });

      // The day view has no button whose whole name is a four-digit
      // year; the year list does, so this shows whether the header
      // click really opened the year list.
      const yearListOpen = () =>
        picker
          .getByRole('button', { name: /^\d{4}$/ })
          .first()
          .isVisible({ timeout: 800 })
          .catch(() => false);

      failedStep = 'open the year list from the calendar header';
      for (const header of [
        picker.locator('button:has(i.fa-chevron-down)'),
        picker.locator('button').filter({ hasText: /\d{4}/ }),
        picker.getByText(/\d{4}/)
      ]) {
        const target = header.first();
        if (!(await target.isVisible({ timeout: 1500 }).catch(() => false))) continue;
        await target.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(500);
        if (await yearListOpen()) break;
      }
      if (!(await yearListOpen())) throw new Error('clicking the calendar header did not open the year list');

      failedStep = `bring ${birthYear} into view`;
      const yearButton = picker.getByRole('button', { name: String(birthYear), exact: true }).first();
      for (let i = 0; i < 6 && !(await waitVisible(yearButton, 1000)); i++) {
        // The previous-decade arrow is icon-only; inside the calendar
        // the first empty-text button is the previous arrow.
        await picker.getByRole('button').filter({ hasText: /^$/ }).first().click({ timeout: 5000 });
        await page.waitForTimeout(250);
      }

      failedStep = `select year ${birthYear}`;
      await yearButton.click({ timeout: 5000 });
      await page.waitForTimeout(300);

      failedStep = 'select month JAN';
      await picker.getByRole('button', { name: 'JAN' }).first().click({ timeout: 5000 });
      await page.waitForTimeout(300);

      failedStep = 'select day 1';
      await picker
        .locator('.react-datepicker__day--001:not(.react-datepicker__day--outside-month)')
        .first()
        .click({ timeout: 5000 });
      await page.waitForTimeout(500);

      failedStep = 'confirm the date of birth field was filled';
      if (await dobFilled()) dobRoute = 'the calendar';
      else throw new Error('the date of birth field is still empty after clicking through the calendar');
    } catch (err) {
      const reason = String((err && err.message) || err).split('\n')[0];
      diag(`setupToCoughAssessment - the calendar route failed at "${failedStep}" (${reason}).`);

      const markup =
        (await picker.evaluate((el) => el.outerHTML).catch(() => null)) ||
        (await page
          .locator('[class*="datepicker" i], [class*="calendar" i]')
          .first()
          .evaluate((el) => el.outerHTML)
          .catch(() => null));
      diag(
        markup
          ? 'calendar markup (first 3000 characters):\n' + markup.slice(0, 3000)
          : 'no calendar element was found on the page.'
      );
      await page.keyboard.press('Escape').catch(() => {});
    }
  }

  if (!dobRoute) {
    await page
      .screenshot({ path: `debug-dob-failed-${Date.now()}.png`, fullPage: true })
      .catch(() => {});
    throw new Error(
      'setupToCoughAssessment - could not set a date of birth by typing it or by using the ' +
      'calendar. Falling back to the Age field would not help: the server rejects a patient with no ' +
      'date of birth (HTTP 400). See the calendar markup and the screenshot saved with this run.'
    );
  }
  diag(`setupToCoughAssessment - date of birth set by ${dobRoute}.`);

  // 5. PHONE - verified, because a silently-discarded fill here
  // is what produced "Phone number is required" on submit.
  await fillAndVerify(
    page,
    page.getByRole('textbox', { name: 'Enter phone number' }),
    '9090909090',
    'Phone number'
  );

  // 6. EMERGENCY CONTACT
  await fillAndVerify(
    page,
    page.getByRole('textbox', { name: 'Emergency Contact Name*' }),
    'Test User',
    'Emergency Contact Name'
  );
  await fillAndVerify(
    page,
    page.getByRole('textbox', { name: 'Enter Emergency Contact Number' }),
    '9090909091',
    'Emergency Contact Number'
  );

  // 7. COUNTRY
  await selectButtonDropdown(page, 'Country*', 'India', { search: true });

  // 8. POSTAL CODE
  await page.getByRole('textbox', { name: 'Postal Code*' }).fill('751002');

  // 9. STATE
  await selectSearchableOption(page, 'Select State', 'Odisha');

  // 10. DISTRICT - the district options are loaded only after the
  // state is applied, so give that request a moment and let the
  // helper retry if the list is still empty on first open.
  await page.waitForTimeout(1000);
  await selectSearchableOption(page, 'Select District', 'Khordha');

  // 11. ADDRESS
  await page.getByRole('textbox', { name: 'Village/Town/City*' }).fill('Bhubaneswar');
  await page.getByRole('textbox', { name: 'Corresponding Address*' }).fill('Automation Address');
  await page.getByRole('textbox', { name: 'Corresponding Address 2*' }).fill('Automation Address 2');

  // 12. CONTACT TYPE
  await selectButtonDropdown(page, 'Contact Type*', 'Family');

  // 13. NEXT
  await page.getByRole('button', { name: 'Next' }).click();

  // 14. EDUCATION
  await selectButtonDropdown(page, 'Education*', 'Primary');
  await page.getByRole('button', { name: 'Next' }).click();


  await page.waitForTimeout(5000);

  // 15. START VISIT - scoped to this test's unique patient name
  const patientFullName = `Automation ${uniqueLastName}`;

  const patientCard = page
    .locator('div.bg-white.rounded-xl.border')
    .filter({ has: page.locator('p.font-semibold', { hasText: patientFullName }) });

  // If the card never appears, the usual cause is that the
  // registration form was silently rejected and we are still
  // sitting on it. Detecting that gives a useful error instead of
  // a bare 30-second "element not found".
  const patientCardAppeared = await waitVisible(patientCard, 30000);

  if (!patientCardAppeared) {
    const stillOnRegistrationForm = await page
      .getByRole('button', { name: 'Next' })
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (stillOnRegistrationForm) {
      // Scroll to the top first: the blocking field is usually
      // above the fold, so neither the screenshot nor the video
      // shows it otherwise.
      await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
      await page.waitForTimeout(600);

      // Only genuine placeholder strings here. "Country*",
      // "Contact Type*" and "Education*" are permanent captions
      // that stay visible after a value is chosen, so testing for
      // them produced false positives.
      const unsetDropdowns = [];
      // Only the mandatory ones. Occupation, Economic Status and
      // Caste are optional and legitimately stay unset, so listing
      // them here produced misleading diagnostics.
      for (const placeholder of ['Select State', 'Select District']) {
        const unset = await page
          .locator(`text=${placeholder}`)
          .first()
          .isVisible({ timeout: 1000 })
          .catch(() => false);
        if (unset) unsetDropdowns.push(placeholder);
      }

      const validationMessages = await page
        .locator('main [class*="text-red"], main [class*="text-danger"], main [class*="error"]')
        .allTextContents()
        .catch(() => []);

      const meaningfulMessages = validationMessages
        .map((t) => t.trim())
        .filter((t) => t !== '' && t !== '*' && t.length < 160);

      const emptyRequiredInputs = await page
        .locator('main input:visible')
        .evaluateAll((els) =>
          els
            .filter((el) => el.value === '' && el.required)
            .map((el) => el.getAttribute('placeholder') || el.getAttribute('name') || '(unnamed)')
        )
        .catch(() => []);

      diag(
        'setupToCoughAssessment — still on the patient registration form; it was never accepted.'
      );
      diag('  placeholders still showing :', JSON.stringify(unsetDropdowns));
      diag('  validation messages on page:', JSON.stringify(meaningfulMessages));
      diag('  empty required inputs      :', JSON.stringify(emptyRequiredInputs));
      diag('  network problems seen      :', JSON.stringify(networkProblems.slice(-10)));

      await page
        .screenshot({ path: `debug-registration-not-submitted-${Date.now()}.png`, fullPage: true })
        .catch(() => {});

      // All three UI-level checks can come back empty when the
      // real cause is a failed network request rather than a
      // validation problem - confirmed from a 4-worker run where
      // every one of these arrays was empty, yet the same run's
      // network log showed connection-refused and aborted
      // requests to the same backend. Surfacing that here avoids
      // reporting "nothing wrong" about a submission that
      // genuinely never reached the server.
      const registrationNetworkSummary = networkProblems.length
        ? networkProblems.slice(-5).join(' | ')
        : 'no failed requests recorded';

      // No longer skipped - always a hard failure, with the network
      // evidence still reported either way so it's clear whether
      // this looks like the known outage or a genuine validation
      // problem. This one doesn't get a longer retry loop like the
      // preflight and Visit Reason checks above: safely retrying a
      // full form re-submission risks creating a duplicate patient
      // if the first attempt actually landed server-side after a
      // delay, which is a bigger, riskier change than extending an
      // existing read-only retry.
      const hasConfirmedNetworkFailure = networkProblems.some(
        (p) => p.includes('ECONNREFUSED') || p.includes('ERR_CONNECTION_REFUSED')
      );

      throw new Error(
        `setupToCoughAssessment — patient "${patientFullName}" was never created. ` +
        `Placeholders still showing: ${unsetDropdowns.join(', ') || 'none'}. ` +
        `Validation messages: ${meaningfulMessages.join(' | ') || 'none'}. ` +
        `Empty required inputs: ${emptyRequiredInputs.join(', ') || 'none'}. ` +
        `${hasConfirmedNetworkFailure
          ? 'Confirmed backend connection failures were recorded, matching the known outage pattern.'
          : 'No confirmed backend network failure was recorded.'} ` +
        `Recent network problems: ${registrationNetworkSummary}. ` +
        'A full-page screenshot was saved alongside this run.'
      );
    }
  }

  await expect(patientCard).toBeVisible({ timeout: 30000 });

  const startVisitButton = patientCard.getByRole('button', { name: 'Start Visit' });
  await expect(startVisitButton).toBeVisible({ timeout: 30000 });
  await startVisitButton.click({ force: true });

  // 16. VITALS
  await expect(
    page.getByRole('textbox', { name: 'E.g., 172 cm' })
  ).toBeVisible({ timeout: 30000 });

  await page.getByRole('textbox', { name: 'E.g., 172 cm' }).fill('172');
  await page.getByRole('textbox', { name: 'E.g., 63 kg' }).fill('63');
  await page.getByRole('textbox', { name: 'E.g., 120 mmHg' }).fill('120');
  await page.getByRole('textbox', { name: 'E.g., 80 mmHg' }).fill('80');
  await page.getByRole('textbox', { name: 'E.g., 72 bpm' }).fill('72');
  await page.getByRole('textbox', { name: 'E.g., 98.6 °F' }).fill('99');
  await page.getByRole('textbox', { name: 'E.g., 98%' }).fill('98');
  await page.getByRole('textbox', { name: 'E.g., 18 breaths/min' }).fill('18');
  await page.getByRole('textbox', { name: 'E.g., 90 mg/dL' }).fill('90');
  await page.locator('input[name="ppbs_mg_per_dl"]').fill('140');
  await page.getByRole('textbox', { name: 'E.g., 110 mg/dL' }).fill('110');
  await page.getByRole('textbox', { name: 'E.g., 80 cm' }).fill('80');
  await page.getByRole('textbox', { name: 'E.g., 95 cm' }).fill('95');
  await page.locator('input[name="ogtt_mg_per_dl"]').fill('140');
  await page.getByRole('textbox', { name: 'E.g., 5.7%' }).fill('5.7');
  await page.locator('select[name="blood_group"]').selectOption(
    '9d2e999b-538f-11e6-9cfe-86f436325720'
  );

  // 17. NEXT -> CONFIRM VITALS
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(
    page.getByRole('button', { name: 'Confirm' })
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Confirm' }).click();

  // ============================================================
  // 18. VISIT REASON - search and select "Cough"
  // ============================================================

  await expect(
    page.getByRole('textbox', { name: 'Type or select reason eg.' })
  ).toBeVisible({ timeout: 15000 });

  // Wait for the Visit Reason page to fully settle before
  // interacting - the "All reasons" grid loads async and may
  // still be fetching when the textbox first appears.
  await page.waitForTimeout(1500);

  // The reasons list is fetched from the server and can still be
  // empty when the search box first renders. Confirmed from the
  // failure recording of TC_AP_018/019: the page had loaded, the
  // "All reasons" heading was present, and the grid beneath it
  // was completely empty - so neither the search nor the grid
  // fallback had anything to click.
  //
  // This retries the whole search-then-grid cycle a few times
  // rather than failing the first time the data is late.
  const reasonSearchBox = page.getByRole('textbox', { name: 'Type or select reason eg.' });

  // Extended from 4 attempts to 10, and the reload window widened,
  // so this has real time (several minutes total, combined with the
  // waits below) to recover from a longer outage before giving up -
  // matching the "retry longer, don't skip" choice made for the
  // preflight check above.
  const REASON_ATTEMPTS = 10;
  let reasonSelected = false;

  for (let attempt = 1; attempt <= REASON_ATTEMPTS && !reasonSelected; attempt++) {

    // --- route 1: type into the search box ---
    await reasonSearchBox.click().catch(() => {});
    await page.waitForTimeout(300);
    await reasonSearchBox.fill('').catch(() => {});
    await page.waitForTimeout(300);
    await reasonSearchBox.pressSequentially('cough', { delay: 80 }).catch(() => {});
    await page.waitForTimeout(1500);

    let option = page.getByRole('button', { name: COUGH_REASON_BUTTON_RE }).first();
    let optionVisible = await option.isVisible({ timeout: 5000 }).catch(() => false);

    if (!optionVisible) {
      option = page.locator('div').filter({ hasText: COUGH_REASON_TEXT_RE }).nth(1);
      optionVisible = await option.isVisible({ timeout: 3000 }).catch(() => false);
    }

    // --- route 2: clear the box and use the "All reasons" grid ---
    if (!optionVisible) {
      await reasonSearchBox.fill('').catch(() => {});
      await page.waitForTimeout(800);
      await page.evaluate(() => window.scrollBy(0, 300)).catch(() => {});
      await page.waitForTimeout(600);
      await page.evaluate(() => window.scrollBy(0, -300)).catch(() => {});
      await page.waitForTimeout(400);

      option = page.getByRole('button', { name: COUGH_REASON_BUTTON_RE }).first();
      optionVisible = await option.isVisible({ timeout: 8000 }).catch(() => false);
    }

    if (optionVisible) {
      await robustClick(option);
      await page.waitForTimeout(700);
      reasonSelected = true;
      break;
    }

    const gridButtonCount = await page
      .locator('main button')
      .count()
      .catch(() => 0);

    diag(
      `setupToCoughAssessment — "Cough" not offered on attempt ${attempt}/${REASON_ATTEMPTS}; the reasons list may still be loading (buttons currently in main: ${gridButtonCount}).`
    );

    // From the second attempt onward, reload the page. Confirmed
    // from the TC_AP_018 recording: when the reasons request comes
    // back empty, waiting longer never helps - the grid under "All
    // reasons" simply stays empty for the rest of the run. A
    // reload re-issues the request, and the visit is already saved
    // server-side so the app returns to this same step.
    if (attempt >= 2 && attempt < REASON_ATTEMPTS) {
      diag('setupToCoughAssessment — reloading the Visit Reason page to re-request the reasons list.');

      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(5000);

      const backOnReasonPage = await waitVisible(
        page.getByRole('textbox', { name: 'Type or select reason eg.' }),
        20000
      );

      if (!backOnReasonPage) {
        diag('setupToCoughAssessment — the reload did not return to the Visit Reason page.');
        break;
      }

      continue;
    }

    // Give the reasons request more time before trying again.
    await page.waitForTimeout(8000);
  }

  if (!reasonSelected) {
    const mainButtons = await page.locator('main button').allTextContents().catch(() => []);

    diag('setupToCoughAssessment — reasons list never populated.');
    diag('  buttons present in main :', JSON.stringify(mainButtons));
    diag('  network problems seen   :', JSON.stringify(networkProblems.slice(-15)));

    await page
      .screenshot({ path: `debug-ap-reasons-grid-${Date.now()}.png`, fullPage: true })
      .catch(() => {});

    const networkSummary = networkProblems.length
      ? networkProblems.slice(-5).join(' | ')
      : 'no failed requests recorded';

    // No longer skipped, regardless of whether the network log shows
    // a confirmed backend failure - always a hard failure after
    // exhausting the full retry budget above (attempts, reloads, and
    // waits spanning several minutes). The network evidence is still
    // reported either way, so it's still clear from the message
    // whether this looks like the known backend outage or something
    // new.
    const hasConfirmedBackendFailure = networkProblems.some(
      (p) => p.includes('mindmap/details') || p.includes('ECONNREFUSED') || p.includes('ERR_CONNECTION_REFUSED')
    );

    throw new Error(
      `setupToCoughAssessment — the visit-reason list never populated after ${REASON_ATTEMPTS} attempts ` +
      `(including page reloads) spanning several minutes, so "Cough" could not be selected. ` +
      `${hasConfirmedBackendFailure
        ? 'Confirmed backend connection failures were recorded, matching the known mindmap/details/IDA6 outage pattern.'
        : 'No confirmed backend network failure was recorded, so this may be a genuine new issue.'} ` +
      `Recent network problems: ${networkSummary}`
    );
  }

  await page.waitForTimeout(500);

  await page.getByRole('button', { name: 'Start Assessment' }).click();

  // The "Confirm visit reason?" modal appears as a result of the
  // Start Assessment click above (confirmed via real recording).
  const confirmYesButton = page.getByRole('button', { name: 'Yes', exact: true });
  const confirmYesVisible = await confirmYesButton.isVisible({ timeout: 8000 }).catch(() => false);

  if (confirmYesVisible) {
    await confirmYesButton.click();
    await page.waitForTimeout(800);
  }

  // ============================================================
  // COUGH ASSESSMENT - Question 1/N ready
  // ============================================================

  await waitForQuestion(page, 1);
  await expect(
    page.getByText('Since when have you had this symptom?', { exact: false })
  ).toBeVisible({ timeout: 10000 });

  // The total is part of the marker ("Question 1/10"); remember it.
  const firstMarker = await getQuestionMarker(page);
  const totalMatch = firstMarker && firstMarker.match(/Question\s*1\/(\d+)/);
  if (totalMatch) ASSESSMENT_TOTAL = Number(totalMatch[1]);
}

// ============================================================
// ASSESSMENT HELPERS (10 questions)
// ============================================================

async function waitForQuestion(page, n, timeout = NEXT_QUESTION_TIMEOUT) {
  const started = Date.now();
  const marker = page.getByText(questionRe(n)).first();

  if (await waitVisible(marker, timeout)) {
    const seconds = Math.round((Date.now() - started) / 1000);
    if (seconds >= 15) diag(`Question ${n} took ${seconds}s to appear - the app was slow here`);
    return;
  }

  const info = await attachDiagnostics(page, `waiting for Question ${n}`);
  throw new Error(`Expected to reach Question ${n}, but it never appeared (waited ${Math.round(timeout / 1000)}s).\n${info}`);
}

// An answer option may be written two ways (the label the app shows, and a
// second spelling). Either one is accepted.
async function optionOffered(page, option, timeout = 8000) {
  const candidates = candidatesOf(option);
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    for (const label of candidates) {
      if (await optionButtonByLabel(page, label).isVisible({ timeout: 250 }).catch(() => false)) return true;
    }
    await page.waitForTimeout(300);
  }
  return false;
}

async function chooseOption(page, option) {
  const candidates = candidatesOf(option);
  const deadline = Date.now() + 15000;
  let target = null;

  while (Date.now() < deadline && !target) {
    for (const label of candidates) {
      const button = optionButtonByLabel(page, label);
      if (await button.isVisible({ timeout: 250 }).catch(() => false)) {
        target = button;
        break;
      }
    }
    if (!target) await page.waitForTimeout(300);
  }

  if (!target) {
    const info = await attachDiagnostics(page, `option "${labelOf(option)}" not offered`);
    throw new Error(`The option "${labelOf(option)}" was not offered on this question.\n${info}`);
  }

  await scrollIntoViewWithClearance(page, target, 250);
  await robustClick(target);
  await page.waitForTimeout(400);
}

async function expectOffered(page, option, message) {
  if (await optionOffered(page, option, 10000)) return;
  const info = await attachDiagnostics(page, `option "${labelOf(option)}" not offered`);
  throw new Error(`${message || `The option "${labelOf(option)}" should be offered`}\n${info}`);
}

async function waitUntilStill(page, locator, { quietMs = 600, timeout = 8000 } = {}) {
  const deadline = Date.now() + timeout;
  let last = null;
  let since = Date.now();

  while (Date.now() < deadline) {
    const box = await locator.boundingBox({ timeout: 1000 }).catch(() => null);
    const key = box ? `${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)},${Math.round(box.height)}` : 'none';

    if (key !== last) {
      last = key;
      since = Date.now();
    } else if (key !== 'none' && Date.now() - since >= quietMs) {
      return true;
    }
    await page.waitForTimeout(150);
  }
  return false;
}

async function pressButton(page, locator) {
  // The question may already have moved on by itself (a checklist can advance
  // as soon as its last row is answered), in which case there is nothing left
  // to press and that is fine: the caller waits for the next question anyway.
  if (!(await locator.isVisible().catch(() => false))) return false;

  await locator.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150)).catch(() => {});
  await page.waitForTimeout(200);
  await waitUntilStill(page, locator);

  return locator
    .evaluate((el) => {
      el.click();
      return true;
    }, undefined, { timeout: 3000 })
    .catch(() => false);
}

async function clickSubmit(page) {
  const submit = page.getByRole('button', { name: 'Submit', exact: true }).first();
  await expect(submit, 'Expected a Submit button on this question').toBeVisible({ timeout: 15000 });
  await pressButton(page, submit);
  await page.waitForTimeout(1000);
}

async function clickSubmitIfVisible(page) {
  const submit = page.getByRole('button', { name: 'Submit', exact: true }).first();
  const visible = await submit.isVisible({ timeout: 1500 }).catch(() => false);
  if (!visible) return false;
  await pressButton(page, submit);
  await page.waitForTimeout(1000);
  return true;
}

async function continueToNext(page, n) {
  const next = page.getByText(questionRe(n + 1)).first();
  if (await waitVisible(next, 3500)) return;

  await clickSubmitIfVisible(page);
  await waitForQuestion(page, n + 1);
}

async function skipQuestion(page, n) {
  const skip = page.getByRole('button', { name: 'Skip', exact: true }).first();
  await expect(skip, `Question ${n} is optional and should offer Skip`).toBeVisible({ timeout: 10000 });

  for (let attempt = 1; attempt <= 2; attempt++) {
    await pressButton(page, skip);
    await page.waitForTimeout(1000);

    if (n >= ASSESSMENT_TOTAL) return;
    if (await waitVisible(page.getByText(questionRe(n + 1)).first(), 6000)) return;

    const stillHere = await page.getByText(questionRe(n)).first().isVisible({ timeout: 500 }).catch(() => false);
    if (!stillHere) break;

    const rejected = await page
      .getByText(/please select any one option/i)
      .first()
      .isVisible({ timeout: 500 })
      .catch(() => false);

    if (rejected && attempt === 2) {
      const info = await attachDiagnostics(page, `Skip rejected on Question ${n}`);
      throw new Error(
        `The app rejected Skip on Question ${n}: it showed "Please select any one option" ` +
        'although the question is not marked required (*) and offers a Skip button.\n' + info
      );
    }
  }

  await waitForQuestion(page, n + 1);
}

// Single-choice questions advance by themselves once answered: 1 (duration),
// 2 (time of occurence), 4 (dry or wet), 6 (medication), 7 (smoking),
// 8 (occupation) and 9 (prior treatment).
async function answerSingleChoice(page, n, option) {
  await waitForQuestion(page, n);
  await chooseOption(page, option);
  await continueToNext(page, n);
}

// Multi-select questions (3: what aggravates the cough): several answers can
// be chosen, so they end with Submit.
async function answerMulti(page, n, options, { advance = true } = {}) {
  await waitForQuestion(page, n);

  if (options === null) {
    await skipQuestion(page, n);
    return;
  }

  for (const option of options) await chooseOption(page, option);
  if (advance) await continueToNext(page, n);
}

// The entry boxes on screen (a number or a text box under an answer).
const visibleInputs = (page) =>
  page.locator(
    'main textarea:visible, main input:visible:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]):not([type="button"]):not([type="submit"])'
  );

// ------------------------------------------------------------
// Question 4/10 - "Is the cough dry or wet?*" - "Dry" advances by itself.
// "Wet" opens a required multi-select (the colour of the sputum), so it ends
// with Submit.
// ------------------------------------------------------------
async function answerCoughType(page, type = 'Dry', colours = ['Clear']) {
  await waitForQuestion(page, 4);
  await chooseOption(page, type);

  if (type === 'Wet') {
    for (const colour of colours) await chooseOption(page, colour);
  }
  await continueToNext(page, 4);
}

function symptomRow(page, name) {
  const labelRe = new RegExp(`^\\s*(?:\\d+\\.\\s*)?${escapeRegExp(name)}\\s*$`, 'i');
  return page
    .locator('div.flex.items-center.justify-between')
    .filter({ has: page.locator('span', { hasText: labelRe }) })
    .first();
}

async function answerSymptomRow(page, name, answer = 'No') {
  const row = symptomRow(page, name);
  await expect(row, `Symptom row "${name}" was not found`).toBeVisible({ timeout: 10000 });

  const pattern = answer.toLowerCase() === 'no' ? /no\s*No/i : /yes\s*Yes/i;
  const button = row.getByRole('button', { name: pattern }).first();
  await expect(button, `The "${answer}" button was not found on the "${name}" row`).toBeVisible({ timeout: 8000 });

  await scrollIntoViewWithClearance(page, button, 150);
  await robustClick(button);
  await page.waitForTimeout(200);
}

// ------------------------------------------------------------
// Question 5/10 - "Do you have the following symptom(s)?*" - a Yes/No
// checklist (14 rows), then Submit. Rows are numbered ("5. Weight change
// (kg)"), so rows are found by name with the number ignored.
// ------------------------------------------------------------
async function answerSymptoms(
  page,
  { defaultAnswer = 'No', overrides = {}, subAnswers = {}, submit = true } = {}
) {
  await waitForQuestion(page, 5);

  for (const name of SYMPTOMS) {
    await answerSymptomRow(page, name, overrides[name] || defaultAnswer);

    // A "Yes" can open a follow-up that must be answered before Submit.
    for (const option of subAnswers[name] || []) {
      await chooseOption(page, option);
    }
  }

  if (!submit) return;
  await clickSubmit(page);
  await waitForQuestion(page, 6);
}

// Stand on question 5 and answer one symptom "Yes", leaving its follow-up open.
async function openSymptom(page, name) {
  await setupAndGoTo(page, 5);
  await waitForQuestion(page, 5);
  await answerSymptomRow(page, name, 'Yes');
  await page.waitForTimeout(1200);
}

async function completeCoughAssessment(page, overrides = {}) {
  const {
    duration = 'Acute (0-2 weeks)',
    timing = 'Day',
    aggravating = ['None'],
    coughType = 'Dry',
    sputum = ['Clear'],
    symptomDefault = 'No',
    symptomOverrides = {},
    symptomSubAnswers = {},
    medication = 'None',
    smoking = 'No',
    occupation = 'Declined to answer',
    prior = 'No',
    additionalInfo = {}
  } = overrides;

  await answerSingleChoice(page, 1, duration);
  await answerSingleChoice(page, 2, timing);
  await answerMulti(page, 3, aggravating);
  await answerCoughType(page, coughType, sputum);
  await answerSymptoms(page, {
    defaultAnswer: symptomDefault,
    overrides: symptomOverrides,
    subAnswers: symptomSubAnswers
  });
  await answerSingleChoice(page, 6, medication);
  await answerSingleChoice(page, 7, smoking);
  await answerSingleChoice(page, 8, occupation);
  await answerSingleChoice(page, 9, prior);
  await answerAdditionalInfo(page, additionalInfo);
}

// Setup, then answer every question before `n` with defaults so the flow
// stands on question `n`. The optional question 6 is answered, not skipped.
async function setupAndGoTo(page, n, { gender = 'Male' } = {}) {
  await setupToCoughAssessment(page, { gender });
  if (n > 1) await answerSingleChoice(page, 1, 'Acute (0-2 weeks)');
  if (n > 2) await answerSingleChoice(page, 2, 'Day');
  if (n > 3) await answerMulti(page, 3, ['None']);
  if (n > 4) await answerCoughType(page, 'Dry');
  if (n > 5) await answerSymptoms(page);
  if (n > 6) await answerSingleChoice(page, 6, 'None');
  if (n > 7) await answerSingleChoice(page, 7, 'No');
  if (n > 8) await answerSingleChoice(page, 8, 'Declined to answer');
  if (n > 9) await answerSingleChoice(page, 9, 'No');
}

async function confirmVisitReasonSummaryAndHandWash(page) {
  await page.waitForTimeout(1200);

  const summaryVisible = await page
    .getByText('Visit reason summary', { exact: false })
    .isVisible({ timeout: 8000 })
    .catch(() => false);

  if (summaryVisible) {
    const confirm = page.getByRole('button', { name: 'Confirm', exact: true });
    if (await confirm.isVisible({ timeout: 8000 }).catch(() => false)) {
      await confirm.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(300);
      await robustClick(confirm);
      await page.waitForTimeout(1000);
    }
  }

  const okay = page.getByRole('button', { name: 'Okay', exact: true });
  if (await okay.isVisible({ timeout: 8000 }).catch(() => false)) {
    await okay.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(300);
    await robustClick(okay);
    await page.waitForTimeout(500);
  }
}

async function answerAdditionalInfo(page, { text = null, finish = true } = {}) {
  await waitForQuestion(page, ASSESSMENT_TOTAL);

  if (text) {
    const box = page.getByPlaceholder('Describe...');
    await expect(box).toBeVisible({ timeout: 10000 });
    await box.fill(text);
    if (!(await clickSubmitIfVisible(page))) {
      await robustClick(page.getByRole('button', { name: 'Skip', exact: true }).first());
    }
  } else {
    const skip = page.getByRole('button', { name: 'Skip', exact: true }).first();
    await expect(skip).toBeVisible({ timeout: 10000 });
    await robustClick(skip);
  }

  if (finish) await confirmVisitReasonSummaryAndHandWash(page);
}

// ============================================================
// PHYSICAL EXAMINATION - adaptive
//
// The exam questions for this protocol are not in the questionnaire (it lists
// no exam prompts at all), so each question is answered by what is on
// screen:
//   - a Yes/No checklist: "No" on every row, then Submit
//   - option buttons: the negative/normal one (No, None, Normal, Negative,
//     Not palpable ...), or the first if none reads as negative; Submit is
//     pressed if the question has one
//   - number or text boxes: filled with the example value shown in the box
//     ("E.g., 120 mmHg" -> 120), else 1
//   - otherwise Skip
// A question that will not advance fails with the screen attached.
// ============================================================
const CHROME_BUTTONS = new Set([
  '', 'add patient', 'add patients', 'patient details', 'start visit', 'vitals',
  'visit reason', 'physical examination', 'medical history', 'dashboard', 'home',
  'achievements', 'help & support', 'educational videos', 'settings', 'about us',
  'log-out', 'submit', 'skip', 'back', 'confirm', 'change', 'edit answer', 'take a picture'
]);

const NEGATIVE_ANSWER_RE = /^(no|none|normal|absent|negative|nil|not present|not palpable|not enlarged|not tender|no known)\b|\bnormal\b|^no\s/i;

async function answerQuestionGeneric(page) {
  const rows = page
    .locator('div.flex.items-center.justify-between')
    .filter({ has: page.getByRole('button', { name: /no\s*No/i }) });
  const rowCount = await rows.count().catch(() => 0);

  if (rowCount > 1) {
    for (let i = 0; i < rowCount; i++) {
      const noButton = rows.nth(i).getByRole('button', { name: /no\s*No/i }).first();
      await noButton.scrollIntoViewIfNeeded().catch(() => {});
      await robustClick(noButton);
      await page.waitForTimeout(150);
    }
    await clickSubmitIfVisible(page);
    return 'checklist';
  }

  const buttons = page.getByRole('button');
  const total = Math.min(await buttons.count().catch(() => 0), 60);
  const candidates = [];

  for (let i = 0; i < total; i++) {
    const button = buttons.nth(i);
    const text = ((await button.textContent().catch(() => '')) || '').trim();
    if (CHROME_BUTTONS.has(text.toLowerCase())) continue;
    if (!(await button.isVisible({ timeout: 200 }).catch(() => false))) continue;
    candidates.push({ index: i, text });
  }

  if (candidates.length > 0) {
    const chosen = candidates.find((c) => NEGATIVE_ANSWER_RE.test(c.text)) || candidates[0];
    const target = buttons.nth(chosen.index);
    await target.scrollIntoViewIfNeeded().catch(() => {});
    await page.evaluate(() => window.scrollBy(0, -150)).catch(() => {});
    await page.waitForTimeout(300);
    await robustClick(target);
    await page.waitForTimeout(700);
    await clickSubmitIfVisible(page);
    return `option "${chosen.text}"`;
  }

  // Empty number/text boxes (e.g. lying blood pressure). The header search
  // box is not part of the question.
  const inputs = page.locator('main input:visible, main textarea:visible');
  const inputCount = await inputs.count().catch(() => 0);
  const filled = [];

  for (let i = 0; i < inputCount; i++) {
    const el = inputs.nth(i);
    const type = ((await el.getAttribute('type').catch(() => '')) || '').toLowerCase();
    const placeholder = (await el.getAttribute('placeholder').catch(() => '')) || '';
    if (['checkbox', 'radio', 'hidden', 'file', 'button', 'submit'].includes(type) || /search/i.test(placeholder)) continue;
    if (String((await el.inputValue().catch(() => '')) || '').trim() !== '') continue;

    const example = placeholder.match(/e\.g\.,?\s*([\d.]+)/i);
    const value = example ? example[1] : '1';
    await el.fill(value).catch(() => {});
    filled.push(value);
    await page.waitForTimeout(200);
  }

  if (filled.length > 0) {
    await clickSubmitIfVisible(page);
    return `inputs ${filled.join('/')}`;
  }

  const skip = page.getByRole('button', { name: 'Skip', exact: true }).first();
  if (await skip.isVisible({ timeout: 1500 }).catch(() => false)) {
    await robustClick(skip);
    return 'skip';
  }

  return 'nothing';
}

async function expectPhysicalExamStarted(page) {
  const firstQuestion = page.getByText(questionRe(1)).first();
  const stillOnAssessment = page.getByText('Since when have you had this symptom?', { exact: false }).first();
  const deadline = Date.now() + NEXT_QUESTION_TIMEOUT;

  while (Date.now() < deadline) {
    const onExam = await firstQuestion.isVisible({ timeout: 500 }).catch(() => false);
    const stale = await stillOnAssessment.isVisible({ timeout: 500 }).catch(() => false);
    if (onExam && !stale) return;
    await page.waitForTimeout(500);
  }

  const info = await attachDiagnostics(page, 'waiting for the Physical Examination to start');
  throw new Error(`The Physical Examination did not start after the assessment.\n${info}`);
}

async function completePhysicalExamGeneric(page, maxSteps = 25) {
  let previousMarker = null;
  let stuck = 0;
  const trail = [];

  for (let step = 1; step <= maxSteps; step++) {
    const summaryVisible = await page
      .getByText('Physical examination summary', { exact: false })
      .isVisible({ timeout: 2500 })
      .catch(() => false);
    if (summaryVisible) return;

    const before = await getQuestionMarker(page);
    const how = await answerQuestionGeneric(page);
    trail.push(`${before || '(no marker)'} -> ${how}`);

    if (how === 'nothing') {
      const info = await attachDiagnostics(page, `physical exam step ${step}`);
      throw new Error(`Could not find anything to answer on ${before || 'this screen'}.\nAnswered so far: ${trail.join(' | ')}\n${info}`);
    }

    await page.waitForTimeout(1200);
    const after = await getQuestionMarker(page);

    stuck = after !== null && after === before && after === previousMarker ? stuck + 1 : 0;
    previousMarker = after;

    if (stuck >= 2) {
      const info = await attachDiagnostics(page, `physical exam stuck at ${after}`);
      throw new Error(`The Physical Examination is stuck at ${after}.\nAnswered so far: ${trail.join(' | ')}\n${info}`);
    }
  }

  const info = await attachDiagnostics(page, 'physical exam did not finish');
  throw new Error(`The Physical Examination did not reach its summary within ${maxSteps} steps.\nAnswered so far: ${trail.join(' | ')}\n${info}`);
}

async function setupToPhysicalExam(page, overrides = {}) {
  await setupToCoughAssessment(page, { gender: overrides.gender || 'Male' });
  await completeCoughAssessment(page, overrides);
  await expectPhysicalExamStarted(page);
}

// ============================================================
// PHYSICAL EXAM CONFIRM, MEDICAL HISTORY, VISIT SUMMARY / UPLOAD
// (carried over unchanged from the earlier protocol suites)
// ============================================================

function getPhysicalExamModal(page) {
  return page
    .locator('div.bg-white.shadow-xl.flex.flex-col')
    .filter({ has: page.getByText('Physical examination summary', { exact: false }) })
    .first();
}

function getPhysicalExamConfirmButton(page) {
  return getPhysicalExamModal(page).getByRole('button', { name: 'Confirm', exact: true });
}

async function clickPhysicalExamSummaryConfirm(page) {
  const confirmButton = getPhysicalExamConfirmButton(page);

  await expect(confirmButton).toBeVisible({ timeout: 15000 });
  await confirmButton.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(500);

  await confirmButton.evaluate((el) => el.click()).catch(() => {});
  await page.waitForTimeout(1000);

  let modalStillVisible = await page
    .getByText('Physical examination summary', { exact: false })
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (modalStillVisible) {
    const stillPresent = await confirmButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (stillPresent) {
      await confirmButton.click().catch(() => {});
      await page.waitForTimeout(1000);
      modalStillVisible = await page
        .getByText('Physical examination summary', { exact: false })
        .isVisible({ timeout: 3000 })
        .catch(() => false);
    }
  }

  if (modalStillVisible) {
    const stillPresent = await confirmButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (stillPresent) {
      await confirmButton.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
    }
  }
}

async function getQuestionMarker(page) {
  const marker = page.getByText(/^Question\s*\d+\/\d+$/).first();
  const visible = await marker.isVisible({ timeout: 5000 }).catch(() => false);
  if (!visible) return null;
  return await marker.textContent().catch(() => null);
}

async function fillAnyEmptyRequiredInputs(page, value = '1') {
  // Scope to the <main> content region so this can never touch
  // the global Patient Search box in the page header.
  const scope = page.locator('main');
  const scopeVisible = await scope.isVisible({ timeout: 3000 }).catch(() => false);
  const root = scopeVisible ? scope : page;

  const inputs = root.locator('input[type="text"]:visible, input:not([type]):visible, textarea:visible');
  const count = await inputs.count().catch(() => 0);

  for (let i = 0; i < count; i++) {
    const inputEl = inputs.nth(i);

    const placeholder = (await inputEl.getAttribute('placeholder').catch(() => '')) || '';
    const ariaLabel = (await inputEl.getAttribute('aria-label').catch(() => '')) || '';
    if (/search/i.test(placeholder) || /search/i.test(ariaLabel)) continue;

    const currentValue = await inputEl.inputValue().catch(() => null);

    if (currentValue === '') {
      await inputEl.fill(value).catch(() => {});
    }
  }
}

async function answerCurrentMedicalHistoryQuestion(page) {
  const questionMarkerText = await getQuestionMarker(page);

  // Case 0: "Complete" action (Vaccination-style question -
  // observed for BOTH child and adult patients in this app; see
  // the module-level comment above).
  const completeButton = page.getByRole('button', { name: 'Complete', exact: true });
  if (await completeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await completeButton.click();
    await page.waitForTimeout(1000);
    return 'complete-action';
  }

  // Case 1: Checklist style - multiple rows, each with its own
  // "no No" button (same accessible name repeated per row).
  const checklistRows = page
    .locator('div.flex.items-center.justify-between')
    .filter({ has: page.getByRole('button', { name: /no\s*No/i }) });

  const checklistRowCount = await checklistRows.count().catch(() => 0);

  if (checklistRowCount > 1) {
    for (let i = 0; i < checklistRowCount; i++) {
      const row = checklistRows.nth(i);
      const noButton = row.getByRole('button', { name: /no\s*No/i });

      await noButton.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(100);

      await robustClick(noButton);

      await page.waitForTimeout(150);
    }

    await page.waitForTimeout(800);
    await fillAnyEmptyRequiredInputs(page);
    await page.waitForTimeout(300);

    const submit = page.getByRole('button', { name: 'Submit', exact: true });
    await expect(submit).toBeVisible({ timeout: 15000 });

    await submit.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(300);

    await robustClick(submit);

    await page.waitForTimeout(1500);
    return 'checklist';
  }

  // Case 2: single Yes/No question (exact "No" button, no
  // repeated checklist rows).
  const singleNo = page.getByRole('button', { name: 'No', exact: true });
  if (await singleNo.isVisible({ timeout: 3000 }).catch(() => false)) {
    await singleNo.click();
    await page.waitForTimeout(1500);
    return 'single-yes-no';
  }

  // Case 3: selectable-option style card. Prefer a negative/
  // decline-style option rather than blindly taking .first() -
  // e.g. on "Do you have any allergies?" the options are ["Yes
  // [Describe]", "No known allergies"], both sharing the same
  // "selectable-option" class, and .first() would otherwise pick
  // "Yes [Describe]" purely by DOM order, opening a free-text
  // sub-question the generic handler never fills in.
  const allSelectableOptions = page.locator('button.selectable-option');
  const selectableCount = await allSelectableOptions.count().catch(() => 0);

  if (selectableCount > 0) {
    const negativeSelectable = allSelectableOptions.filter({
      hasText: /no known|do\s*not|denied|never|declin|^no$|normal/i
    }).first();

    const negativeSelectableVisible = await negativeSelectable
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    const chosenSelectable = negativeSelectableVisible
      ? negativeSelectable
      : allSelectableOptions.first();

    if (await chosenSelectable.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chosenSelectable.evaluate((el) => el.click()).catch(() => {});
      await page.waitForTimeout(1500);
      return 'selectable-option';
    }
  }

  // Case 4: generic named-button single choice not matching the
  // above. Prefer any button whose name suggests a negative/
  // default answer.
  const negativeButton = page.getByRole('button', { name: /no known|^no$/i }).first();
  if (await negativeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await negativeButton.evaluate((el) => {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
    }).catch(() => {});
    await page.evaluate(() => window.scrollBy(0, -150)).catch(() => {});
    await page.waitForTimeout(400);

    await robustClick(negativeButton);

    await page.waitForTimeout(1500);
    return 'generic-negative-option';
  }

  // Case 5: LAST-RESORT generic fallback for entirely novel
  // single-choice questions (e.g. "Do you chew tobbaco?" [sic],
  // "Smoking history", "Alcohol use"). Operates directly on all
  // page buttons, filtering out known navigation/breadcrumb
  // noise, preferring a negative/decline-style option.
  {
    const NAV_AND_CONTROL_NOISE = new Set([
      '', 'add patient', 'add patients', 'patient details', 'start visit',
      'vitals', 'visit reason', 'physical examination', 'medical history',
      'dashboard', 'home', 'achievements', 'help & support',
      'educational videos', 'settings', 'about us', 'log-out',
      'submit', 'skip', 'back', 'confirm', 'change', 'edit answer'
    ]);

    const allPageButtons = page.getByRole('button');
    const totalButtonCount = await allPageButtons.count().catch(() => 0);

    const candidates = [];
    for (let i = 0; i < totalButtonCount; i++) {
      const btn = allPageButtons.nth(i);

      const rawText = await btn.textContent().catch(() => '');
      let text = (rawText || '').trim();

      if (!text) {
        const ariaLabel = await btn.getAttribute('aria-label').catch(() => null);
        if (ariaLabel && ariaLabel.trim()) text = ariaLabel.trim();
      }
      if (!text) {
        const imgAlt = await btn.locator('img').first().getAttribute('alt').catch(() => null);
        if (imgAlt && imgAlt.trim()) text = imgAlt.trim();
      }

      const isNoise = text && NAV_AND_CONTROL_NOISE.has(text.toLowerCase());

      let isChevronToggle = false;
      if (!text) {
        const hasChevronIcon = await btn
          .locator('i[class*="fa-chevron"]')
          .first()
          .isVisible({ timeout: 500 })
          .catch(() => false);
        if (hasChevronIcon) isChevronToggle = true;
      }

      if (!isNoise && !isChevronToggle) {
        candidates.push({ index: i, text: text || '(icon-only)' });
      }
    }

    if (candidates.length > 0) {
      const negativeMatch = candidates.find((c) => /do\s*not|denied|never|declin|^no$/i.test(c.text));
      const chosen = negativeMatch || candidates[0];
      const chosenButton = allPageButtons.nth(chosen.index);

      await chosenButton.evaluate((el) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      }).catch(() => {});
      await page.evaluate(() => window.scrollBy(0, -150)).catch(() => {});
      await page.waitForTimeout(500);

      await robustClick(chosenButton);

      await page.waitForTimeout(1000);

      const pageSubmit = page.getByRole('button', { name: 'Submit', exact: true });
      const pageSubmitVisible = await pageSubmit.isVisible({ timeout: 3000 }).catch(() => false);

      if (pageSubmitVisible) {
        await pageSubmit.evaluate((el) => {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
        }).catch(() => {});
        await page.evaluate(() => window.scrollBy(0, -150)).catch(() => {});
        await page.waitForTimeout(300);

        await robustClick(pageSubmit);
        await page.waitForTimeout(1500);
      }

      return 'generic-card-option';
    }
  }

  const allButtons = await page.getByRole('button').allTextContents().catch(() => []);
  diag(
    `answerCurrentMedicalHistoryQuestion — [${questionMarkerText}] could not determine question type. All buttons on page:`,
    JSON.stringify(allButtons)
  );
  await page.screenshot({ path: `debug-medical-history-unknown-${Date.now()}.png`, fullPage: true }).catch(() => {});

  return 'unknown';
}

async function completeMedicalHistoryGeneric(page, maxSteps = 12) {
  let previousMarker = null;
  let stuckCount = 0;

  for (let step = 1; step <= maxSteps; step++) {
    const summaryVisible = await page
      .getByText('Medical history summary', { exact: false })
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (summaryVisible) return;

    const markerBefore = await getQuestionMarker(page);

    const resultType = await answerCurrentMedicalHistoryQuestion(page);

    const markerAfter = await getQuestionMarker(page);

    if (resultType === 'unknown') {
      throw new Error(
        `completeMedicalHistoryGeneric — could not determine the current question's type at step ${step}. See DIAGNOSTIC output above.`
      );
    }

    if (markerAfter !== null && markerAfter === previousMarker) {
      stuckCount++;
    } else {
      stuckCount = 0;
    }
    previousMarker = markerAfter;

    if (stuckCount >= 2) {
      const allButtons = await page.getByRole('button').allTextContents().catch(() => []);
      diag(
        `completeMedicalHistoryGeneric — STUCK at "${markerAfter}" (handler reported "${resultType}", marker before="${markerBefore}" but nothing advanced). All buttons on page:`,
        JSON.stringify(allButtons)
      );
      await page.screenshot({ path: `debug-medhistory-stuck-${Date.now()}.png`, fullPage: true }).catch(() => {});
      throw new Error(
        `completeMedicalHistoryGeneric — stuck at "${markerAfter}": the handler matched case "${resultType}" but the question did not advance. See DIAGNOSTIC output above.`
      );
    }
  }

  throw new Error(
    `completeMedicalHistoryGeneric — did not reach the Medical History summary within ${maxSteps} steps.`
  );
}

function getMedicalHistoryModal(page) {
  return page
    .locator('div.bg-white.shadow-xl.flex.flex-col')
    .filter({ has: page.getByText('Medical history summary', { exact: false }) })
    .first();
}

function getMedicalHistoryConfirmButton(page) {
  return getMedicalHistoryModal(page).getByRole('button', { name: 'Confirm', exact: true });
}

async function clickMedicalHistorySummaryConfirm(page) {
  const confirmButton = getMedicalHistoryConfirmButton(page);

  await expect(confirmButton).toBeVisible({ timeout: 15000 });
  await confirmButton.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(500);

  await confirmButton.evaluate((el) => el.click()).catch(() => {});
  await page.waitForTimeout(1000);

  let modalStillVisible = await page
    .getByText('Medical history summary', { exact: false })
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (modalStillVisible) {
    const stillPresent = await confirmButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (stillPresent) {
      await confirmButton.click().catch(() => {});
      await page.waitForTimeout(1000);
      modalStillVisible = await page
        .getByText('Medical history summary', { exact: false })
        .isVisible({ timeout: 3000 })
        .catch(() => false);
    }
  }

  if (modalStillVisible) {
    const stillPresent = await confirmButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (stillPresent) {
      await confirmButton.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
    }
  }
}

async function waitForVisitSummaryToSettle(page) {
  await expect(
    page.getByText('Visit Summary', { exact: false }).first()
  ).toBeVisible({ timeout: 20000 });

  const spinnerSelectors = [
    '.animate-spin',
    '[role="status"]',
    'svg[class*="spin" i]',
    'div[class*="loader" i]',
    'div[class*="spinner" i]',
    'div[class*="loading" i]'
  ];

  for (const sel of spinnerSelectors) {
    const spinner = page.locator(sel).first();
    const spinnerVisible = await spinner.isVisible({ timeout: 2000 }).catch(() => false);

    if (spinnerVisible) {
      diag(
        `waitForVisitSummaryToSettle — detected a loading spinner via "${sel}", waiting for it to clear`
      );
      await spinner.waitFor({ state: 'hidden', timeout: 45000 }).catch(() => {
        diag(
          `waitForVisitSummaryToSettle — spinner via "${sel}" did not clear within 45s; proceeding anyway`
        );
      });
      break;
    }
  }

  // Fall back to polling a real, stable data signal (the Vitals
  // panel's "Height(cm)" label) rather than trusting spinner
  // detection alone, since it may not match this app's actual
  // markup.
  const heightLabelVisible = await page
    .getByText('Height(cm)', { exact: false })
    .first()
    .isVisible({ timeout: 1000 })
    .catch(() => false);

  if (!heightLabelVisible) {
    await page
      .getByText('Height(cm)', { exact: false })
      .first()
      .waitFor({ state: 'visible', timeout: 45000 })
      .catch(() => {
        diag(
          'waitForVisitSummaryToSettle — Height(cm) still not visible after 45s; downstream assertions will likely fail with full diagnostics attached.'
        );
      });
  }

  await page.waitForTimeout(500);
}

async function completeVisitUpload(page, { doctorSpecialty = 'General Physician' } = {}) {
  await waitForVisitSummaryToSettle(page);

  if (doctorSpecialty) {
    let specialtyOpened = false;

    const specialtyButton = page.getByRole('button', { name: "Select Doctor's specialty" });
    const specialtyButtonVisible = await specialtyButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (specialtyButtonVisible) {
      await specialtyButton.evaluate((el) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      }).catch(() => {});
      await page.evaluate(() => window.scrollBy(0, -150)).catch(() => {});
      await page.waitForTimeout(400);

      await robustClick(specialtyButton);

      await page.waitForTimeout(600);
      specialtyOpened = true;
    } else {
      const specialtyByText = page.getByText("Select Doctor's specialty", { exact: false }).first();
      const specialtyByTextVisible = await specialtyByText.isVisible({ timeout: 5000 }).catch(() => false);

      if (specialtyByTextVisible) {
        await robustClick(specialtyByText);
        await page.waitForTimeout(600);
        specialtyOpened = true;
      }
    }

    if (specialtyOpened) {
      let specialtyOption = page.getByText(doctorSpecialty, { exact: true });
      let specialtyOptionVisible = await specialtyOption.isVisible({ timeout: 4000 }).catch(() => false);

      if (!specialtyOptionVisible) {
        specialtyOption = page.getByRole('option', { name: doctorSpecialty });
        specialtyOptionVisible = await specialtyOption.isVisible({ timeout: 4000 }).catch(() => false);
      }

      if (!specialtyOptionVisible) {
        await specialtyButton.click({ force: true, timeout: 5000 }).catch(async () => {
          await specialtyButton.evaluate((el) => el.click()).catch(() => {});
        });
        await page.waitForTimeout(800);

        specialtyOption = page.getByText(doctorSpecialty, { exact: true });
        specialtyOptionVisible = await specialtyOption.isVisible({ timeout: 4000 }).catch(() => false);

        if (!specialtyOptionVisible) {
          specialtyOption = page.getByRole('option', { name: doctorSpecialty });
          specialtyOptionVisible = await specialtyOption.isVisible({ timeout: 4000 }).catch(() => false);
        }
      }

      if (!specialtyOptionVisible) {
        await page.keyboard.type(doctorSpecialty, { delay: 50 }).catch(() => {});
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter').catch(() => {});
        await page.waitForTimeout(800);

        const specialtyNowSelected = await page
          .getByText(doctorSpecialty, { exact: false })
          .first()
          .isVisible({ timeout: 3000 })
          .catch(() => false);

        if (specialtyNowSelected) {
          specialtyOptionVisible = true;
          specialtyOption = null;
        }
      }

      if (specialtyOption && specialtyOptionVisible) {
        await robustClick(specialtyOption);
        await page.waitForTimeout(500);
      } else if (!specialtyOptionVisible) {
        diag(
          `completeVisitUpload — Dropdown still did not show option "${doctorSpecialty}" after all strategies.`
        );
        await page.screenshot({ path: `debug-specialty-dropdown-${Date.now()}.png`, fullPage: true }).catch(() => {});
      }
    }
  }

  const uploadButton = page.getByRole('button', { name: 'Upload Visit', exact: true });
  await expect(uploadButton).toBeVisible({ timeout: 15000 });

  await uploadButton.evaluate((el) => {
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
  }).catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150)).catch(() => {});
  await page.waitForTimeout(500);

  await robustClick(uploadButton);
  await page.waitForTimeout(1500);

  const uploadButtonStillPresent = await uploadButton.isVisible({ timeout: 3000 }).catch(() => false);

  const sendVisitModal = page
    .locator('div')
    .filter({ hasText: 'Send Visit' })
    .filter({ hasText: 'Are you sure you want to upload this visit?' })
    .last();

  const sendVisitModalVisible = await sendVisitModal.isVisible({ timeout: 8000 }).catch(() => false);

  let yesVisible = false;

  if (sendVisitModalVisible) {
    const yesButton = sendVisitModal.getByRole('button', { name: 'Yes', exact: true });
    yesVisible = await yesButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (yesVisible) {
      await yesButton.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(300);

      await robustClick(yesButton);

      await page.waitForTimeout(1000);
    }
  } else {
    const genericYesButton = page.getByRole('button', { name: 'Yes', exact: true });
    yesVisible = await genericYesButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (yesVisible) {
      await genericYesButton.click({ timeout: 5000 }).catch(async () => {
        await genericYesButton.evaluate((el) => el.click()).catch(() => {});
      });
      await page.waitForTimeout(1000);
    }
  }

  if (!sendVisitModalVisible || !yesVisible) {
    diag(
      `completeVisitUpload — unexpected outcome: uploadButtonStillPresentAfterClick=${uploadButtonStillPresent}, sendVisitModalDetected=${sendVisitModalVisible}, yesConfirmationClicked=${yesVisible}`
    );
  }
}

const pad = (n) => String(n).padStart(3, '0');
const slug = (text) => text.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

async function expectHeading(page, text, message) {
  await expect(
    page.getByText(text, { exact: false }).first(),
    message || `The question "${text}" should be on screen`
  ).toBeVisible({ timeout: 10000 });
}

// True if the label is on screen, as a button or as plain text. Short labels
// must match the whole text, so "Constant" is not mistaken for an earlier
// answer such as "All day/ Constant".
async function isShown(page, option, timeout = 4000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const label of candidatesOf(option)) {
      if (await optionButtonByLabel(page, label).isVisible({ timeout: 200 }).catch(() => false)) return true;
      const exact = label.length <= 20;
      if (await page.getByText(label, { exact }).first().isVisible({ timeout: 200 }).catch(() => false)) return true;
    }
    await page.waitForTimeout(250);
  }
  return false;
}

// Checks several labels at once and reports every missing one together,
// instead of stopping at the first.
async function expectAllShown(page, labels, message) {
  const missing = [];
  for (const label of labels) {
    if (!(await isShown(page, label, missing.length ? 2500 : 8000))) missing.push(labelOf(label));
  }
  if (missing.length === 0) return;

  const info = await attachDiagnostics(page, message);
  throw new Error(`${message}\nNot shown: ${missing.map((m) => `"${m}"`).join(', ')}\n${info}`);
}

async function skipIsOffered(page) {
  return page.getByRole('button', { name: 'Skip', exact: true }).first().isVisible({ timeout: 3000 }).catch(() => false);
}

// Presses Yes or No under one particular question's heading. Several Yes/No
// pairs can be on screen at once (every checklist row has one), so choosing
// by the label alone would press the first pair on the page - which is how a
// "Yes" meant for a follow-up question landed on the first symptom row.
async function chooseAnswerUnder(page, headingText, answer) {
  const heading = page.getByText(headingText, { exact: false }).first();
  await expect(heading, `The question "${headingText}" should be on screen`).toBeVisible({ timeout: 10000 });

  const button = heading.locator(`xpath=following::button[normalize-space(.)="${answer}"][1]`);
  await expect(button, `A "${answer}" button should sit under "${headingText}"`).toBeVisible({ timeout: 10000 });

  await scrollIntoViewWithClearance(page, button, 250);
  await robustClick(button);
  await page.waitForTimeout(400);
}

// Checks that every label is on screen as a BUTTON, and reports all the
// missing ones together. Used for follow-up answers whose wording repeats an
// earlier answer (for example "Left ear" is also the answer to question 1),
// where plain text on the page could make a missing button look present.
async function expectOptionButtons(page, labels, message) {
  const missing = [];
  for (const label of labels) {
    const deadline = Date.now() + (missing.length ? 2500 : 8000);
    let shown = false;
    while (!shown && Date.now() < deadline) {
      shown = await optionButtonByLabel(page, label).isVisible().catch(() => false);
      if (!shown) await page.waitForTimeout(250);
    }
    if (!shown) missing.push(label);
  }
  if (missing.length === 0) return;

  const info = await attachDiagnostics(page, message);
  throw new Error(`${message}\nNo button for: ${missing.map((m) => `"${m}"`).join(', ')}\n${info}`);
}

test.describe('Cough Protocol - Full Test Suite', () => {

test.describe.configure({ timeout: 900000 });

// ============================================================
// QUESTION 1/10 - Since when have you had this symptom? (single choice, required)
// ============================================================

// TC_CG_001 - the visit reason can be selected and starts the assessment
test('TC_CG_001_Verify_Visit_Reason_Selection_Starts_Assessment', async ({ page }) => {
  await setupToCoughAssessment(page);

  await expect(page.getByText(questionRe(1)).first()).toBeVisible();
  await expectHeading(page, 'Since when have you had this symptom?');
});

// TC_CG_002 - all three bands are offered, and there is no Skip (required)
test('TC_CG_002_Verify_Duration_Question_Shows_All_Options', async ({ page }) => {
  await setupToCoughAssessment(page);
  await waitForQuestion(page, 1);

  for (const label of DURATION_OPTIONS) await expectOffered(page, label);
  expect.soft(await skipIsOffered(page), 'This question is marked required (*) and should have no Skip').toBeFalsy();
});

// TC_CG_003 - TC_CG_005 - each band advances to the timing question
DURATION_OPTIONS.forEach((label, i) => {
  test(`TC_CG_${pad(3 + i)}_Verify_Duration_${slug(label)}_Advances`, async ({ page }) => {
    await setupToCoughAssessment(page);
    await answerSingleChoice(page, 1, label);

    await waitForQuestion(page, 2);
    await expectHeading(page, 'Is there a specific time of occurence of cough?');
  });
});

// ============================================================
// QUESTION 2/10 - Is there a specific time of occurence of cough? (required)
// ============================================================

// TC_CG_006 - all eight options are offered, and there is no Skip (required)
test('TC_CG_006_Verify_Timing_Question_Shows_All_Options', async ({ page }) => {
  await setupAndGoTo(page, 2);
  await waitForQuestion(page, 2);

  await expectHeading(page, 'Is there a specific time of occurence of cough?');
  for (const label of TIMING_OPTIONS) await expectOffered(page, label);
  expect.soft(await skipIsOffered(page), 'This question is marked required (*) and should have no Skip').toBeFalsy();
});

// TC_CG_007 - "Day" advances to the aggravating factors
test('TC_CG_007_Verify_Timing_Day_Advances', async ({ page }) => {
  await setupAndGoTo(page, 2);
  await answerSingleChoice(page, 2, 'Day');

  await waitForQuestion(page, 3);
  await expectHeading(page, 'What aggravates the cough?');
});

// TC_CG_008 - "Constant" advances
test('TC_CG_008_Verify_Timing_Constant_Advances', async ({ page }) => {
  await setupAndGoTo(page, 2);
  await answerSingleChoice(page, 2, 'Constant');

  await waitForQuestion(page, 3);
});

// TC_CG_009 - "Seasonal" asks which season
test('TC_CG_009_Verify_Timing_Seasonal_Reveals_Text_Field', async ({ page }) => {
  await setupAndGoTo(page, 2);
  await waitForQuestion(page, 2);

  await chooseOption(page, TIMING_SEASONAL);
  await page.waitForTimeout(1000);

  const field = await findRevealedTextField(page, 'Timing -> Seasonal - Which season');
  expect(field, 'Choosing "Seasonal" should reveal a box asking which season').not.toBeNull();

  await field.fill('Winter');
  await expect(field).toHaveValue('Winter');
});

// TC_CG_010 - "Other[Describe]" reveals a free-text field
test('TC_CG_010_Verify_Timing_Other_Reveals_Text_Field', async ({ page }) => {
  await setupAndGoTo(page, 2);
  await waitForQuestion(page, 2);

  await chooseOption(page, OTHER_NO_SPACE);
  await page.waitForTimeout(1000);

  const field = await findRevealedTextField(page, 'Timing -> Other[Describe]');
  expect(field, 'Choosing "Other[Describe]" should reveal a free-text field').not.toBeNull();

  await field.fill('After exercise');
  await expect(field).toHaveValue('After exercise');
});

// ============================================================
// QUESTION 3/10 - What aggravates the cough? (multi-select, required)
// ============================================================

// TC_CG_011 - all four options are offered, and there is no Skip (required)
test('TC_CG_011_Verify_Aggravating_Factors_Question_Shows_All_Options', async ({ page }) => {
  await setupAndGoTo(page, 3);
  await waitForQuestion(page, 3);

  await expectHeading(page, 'What aggravates the cough?');
  for (const label of AGGRAVATING_OPTIONS) await expectOffered(page, label);
  expect.soft(await skipIsOffered(page), 'This question is marked required (*) and should have no Skip').toBeFalsy();
});

// TC_CG_012 - "None" plus Submit advances to the cough type
test('TC_CG_012_Verify_No_Aggravating_Factor_Advances', async ({ page }) => {
  await setupAndGoTo(page, 3);
  await answerMulti(page, 3, ['None']);

  await waitForQuestion(page, 4);
  await expectHeading(page, 'Is the cough dry or wet?');
});

// TC_CG_013 - "Cold weather" plus Submit advances
test('TC_CG_013_Verify_Cold_Weather_Advances', async ({ page }) => {
  await setupAndGoTo(page, 3);
  await answerMulti(page, 3, ['Cold weather']);

  await waitForQuestion(page, 4);
});

// TC_CG_014 - several factors can be chosen together (multi-select)
test('TC_CG_014_Verify_Several_Aggravating_Factors_Can_Be_Chosen_Together', async ({ page }) => {
  await setupAndGoTo(page, 3);
  await answerMulti(page, 3, ['Cold weather', 'Presence of animals eg. cat or birds']);

  await waitForQuestion(page, 4);
});

// TC_CG_015 - "Other[Describe]" reveals a free-text field
test('TC_CG_015_Verify_Aggravating_Other_Reveals_Text_Field', async ({ page }) => {
  await setupAndGoTo(page, 3);
  await waitForQuestion(page, 3);

  await chooseOption(page, OTHER_NO_SPACE);
  await page.waitForTimeout(1000);

  const field = await findRevealedTextField(page, 'Aggravating factors -> Other[Describe]');
  expect(field, 'Choosing "Other[Describe]" should reveal a free-text field').not.toBeNull();

  await field.fill('Strong smells');
  await expect(field).toHaveValue('Strong smells');
});

// ============================================================
// QUESTION 4/10 - Is the cough dry or wet? (required)
// ============================================================

// TC_CG_016 - both options are offered, and there is no Skip (required)
test('TC_CG_016_Verify_Cough_Type_Question_Shows_Both_Options', async ({ page }) => {
  await setupAndGoTo(page, 4);
  await waitForQuestion(page, 4);

  await expectHeading(page, 'Is the cough dry or wet?');
  for (const label of COUGH_TYPE_OPTIONS) await expectOffered(page, label);
  expect.soft(await skipIsOffered(page), 'This question is marked required (*) and should have no Skip').toBeFalsy();
});

// TC_CG_017 - "Dry" advances to the symptoms
test('TC_CG_017_Verify_Dry_Cough_Advances', async ({ page }) => {
  await setupAndGoTo(page, 4);
  await answerSingleChoice(page, 4, 'Dry');

  await waitForQuestion(page, 5);
  await expectHeading(page, 'Do you have the following symptom(s)?');
});

// TC_CG_018 - "Wet" asks the colour of the sputum
test('TC_CG_018_Verify_Wet_Cough_Asks_Colour_Of_Sputum', async ({ page }) => {
  await setupAndGoTo(page, 4);
  await waitForQuestion(page, 4);

  await chooseOption(page, 'Wet');
  await page.waitForTimeout(1200);

  await expectAllShown(page, ['What is the colour of the sputum?'], 'Choosing "Wet" should ask the colour of the sputum');
  await expectOptionButtons(page, SPUTUM_COLOURS, 'A wet cough should offer all six sputum colours');
});

// TC_CG_019 - "Wet" with a sputum colour plus Submit advances
test('TC_CG_019_Verify_Wet_Cough_With_Sputum_Colour_Advances', async ({ page }) => {
  await setupAndGoTo(page, 4);
  await answerCoughType(page, 'Wet', ['Yellow']);

  await waitForQuestion(page, 5);
});

// TC_CG_020 - several sputum colours can be chosen together (multi-select)
test('TC_CG_020_Verify_Several_Sputum_Colours_Can_Be_Chosen_Together', async ({ page }) => {
  await setupAndGoTo(page, 4);
  await answerCoughType(page, 'Wet', ['Clear', 'Yellow']);

  await waitForQuestion(page, 5);
});

// ============================================================
// QUESTION 5/10 - Associated symptoms (Yes/No checklist, 14 rows)
// ============================================================

// TC_CG_021 - all fourteen symptoms are listed
test('TC_CG_021_Verify_Associated_Symptoms_Lists_All_14_Rows', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await waitForQuestion(page, 5);

  for (const name of SYMPTOMS) {
    await expect(symptomRow(page, name), `Symptom "${name}" should be listed`).toBeVisible({ timeout: 10000 });
  }
});

// TC_CG_022 - every symptom "No" plus Submit advances
test('TC_CG_022_Verify_All_Symptoms_No_Advances_To_Medication_Question', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await answerSymptoms(page);

  await waitForQuestion(page, 6);
  await expectHeading(page, 'Have you taken any medication recently?');
});

// TC_CG_023 - every symptom without a follow-up can be answered "Yes" together
test('TC_CG_023_Verify_All_Plain_Symptoms_Yes_Are_Accepted', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await answerSymptoms(page, { overrides: Object.fromEntries(SYMPTOMS_PLAIN.map((name) => [name, 'Yes'])) });

  await waitForQuestion(page, 6);
});

// TC_CG_024 - Weight change asks about weight gain, weight loss and since when
test('TC_CG_024_Verify_Weight_Change_Yes_Asks_Gain_Loss_And_Duration', async ({ page }) => {
  await openSymptom(page, 'Weight change (kg)');

  await expectOptionButtons(page, WEIGHT_OPTIONS, 'Weight change = Yes should ask about weight gain, weight loss and since when');
});

// TC_CG_025 - a weight gain in kilograms can be entered
test('TC_CG_025_Verify_Weight_Gain_Accepts_A_Number', async ({ page }) => {
  await openSymptom(page, 'Weight change (kg)');

  await chooseOption(page, 'Weight gain');
  await page.waitForTimeout(1000);

  const box = visibleInputs(page).last();
  await expect(box, 'Choosing "Weight gain" should show a box for the number of kilograms').toBeVisible({ timeout: 10000 });

  await box.fill('2');
  await expect(box).toHaveValue('2');
});

// TC_CG_026 - "since when" under Weight change asks a number and a unit
test('TC_CG_026_Verify_Weight_Change_Since_When_Asks_Number_And_Unit', async ({ page }) => {
  await openSymptom(page, 'Weight change (kg)');

  await chooseOption(page, 'since when');
  await page.waitForTimeout(1000);

  const deadline = Date.now() + 10000;
  let count = 0;
  while (Date.now() < deadline) {
    count = await page.locator('select:visible').count();
    if (count >= 2) break;
    await page.waitForTimeout(400);
  }
  if (count < 2) await attachDiagnostics(page, 'Weight change since-when follow-up');
  expect(count, 'Choosing "since when" should ask for a number and a unit').toBeGreaterThanOrEqual(2);
});

// TC_CG_027 - the symptom "Other [describe]" reveals a free-text field
test('TC_CG_027_Verify_Other_Symptom_Yes_Reveals_Text_Field', async ({ page }) => {
  await openSymptom(page, 'Other [describe]');

  const field = await findRevealedTextField(page, 'Associated symptoms -> Other [describe]');
  expect(field, 'Answering the "Other [describe]" symptom = Yes should reveal a free-text field').not.toBeNull();

  await field.fill('Coughing fits at night');
  await expect(field).toHaveValue('Coughing fits at night');
});

// ============================================================
// QUESTION 6/10 - Taken any medication recently? (optional)
// ============================================================

// TC_CG_028 - all three options are offered, and the question can be skipped
test('TC_CG_028_Verify_Medication_Question_Shows_All_Options_And_Skip', async ({ page }) => {
  await setupAndGoTo(page, 6);
  await waitForQuestion(page, 6);

  await expectHeading(page, 'Have you taken any medication recently?');
  for (const label of MEDICATION_OPTIONS) await expectOffered(page, label);
  await expect(page.getByRole('button', { name: 'Skip', exact: true }).first()).toBeVisible({ timeout: 10000 });
});

// TC_CG_029 - "None" advances to the smoking question
test('TC_CG_029_Verify_Medication_None_Advances', async ({ page }) => {
  await setupAndGoTo(page, 6);
  await answerSingleChoice(page, 6, 'None');

  await waitForQuestion(page, 7);
  await expectHeading(page, 'Do you smoke/have ever smoked?');
});

// TC_CG_030 - "Yes [Describe]" reveals a free-text field
test('TC_CG_030_Verify_Medication_Yes_Reveals_Text_Field', async ({ page }) => {
  await setupAndGoTo(page, 6);
  await waitForQuestion(page, 6);

  await chooseOption(page, 'Yes [Describe]');
  await page.waitForTimeout(1000);

  const field = await findRevealedTextField(page, 'Recent medication -> Yes [Describe]');
  expect(field, 'Choosing "Yes [Describe]" should reveal a free-text field').not.toBeNull();

  await field.fill('Cough syrup');
  await expect(field).toHaveValue('Cough syrup');
});

// TC_CG_031 - "Don't know" advances
test('TC_CG_031_Verify_Medication_Dont_Know_Advances', async ({ page }) => {
  await setupAndGoTo(page, 6);
  await answerSingleChoice(page, 6, "Don't know");

  await waitForQuestion(page, 7);
});

// TC_CG_032 - skipping the optional question advances
test('TC_CG_032_Verify_Medication_Question_Can_Be_Skipped', async ({ page }) => {
  await setupAndGoTo(page, 6);
  await waitForQuestion(page, 6);
  await skipQuestion(page, 6);

  await waitForQuestion(page, 7);
});

// ============================================================
// QUESTION 7/10 - Do you smoke/have ever smoked? (required)
// ============================================================

// TC_CG_033 - all three options are offered, and there is no Skip (required)
test('TC_CG_033_Verify_Smoking_Question_Shows_All_Options', async ({ page }) => {
  await setupAndGoTo(page, 7);
  await waitForQuestion(page, 7);

  await expectHeading(page, 'Do you smoke/have ever smoked?');
  for (const label of SMOKING_OPTIONS) await expectOffered(page, label);
  expect.soft(await skipIsOffered(page), 'This question is marked required (*) and should have no Skip').toBeFalsy();
});

// TC_CG_034 - "No" advances to the occupation question
test('TC_CG_034_Verify_Smoking_No_Advances', async ({ page }) => {
  await setupAndGoTo(page, 7);
  await answerSingleChoice(page, 7, 'No');

  await waitForQuestion(page, 8);
  await expectHeading(page, 'What is your occupation?');
});

// TC_CG_035 - "Yes" offers cigarettes per day and since when
test('TC_CG_035_Verify_Smoking_Yes_Offers_Cigarettes_And_Since_When', async ({ page }) => {
  await setupAndGoTo(page, 7);
  await waitForQuestion(page, 7);

  await chooseOption(page, 'Yes');
  await page.waitForTimeout(1200);

  await expectOptionButtons(page, [SMOKING_CIGARETTES, SMOKING_SINCE], 'Smoking = Yes should offer the number of cigarettes per day and since when');
});

// TC_CG_036 - a number of cigarettes per day can be entered
test('TC_CG_036_Verify_Cigarettes_Per_Day_Accepts_A_Number', async ({ page }) => {
  await setupAndGoTo(page, 7);
  await waitForQuestion(page, 7);

  await chooseOption(page, 'Yes');
  await page.waitForTimeout(1000);
  await chooseOption(page, SMOKING_CIGARETTES);
  await page.waitForTimeout(1000);

  const box = visibleInputs(page).last();
  await expect(box, 'Choosing the cigarettes option should show a box for the number').toBeVisible({ timeout: 10000 });

  await box.fill('10');
  await expect(box).toHaveValue('10');
});

// TC_CG_037 - "Enter since when" asks a number and a unit
test('TC_CG_037_Verify_Smoking_Since_When_Asks_Number_And_Unit', async ({ page }) => {
  await setupAndGoTo(page, 7);
  await waitForQuestion(page, 7);

  await chooseOption(page, 'Yes');
  await page.waitForTimeout(1000);
  await chooseOption(page, SMOKING_SINCE);
  await page.waitForTimeout(1000);

  const deadline = Date.now() + 10000;
  let count = 0;
  while (Date.now() < deadline) {
    count = await page.locator('select:visible').count();
    if (count >= 2) break;
    await page.waitForTimeout(400);
  }
  if (count < 2) await attachDiagnostics(page, 'Smoking since-when follow-up');
  expect(count, 'Choosing "Enter since when" should ask for a number and a unit').toBeGreaterThanOrEqual(2);
});

// TC_CG_038 - "Ex-smoker" offers the same two options
test('TC_CG_038_Verify_Ex_Smoker_Offers_Cigarettes_And_Since_When', async ({ page }) => {
  await setupAndGoTo(page, 7);
  await waitForQuestion(page, 7);

  await chooseOption(page, 'Ex-smoker');
  await page.waitForTimeout(1200);

  await expectOptionButtons(page, [SMOKING_CIGARETTES, SMOKING_SINCE], 'Ex-smoker should offer the number of cigarettes per day and since when');
});

// ============================================================
// QUESTION 8/10 - What is your occupation? (required)
// ============================================================

// TC_CG_039 - all three options are offered, and there is no Skip (required)
test('TC_CG_039_Verify_Occupation_Question_Shows_All_Options', async ({ page }) => {
  await setupAndGoTo(page, 8);
  await waitForQuestion(page, 8);

  await expectHeading(page, 'What is your occupation?');
  for (const label of OCCUPATION_OPTIONS) await expectOffered(page, label);
  expect.soft(await skipIsOffered(page), 'This question is marked required (*) and should have no Skip').toBeFalsy();
});

// TC_CG_040 - "Declined to answer" advances to the prior-treatment question
test('TC_CG_040_Verify_Occupation_Declined_To_Answer_Advances', async ({ page }) => {
  await setupAndGoTo(page, 8);
  await answerSingleChoice(page, 8, 'Declined to answer');

  await waitForQuestion(page, 9);
  await expectHeading(page, 'Have you taken any treatment');
});

// TC_CG_041 - "Describe" reveals a free-text field
test('TC_CG_041_Verify_Occupation_Describe_Reveals_Text_Field', async ({ page }) => {
  await setupAndGoTo(page, 8);
  await waitForQuestion(page, 8);

  await chooseOption(page, 'Describe');
  await page.waitForTimeout(1000);

  const field = await findRevealedTextField(page, 'Occupational history -> Describe');
  expect(field, 'Choosing "Describe" should reveal a free-text field').not.toBeNull();

  await field.fill('Farmer');
  await expect(field).toHaveValue('Farmer');
});

// TC_CG_042 - "Exposure to dusts/fumes" asks a Yes/No question
test('TC_CG_042_Verify_Dust_Exposure_Option_Asks_Yes_Or_No', async ({ page }) => {
  await setupAndGoTo(page, 8);
  await waitForQuestion(page, 8);

  await chooseOption(page, 'Exposure to dusts/fumes');
  await page.waitForTimeout(1200);

  await expectAllShown(page, [DUST_HEADING], 'Choosing "Exposure to dusts/fumes" should ask "Any exposure to dusts/fumes?"');
  await expectOffered(page, 'Yes');
  await expectOffered(page, 'No');
});

// TC_CG_043 - the dust exposure question can be answered and the question advances
test('TC_CG_043_Verify_Dust_Exposure_Answered_No_Advances', async ({ page }) => {
  await setupAndGoTo(page, 8);
  await waitForQuestion(page, 8);

  await chooseOption(page, 'Exposure to dusts/fumes');
  await page.waitForTimeout(1000);
  await chooseAnswerUnder(page, DUST_HEADING, 'No');

  await continueToNext(page, 8);
  await waitForQuestion(page, 9);
});

// ============================================================
// QUESTION 9/10 - Prior treatment sought (optional)
// ============================================================

// TC_CG_044 - both options are offered, and the question can be skipped
test('TC_CG_044_Verify_Prior_Treatment_Question_Shows_Both_Options_And_Skip', async ({ page }) => {
  await setupAndGoTo(page, 9);
  await waitForQuestion(page, 9);

  await expectHeading(page, 'Have you taken any treatment');
  for (const label of PRIOR_OPTIONS) await expectOffered(page, label);
  await expect(page.getByRole('button', { name: 'Skip', exact: true }).first()).toBeVisible({ timeout: 10000 });
});

// TC_CG_045 - "No" advances to the last question
test('TC_CG_045_Verify_Prior_Treatment_No_Advances', async ({ page }) => {
  await setupAndGoTo(page, 9);
  await answerSingleChoice(page, 9, 'No');

  await waitForQuestion(page, 10);
  await expect(page.getByPlaceholder('Describe...')).toBeVisible({ timeout: 10000 });
});

// TC_CG_046 - "Yes [Describe]" reveals a free-text field
test('TC_CG_046_Verify_Prior_Treatment_Yes_Reveals_Text_Field', async ({ page }) => {
  await setupAndGoTo(page, 9);
  await waitForQuestion(page, 9);

  await chooseOption(page, 'Yes [Describe]');
  await page.waitForTimeout(1000);

  const field = await findRevealedTextField(page, 'Prior treatment -> Yes [Describe]');
  expect(field, 'Choosing "Yes [Describe]" should reveal a free-text field').not.toBeNull();

  await field.fill('Drank warm water with honey');
  await expect(field).toHaveValue('Drank warm water with honey');
});

// TC_CG_047 - skipping the optional question advances
test('TC_CG_047_Verify_Prior_Treatment_Can_Be_Skipped', async ({ page }) => {
  await setupAndGoTo(page, 9);
  await waitForQuestion(page, 9);
  await skipQuestion(page, 9);

  await waitForQuestion(page, 10);
});

// ============================================================
// QUESTION 10/10 - Additional information, and finishing the assessment
// ============================================================

// TC_CG_048 - text can be entered and submitted
test('TC_CG_048_Verify_Additional_Information_Text_Completes_Assessment', async ({ page }) => {
  await setupAndGoTo(page, 10);
  await answerAdditionalInfo(page, { text: 'The cough is worse after meals' });

  await expect(page.getByText('Physical Examination', { exact: true }).first()).toBeVisible({ timeout: NEXT_QUESTION_TIMEOUT });
});

// TC_CG_049 - skipping completes the assessment
test('TC_CG_049_Verify_Additional_Information_Skip_Completes_Assessment', async ({ page }) => {
  await setupAndGoTo(page, 10);
  await answerAdditionalInfo(page);

  await expect(page.getByText('Physical Examination', { exact: true }).first()).toBeVisible({ timeout: NEXT_QUESTION_TIMEOUT });
});

// TC_CG_050 - the whole 10-question assessment completes via the composed helper
test('TC_CG_050_Verify_Full_Assessment_Completes', async ({ page }) => {
  await setupToCoughAssessment(page);
  await completeCoughAssessment(page);

  await expect(page.getByText('Physical Examination', { exact: true }).first()).toBeVisible({ timeout: NEXT_QUESTION_TIMEOUT });
});

// TC_CG_051 - the Visit reason summary lists the answers that were given
test('TC_CG_051_Verify_Visit_Reason_Summary_Lists_The_Answers', async ({ page }) => {
  await setupAndGoTo(page, 10);
  await answerAdditionalInfo(page, { finish: false });

  await expect(page.getByText('Visit reason summary', { exact: false }).first()).toBeVisible({ timeout: 15000 });

  const modal = page.locator('div').filter({ hasText: 'Visit reason summary' }).filter({ hasText: 'Acute (0-2 weeks)' }).last();
  const text = await modal.innerText().catch(() => '');

  expect.soft(text, 'The summary should show how long the cough has lasted').toContain('Acute (0-2 weeks)');
});

// TC_CG_052 - a hand-washing reminder follows the assessment
test('TC_CG_052_Verify_Wash_Hands_Reminder_After_Assessment', async ({ page }) => {
  await setupAndGoTo(page, 10);
  await answerAdditionalInfo(page, { finish: false });

  await expect(page.getByText('Visit reason summary', { exact: false }).first()).toBeVisible({ timeout: 15000 });
  await robustClick(page.getByRole('button', { name: 'Confirm', exact: true }).first());

  await expect(
    page.getByText('Please wash/sanitize your hands', { exact: false }).first(),
    'A hand-washing reminder should appear after the visit reason summary is confirmed'
  ).toBeVisible({ timeout: 15000 });

  await robustClick(page.getByRole('button', { name: 'Okay', exact: true }).first());
});

// ============================================================
// PHYSICAL EXAMINATION, MEDICAL HISTORY, VISIT SUMMARY, UPLOAD
// ============================================================

// TC_CG_053 - the Physical Examination starts after the assessment
test('TC_CG_053_Verify_Physical_Exam_Starts_After_Assessment', async ({ page }) => {
  await setupToPhysicalExam(page);

  await expect(page.getByText(questionRe(1)).first()).toBeVisible({ timeout: NEXT_QUESTION_TIMEOUT });
});

// TC_CG_054 - the Physical Examination can be completed up to its summary
test('TC_CG_054_Verify_Physical_Exam_Reaches_Summary', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completePhysicalExamGeneric(page);

  await expect(page.getByText('Physical examination summary', { exact: false })).toBeVisible({ timeout: NEXT_QUESTION_TIMEOUT });
});

// TC_CG_055 - confirming the Physical Examination summary leads to Medical History
test('TC_CG_055_Verify_Physical_Exam_Confirm_Navigates_To_Medical_History', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completePhysicalExamGeneric(page);
  await clickPhysicalExamSummaryConfirm(page);

  await expect(page.getByText('Medical History', { exact: true }).first()).toBeVisible({ timeout: NEXT_QUESTION_TIMEOUT });
});

// TC_CG_056 - the Medical History module completes within this protocol
test('TC_CG_056_Verify_Medical_History_Completes_Within_Protocol', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completePhysicalExamGeneric(page);
  await clickPhysicalExamSummaryConfirm(page);
  await completeMedicalHistoryGeneric(page);

  await expect(page.getByText('Medical history summary', { exact: false })).toBeVisible({ timeout: NEXT_QUESTION_TIMEOUT });
});

// TC_CG_057 - confirming the Medical History summary leads to the Visit Summary
test('TC_CG_057_Verify_Medical_History_Confirm_Navigates_To_Visit_Summary', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completePhysicalExamGeneric(page);
  await clickPhysicalExamSummaryConfirm(page);
  await completeMedicalHistoryGeneric(page);
  await clickMedicalHistorySummaryConfirm(page);

  await expect(page.getByText('Visit Summary', { exact: false }).first()).toBeVisible({ timeout: NEXT_QUESTION_TIMEOUT });
});

// TC_CG_058 - the Visit Summary shows the visit reason and the assessment fields
test('TC_CG_058_Verify_Visit_Summary_Checkup_Reason_Section', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completePhysicalExamGeneric(page);
  await clickPhysicalExamSummaryConfirm(page);
  await completeMedicalHistoryGeneric(page);
  await clickMedicalHistorySummaryConfirm(page);
  await waitForVisitSummaryToSettle(page);

  await expect(page.getByText(COUGH_REASON_TEXT_RE).first()).toBeVisible({ timeout: 10000 });

  // Field names come from the questionnaire's question names. They are soft
  // checks: if the app labels a row differently, every mismatch is reported
  // together instead of stopping at the first.
  for (const label of ['Duration', 'Timing', 'Aggravating factors', 'Type of cough', 'Associated symptoms', 'Smoking', 'Prior treatment sought']) {
    await expect.soft(
      page.getByText(label, { exact: false }).first(),
      `The Visit Summary should show a "${label}" field`
    ).toBeVisible({ timeout: 5000 });
  }
});

// TC_CG_059 - end to end: assessment + physical exam + medical history + upload
test('TC_CG_059_Verify_End_To_End_Cough_Protocol', async ({ page }) => {
  await setupToCoughAssessment(page);
  await completeCoughAssessment(page);

  await expectPhysicalExamStarted(page);
  await completePhysicalExamGeneric(page);
  await clickPhysicalExamSummaryConfirm(page);

  await expect(page.getByText('Medical History', { exact: true }).first()).toBeVisible({ timeout: NEXT_QUESTION_TIMEOUT });
  await completeMedicalHistoryGeneric(page);
  await clickMedicalHistorySummaryConfirm(page);

  await expect(page.getByText('Visit Summary', { exact: false }).first()).toBeVisible({ timeout: NEXT_QUESTION_TIMEOUT });
  await completeVisitUpload(page, { doctorSpecialty: 'General Physician' });
});

}); // end test.describe
import { test, expect } from '@playwright/test';

// ============================================================
// GENITAL DISEASE (FEMALE) PROTOCOL - Full Test Suite
//
// Built from the "Genital disease (Female)" questionnaire (id ID-1989235940). It
// has 8 top-level questions:
//
//    1. Describe the problem*                               multi-select, 7 options
//    2. Since when have you had this symptom?*              duration (number + unit)
//    3. Do you have the following symptom(s)?*              Yes/No checklist, 11 rows
//    4. Marital status*                                     4 options ("Married" opens 3 more questions)
//    5. Menstrual history                                   3 options (optional)
//    6. Diagnosed with any of these specific diseases?*     HIV/AIDS / Obesity / Diabetes / None
//    7. Prior treatment sought                              Yes [Describe] / None (optional)
//    8. Additional information                              free text (optional)
//
// Questions 5, 7 and 8 have no asterisk, so they are OPTIONAL (they offer Skip).
// Questions 1, 2, 3, 4 and 6 are REQUIRED.
//
// THIS PROTOCOL IS FOR FEMALE PATIENTS ONLY (the questionnaire carries gender = 0),
// so the app presumably only offers it for a female patient. Every test therefore
// uses a female patient (the shared setup's default elsewhere is male).
//
// FOLLOW-UPS
//   Question 1 (several can be chosen; at least one is required):
//     "Visible vulvar lesion" asks its colour (White, Red, Dark); "Vaginal discharge"
//     asks three REQUIRED questions: odor (Fish odor, Normal, Other abnormal odor,
//     the last with a text box), amount (Increased, Decreased, Normal) and color (five
//     options); "Ulcer on vulva/pubis" offers "Number of ulcers" (a number), "Pain in
//     ulcer" and "Discharge from ulcer" (each Yes/No), several of which can be chosen;
//     "Others [Describe]" opens a text box. "Vulvar pain", "Vulvar pruritus" and
//     "Inguinal swelling" open nothing.
//   Question 3: "Abdominal pain" opens six questions (site, onset, progress,
//     character, timing and radiation; "Other [describe]" under character opens a
//     text box and "Yes" under radiation asks "to the chest/neck" or "to the back");
//     "Change in frequency of urination [describe]", "Color change in urine
//     [describe]" and "Other [describe]" each open a text box. Four row names end
//     with an asterisk in the questionnaire ("Pain during urination*"); the app may
//     or may not show it, so the row finder treats it as optional.
//   Question 4: "Married" opens three REQUIRED questions: past STDs of the patient
//     ("Yes" asks "When", a number and a duration type, and which problem, with a
//     text box under "Others [Describe]"), past STDs of the partner, and condom use
//     ("Yes" asks how often: Always or Sometimes). The other three answers open
//     nothing and advance by themselves.
//   Question 5: "Is menstruating" asks "Age at onset" (a number) and "Last
//     menstruation period" (a date); "Is menopause" asks "Age at menopause" (a number).
//   Question 7: "Yes [Describe]" opens a text box.
//
// WHAT IS CERTAIN AND WHAT IS INFERRED
//   Certain  : question and option wording (including "an sexually transmitted
//              diseases" in the patient STD question, "Others [Describe]" with an s
//              in questions 1 and 4, and "Illiac"), which questions are required,
//              which allow several answers (1, and the ulcer items), which answer
//              opens which follow-up, and that the protocol is female-only.
//   Inferred : the screen layout, from the other protocols. The question is named
//              "Associated symptoms" (lowercase s), which the app drew as a Yes/No
//              checklist in the protocols that spell it that way. Nested follow-ups
//              are handled as either buttons that reveal a box or fields shown at
//              once, because the app does both. Where two questions on one screen
//              share an answer ("Yes", "No", "Normal"), the answer is pressed under
//              ITS OWN question's heading.
//   Physical Examination: the questionnaire lists nine prompts (ulcer, blood glucose,
//              and vulvar area swelling, discharge, ulcer, redness, lymph nodes and
//              the P/S and P/V examinations) but not their questions, so that step is
//              answered by an adaptive handler.
//
// DEFAULT PATH
//   The optional questions 5 and 7 are answered with a real value, not skipped, so
//   that a refused Skip cannot block every later test (this has happened on another
//   protocol). Skip is tested on its own. Every required question is answered with
//   an option that has no follow-up: "Vulvar pain", all symptoms "No", "Unmarried",
//   "None".
//
// Console output is hidden by quiet:true in playwright.config.js, so
// diagnostics go to the test report (see diag() and attachDiagnostics()).
// ============================================================

const GENITAL_REASON_BUTTON_RE = /^Genital disease \(Female\)$/i;
const GENITAL_REASON_TEXT_RE = /^Genital disease \(Female\)$/i;

const YES_NO = ['Yes', 'No'];

// ---- Question 1: describe the problem (several can be chosen) ----
const PROBLEM_OPTIONS = ['Vulvar pain', 'Vulvar pruritus', 'Visible vulvar lesion', 'Vaginal discharge', 'Ulcer on vulva/pubis', 'Inguinal swelling', 'Others [Describe]'];
const PROBLEM_PLAIN = ['Vulvar pain', 'Vulvar pruritus', 'Inguinal swelling'];
const LESION_COLOURS = ['White', 'Red', 'Dark'];
const DISCHARGE_HEADINGS = ['Odor of vaginal discharge', 'Amount of vaginal discharge', 'Color of vaginal discharge'];
const ODOR_OPTIONS = ['Fish odor', 'Normal', 'Other abnormal odor'];
const AMOUNT_OPTIONS = ['Increased', 'Decreased', 'Normal'];
const DISCHARGE_COLOURS = ['Yellow', 'Red/brown', 'Greenish', 'White/cheesy', 'Mucoid/clear'];
const ULCER_ITEMS = ['Number of ulcers', 'Pain in ulcer', 'Discharge from ulcer'];

// ---- Question 3: the 11 associated symptoms, in questionnaire order ----
const SYMPTOMS = [
  'Fever',
  'Abdominal pain',
  'Waking up in the night with the need to urinate*',
  'Burning sensation during urination*',
  'Change in frequency of urination [describe]',
  'Color change in urine [describe]',
  'Pain during urination*',
  'Trouble when starting to urinate or trouble maintaining flow of urine',
  'Postcoital bleeding',
  'Oral ulcer',
  'Other [describe]'
];
// Symptoms that open no question of their own.
const SYMPTOMS_PLAIN = [
  'Fever',
  'Waking up in the night with the need to urinate*',
  'Burning sensation during urination*',
  'Pain during urination*',
  'Trouble when starting to urinate or trouble maintaining flow of urine',
  'Postcoital bleeding',
  'Oral ulcer'
];
const ABDOMEN_HEADINGS = [
  'Which part of the abdomen do you feel pain?',
  'How did the abdominal pain start?',
  'How has the abdominal pain progressed?',
  'Describe the pain',
  'When does the pain increase?',
  'Does the pain go to other part of the body?'
];
const RADIATION_HEADING = 'Does the pain go to other part of the body?';
const ABD_SITE_OPTIONS = [
  'Upper (R) - Right Hypochondrium',
  'Upper (C) - Epigastric',
  'Upper (L) - Left Hypochondrium',
  'Middle (R) - Right Lumbar',
  'Middle (C) - Umbilical',
  'Middle (L) - Left Lumbar',
  'Lower (R) - Right Illiac Fossa',
  'Lower (C) - Hypogastric/Suprapubic',
  'Lower (L) - Left Illiac Fossa',
  'All over'
];
const ABD_ONSET_OPTIONS = ['Rapid', 'Gradual'];
const ABD_PROGRESS_OPTIONS = ['Intermittent', 'Static (Not change)', 'Progressive'];
const ABD_CHARACTER_OPTIONS = ['Constant', 'Colicky / Intermittent (comes & goes)', 'Gnawing/chewing', 'Cramping', 'Dull, aching', 'Stabbing', 'Burning', 'Bloating', 'Other [describe]'];
const ABD_TIMING_OPTIONS = ['Postprandial', 'Preprandial', 'Continous'];
const RADIATION_TARGETS = ['to the chest/neck', 'to the back'];

// ---- Question 4: marital status; "Married" opens three more questions ----
const MARITAL_OPTIONS = ['Married', 'Unmarried', 'Widowed', 'Separated'];
const MARITAL_PLAIN = ['Unmarried', 'Widowed', 'Separated'];
const STD_PATIENT_HEADING = 'Have you ever been diagnosed with an sexually transmitted diseases?';
const STD_PARTNER_HEADING = 'Has your current/former partner ever been diagnosed with a sexually transmitted disease?';
const PROTECTION_HEADING = 'Do you use condoms (protection from STDs)?';
const STD_OPTIONS = ['Yes', 'No', "Don't know or Declined to answer"];
const STD_PROBLEM_OPTIONS = ['Vulvar pain', 'Vulvar pruritus', 'Visible vulvar lesion', 'Vaginal discharge', 'Ulcer', 'Swelling', 'Others [Describe]'];
const PROTECTION_FREQUENCY = ['Always', 'Sometimes'];

// ---- Question 5: menstrual history (optional) ----
const MENSTRUAL_OPTIONS = ['Has not started menstruation', 'Is menstruating', 'Is menopause'];
const MENSTRUATING_ITEMS = ['Age at onset', 'Last menstruation period'];
const MENOPAUSE_BOX = 'Is menopause - Age at menopause';

// ---- Question 6: specific diseases (required) ----
const SPECIFIC_OPTIONS = ['HIV/AIDS', 'Obesity', 'Diabetes', 'None'];

// ---- Question 7: prior treatment (optional) ----
const PRIOR_OPTIONS = ['Yes [Describe]', 'None'];

// Learned from the first question marker ("Question 1/8").
let ASSESSMENT_TOTAL = 8;

// How long to wait for the next question to appear. Normally a few seconds, but
// a recording showed a question still on its loading dots after a full minute
// while the shared server was busy, so this is patient. A wait that takes 15
// seconds or more is noted in the test report. NEXT_QUESTION_SECONDS=20
// shortens it, e.g.  NEXT_QUESTION_SECONDS=20 npx playwright test ...
const NEXT_QUESTION_TIMEOUT = Number(process.env.NEXT_QUESTION_SECONDS ?? 90) * 1000;

// Seconds each test waits before it starts using the shared dev server
// (login, a new patient, a new visit). Keeps the number of logins and
// patient registrations per minute low. PACE_SECONDS=0 turns it off, e.g.
//   PACE_SECONDS=40 npx playwright test tests/Protocol_GenitalDisease.spec.js
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
// entry boxes, the end of the page text, screenshot) and returns the same
// text so it can be put inside an error message too.
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

  // Things that are not buttons: entry boxes and radio / check-box choices, and
  // the end of the page text (where a follow-up that has just opened appears).
  const entries = await page
    .$$eval('main input:not([type="hidden"]), main textarea, main select', (els) =>
      els
        .filter((el) => el.offsetParent !== null)
        .map((el) => `${el.tagName.toLowerCase()}${el.type ? `[${el.type}]` : ''}${el.placeholder ? ` placeholder="${el.placeholder}"` : ''}${el.value ? ` value="${el.value}"` : ''}`)
    )
    .catch(() => []);
  const pageEnd = await page
    .locator('main')
    .first()
    .innerText()
    .then((t) => t.replace(/\s+/g, ' ').trim().slice(-500))
    .catch(() => '');

  const summary = [
    `where      : ${label}`,
    `url        : ${page.url()}`,
    `question   : ${marker || '(no question marker on screen)'}`,
    `buttons    : ${JSON.stringify(buttons.map((b) => b.trim()).filter(Boolean).slice(0, 60))}`,
    `paragraphs : ${JSON.stringify(paragraphs.map((p) => p.trim()).filter(Boolean).slice(0, 30))}`,
    `entries    : ${JSON.stringify(entries.slice(0, 20))}`,
    `page end   : ${pageEnd}`
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
    // Not the Patient Search box in the page header (a recording showed text
    // typed into it), also a number box, and the LAST box, because a follow-up
    // opens below its question.
    page
      .locator('main input[type="text"]:visible:not([placeholder*="earch"]), main input[type="number"]:visible, main textarea:visible')
      .last()
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
// SHARED SETUP: Login -> Patient (FEMALE: the protocol is for women only) -> Vitals ->
// Visit Reason (search + select "Genital disease (Female)") -> Start Assessment ->
// arrives at Question 1/8. birthYear sets the patient's age (default 2000 = 26).
// ============================================================

async function setupToGenitalAssessment(page, { gender = 'Female', birthYear = 2000 } = {}) {

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
        `setupToGenital disease (Female)Assessment — preflight attempt ${attempt}/${PREFLIGHT_ATTEMPTS} failed ` +
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
      `setupToGenital disease (Female)Assessment — backend still unreachable after ${PREFLIGHT_ATTEMPTS} preflight ` +
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

    diag('setupToGenital disease (Female)Assessment — "Add Patients" button never appeared on the dashboard.');
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
      diag(`setupToGenital disease (Female)Assessment — reloading the dashboard (attempt ${attempt}/3) to recover "Add Patients".`);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(8000);
      recoveredAddPatients = await waitVisible(addPatientsButton, 20000);
    }

    if (recoveredAddPatients) {
      diag('setupToGenital disease (Female)Assessment — "Add Patients" recovered after reload retries.');
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
        `setupToGenital disease (Female)Assessment — "Add Patients" button never appeared on the dashboard (URL: ${currentUrl}), ` +
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

  // Every patient sees the same Genital disease (Female) questions, but gender is still
  // set explicitly and verified rather than left to a bare .check(): in the
  // Abdominal Pain suite an unverified click silently left the default gender.
  const genderApplied = await selectGenderRadio(page, gender);

  if (!genderApplied) {
    await page
      .screenshot({ path: `debug-gender-radio-${gender}-${Date.now()}.png`, fullPage: true })
      .catch(() => {});
    diag(
      `setupToGenital disease (Female)Assessment — WARNING: could not confirm the "${gender}" radio was checked. ` +
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
      diag(`setupToGenital disease (Female)Assessment - the calendar route failed at "${failedStep}" (${reason}).`);

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
      'setupToGenital disease (Female)Assessment - could not set a date of birth by typing it or by using the ' +
      'calendar. Falling back to the Age field would not help: the server rejects a patient with no ' +
      'date of birth (HTTP 400). See the calendar markup and the screenshot saved with this run.'
    );
  }
  diag(`setupToGenital disease (Female)Assessment - date of birth set by ${dobRoute}.`);

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
        'setupToGenital disease (Female)Assessment — still on the patient registration form; it was never accepted.'
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
        `setupToGenital disease (Female)Assessment — patient "${patientFullName}" was never created. ` +
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
  // 18. VISIT REASON - search and select "Genital disease (Female)"
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
    await reasonSearchBox.pressSequentially('genital', { delay: 80 }).catch(() => {});
    await page.waitForTimeout(1500);

    let option = page.getByRole('button', { name: GENITAL_REASON_BUTTON_RE }).first();
    let optionVisible = await option.isVisible({ timeout: 5000 }).catch(() => false);

    if (!optionVisible) {
      option = page.locator('div').filter({ hasText: GENITAL_REASON_TEXT_RE }).nth(1);
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

      option = page.getByRole('button', { name: GENITAL_REASON_BUTTON_RE }).first();
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
      `setupToGenital disease (Female)Assessment — "Genital disease (Female)" not offered on attempt ${attempt}/${REASON_ATTEMPTS}; the reasons list may still be loading (buttons currently in main: ${gridButtonCount}).`
    );

    // From the second attempt onward, reload the page. Confirmed
    // from the TC_AP_018 recording: when the reasons request comes
    // back empty, waiting longer never helps - the grid under "All
    // reasons" simply stays empty for the rest of the run. A
    // reload re-issues the request, and the visit is already saved
    // server-side so the app returns to this same step.
    if (attempt >= 2 && attempt < REASON_ATTEMPTS) {
      diag('setupToGenital disease (Female)Assessment — reloading the Visit Reason page to re-request the reasons list.');

      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(5000);

      const backOnReasonPage = await waitVisible(
        page.getByRole('textbox', { name: 'Type or select reason eg.' }),
        20000
      );

      if (!backOnReasonPage) {
        diag('setupToGenital disease (Female)Assessment — the reload did not return to the Visit Reason page.');
        break;
      }

      continue;
    }

    // Give the reasons request more time before trying again.
    await page.waitForTimeout(8000);
  }

  if (!reasonSelected) {
    const mainButtons = await page.locator('main button').allTextContents().catch(() => []);

    diag('setupToGenital disease (Female)Assessment — reasons list never populated.');
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
      `setupToGenital disease (Female)Assessment — the visit-reason list never populated after ${REASON_ATTEMPTS} attempts ` +
      `(including page reloads) spanning several minutes, so "Genital disease (Female)" could not be selected. ` +
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
  // GENITAL DISEASE (FEMALE) ASSESSMENT - Question 1/N ready
  // ============================================================

  await waitForQuestion(page, 1);
  await expect(
    page.getByText('Describe the problem', { exact: false })
  ).toBeVisible({ timeout: 10000 });

  // The total is part of the marker ("Question 1/8"); remember it.
  const firstMarker = await getQuestionMarker(page);
  const totalMatch = firstMarker && firstMarker.match(/Question\s*1\/(\d+)/);
  if (totalMatch) ASSESSMENT_TOTAL = Number(totalMatch[1]);
}

// ============================================================
// ASSESSMENT HELPERS (8 questions)
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

// An answer may be given as a plain label, or as {label, text} when the app
// might show it under a second spelling; either is accepted.
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

// The entry boxes on screen (a text or number box under an answer).
const visibleInputs = (page) =>
  page.locator(
    'main textarea:visible, main input:visible:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]):not([type="button"]):not([type="submit"])'
  );

// ------------------------------------------------------------
// Question 2/8 - "Since when have you had this symptom?*" - a number and a
// unit (Hours/Days/Weeks/Months/Years), then Submit.
// ------------------------------------------------------------
async function selectDuration(page, number, durationType) {
  const all = page.locator('select:visible');
  const deadline = Date.now() + 10000;

  while (Date.now() < deadline && (await all.count().catch(() => 0)) < 2) {
    await page.waitForTimeout(300);
  }

  const total = await all.count().catch(() => 0);
  if (total < 2) {
    const info = await attachDiagnostics(page, 'number and unit boxes did not appear');
    throw new Error(`The number and unit boxes did not appear on this question.\n${info}`);
  }

  const numberSelect = all.nth(total - 2);
  const unitSelect = all.nth(total - 1);

  await numberSelect.selectOption({ label: number }).catch(async () => {
    await numberSelect.selectOption(number).catch(() => {});
  });
  await page.waitForTimeout(300);
  await unitSelect.selectOption({ label: durationType }).catch(() => {});
  await page.waitForTimeout(300);
}

async function answerDuration(page, n, number = '3', durationType = 'Hours', { advance = true } = {}) {
  await waitForQuestion(page, n);
  await selectDuration(page, number, durationType);
  if (advance) {
    await clickSubmit(page);
    await waitForQuestion(page, n + 1);
  }
}

// Single-choice questions advance by themselves once answered: 4 (when the answer
// is not "Married"), 5, 6 and 7. Choices that open a follow-up do not.
async function answerSingleChoice(page, n, option) {
  await waitForQuestion(page, n);
  await chooseOption(page, option);
  await continueToNext(page, n);
}

// Question 1 is a multi-select: several answers can be chosen, so it ends with Submit.
async function answerMulti(page, n, options, { advance = true } = {}) {
  await waitForQuestion(page, n);

  if (options === null) {
    await skipQuestion(page, n);
    return;
  }

  for (const option of options) await chooseOption(page, option);
  if (advance) await continueToNext(page, n);
}

// The box under a labelled field (each such label is a heading with its own box
// beneath it). The Patient Search box in the page header comes BEFORE the label, so
// it is never the one found.
function describeFieldFor(page, labelText) {
  return page
    .getByText(labelText, { exact: false })
    .first()
    .locator('xpath=following::*[self::textarea or self::input][1]');
}

// A follow-up item can be a button that reveals a box, or a field shown at once
// (the app does both). If the label is a button it is pressed; either way the box
// under the label is returned, or else the last entry box on screen.
async function fieldAfter(page, label) {
  if (await optionOffered(page, label, 2500)) {
    await chooseOption(page, label);
    await page.waitForTimeout(1000);
  }

  const labelled = describeFieldFor(page, label);
  if (await waitVisible(labelled, 4000)) return labelled;

  const last = visibleInputs(page).last();
  return (await waitVisible(last, 3000)) ? last : null;
}

// The box that has appeared after an option was ALREADY pressed: the box under
// the label, or else the last entry box on screen. (fieldAfter presses the label
// first when it is a button; pressing an option a second time could un-choose it.)
async function boxAfterPress(page, label) {
  const labelled = describeFieldFor(page, label);
  if (await waitVisible(labelled, 4000)) return labelled;

  const last = visibleInputs(page).last();
  return (await waitVisible(last, 3000)) ? last : null;
}

// A follow-up that asks "when" is a number and a duration type (two dropdowns). If
// the label is a button it is pressed first. A number and a unit are chosen and
// checked to have stayed selected.
async function answerDurationFollowUp(page, buttonLabel = null) {
  if (buttonLabel && (await optionOffered(page, buttonLabel, 2500))) {
    await chooseOption(page, buttonLabel);
    await page.waitForTimeout(1000);
  }

  const selects = page.locator('select:visible');
  const deadline = Date.now() + 10000;
  let total = 0;
  while (Date.now() < deadline) {
    total = await selects.count();
    if (total >= 2) break;
    await page.waitForTimeout(400);
  }
  if (total < 2) {
    const info = await attachDiagnostics(page, 'a follow-up that should ask a number and a duration type');
    throw new Error(`The follow-up should offer a number and a duration type (two dropdowns), but ${total} were found.\n${info}`);
  }

  await selectDuration(page, '2', 'Weeks');

  const chosenNumber = await selects.nth(total - 2).evaluate((el) => el.options[el.selectedIndex].text.trim());
  const chosenUnit = await selects.nth(total - 1).evaluate((el) => el.options[el.selectedIndex].text.trim());
  expect(chosenNumber, 'The number chosen should stay selected').toBe('2');
  expect(chosenUnit, 'The duration type chosen should stay selected').toBe('Weeks');
}

// Presses a Yes/No (or any) answer under ITS OWN question's heading. Needed where
// two questions on one screen share an answer ("Yes", "No", "Normal").
async function chooseAnswerUnder(page, headingText, answer) {
  const heading = page.getByText(headingText, { exact: false }).first();
  await expect(heading, `The question "${headingText}" should be on screen`).toBeVisible({ timeout: 10000 });

  const button = heading.locator(`xpath=following::button[normalize-space(.)="${answer}"][1]`);
  await expect(button, `A "${answer}" button should sit under "${headingText}"`).toBeVisible({ timeout: 10000 });

  await scrollIntoViewWithClearance(page, button, 250);
  await robustClick(button);
  await page.waitForTimeout(400);
}

// Presses the label if it is offered as a button; does nothing if the app already
// shows it as a field.
async function pressIfOffered(page, label) {
  if (await optionOffered(page, label, 2500)) {
    await chooseOption(page, label);
    await page.waitForTimeout(1000);
  }
}

function symptomRow(page, name) {
  // Four row names end with an asterisk in the questionnaire ("Pain during
  // urination*"). The app may or may not show it, so it is optional in the match.
  const bare = name.replace(/\*$/, '');
  const labelRe = new RegExp(`^\\s*(?:\\d+\\.\\s*)?${escapeRegExp(bare)}\\*?\\s*$`, 'i');
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
// Question 3/8 - "Do you have the following symptom(s)?*" - a Yes/No checklist
// (11 rows), then Submit. Rows are numbered ("2. Abdominal pain"), so rows are
// found by name with the number ignored. REQUIRED.
// ------------------------------------------------------------
async function answerSymptoms(
  page,
  { defaultAnswer = 'No', overrides = {}, subAnswers = {}, submit = true } = {}
) {
  await waitForQuestion(page, 3);

  for (const name of SYMPTOMS) {
    await answerSymptomRow(page, name, overrides[name] || defaultAnswer);

    // A "Yes" can open a follow-up that must be answered before Submit.
    for (const option of subAnswers[name] || []) {
      await chooseOption(page, option);
    }
  }

  if (!submit) return;
  await clickSubmit(page);
  await waitForQuestion(page, 4);
}

// Stand on question 1 with one problem chosen, leaving its follow-up open.
async function openProblem(page, option) {
  await setupAndGoTo(page, 1);
  await waitForQuestion(page, 1);
  await chooseOption(page, option);
  await page.waitForTimeout(1200);
}

// Stand on question 3 and answer one symptom "Yes", leaving its follow-up open.
async function openSymptom(page, name) {
  await setupAndGoTo(page, 3);
  await waitForQuestion(page, 3);
  await answerSymptomRow(page, name, 'Yes');
  await page.waitForTimeout(1200);
}

// Stand on question 4 with "Married" chosen, leaving its three questions open.
async function openMarried(page) {
  await setupAndGoTo(page, 4);
  await waitForQuestion(page, 4);
  await chooseOption(page, 'Married');
  await page.waitForTimeout(1200);
}

async function completeGenitalAssessment(page, overrides = {}) {
  const {
    problem = ['Vulvar pain'],
    number = '3',
    durationType = 'Hours',
    symptomDefault = 'No',
    symptomOverrides = {},
    symptomSubAnswers = {},
    marital = 'Unmarried',
    menstrual = 'Has not started menstruation',
    specific = 'None',
    prior = 'None',
    additionalInfo = {}
  } = overrides;

  await answerMulti(page, 1, problem);
  await answerDuration(page, 2, number, durationType);
  await answerSymptoms(page, {
    defaultAnswer: symptomDefault,
    overrides: symptomOverrides,
    subAnswers: symptomSubAnswers
  });
  await answerSingleChoice(page, 4, marital);
  await answerSingleChoice(page, 5, menstrual);
  await answerSingleChoice(page, 6, specific);
  await answerSingleChoice(page, 7, prior);
  await answerAdditionalInfo(page, additionalInfo);
}

// Setup (as a FEMALE patient: the protocol is for women only), then answer every
// question before `n` with defaults so the flow stands on question `n`. The
// optional questions 5 and 7 are answered, not skipped.
async function setupAndGoTo(page, n, { gender = 'Female' } = {}) {
  await setupToGenitalAssessment(page, { gender });
  if (n > 1) await answerMulti(page, 1, ['Vulvar pain']);
  if (n > 2) await answerDuration(page, 2);
  if (n > 3) await answerSymptoms(page);
  if (n > 4) await answerSingleChoice(page, 4, 'Unmarried');
  if (n > 5) await answerSingleChoice(page, 5, 'Has not started menstruation');
  if (n > 6) await answerSingleChoice(page, 6, 'None');
  if (n > 7) await answerSingleChoice(page, 7, 'None');
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
// The questionnaire lists nine exam prompts (ulcer, blood glucose, and vulvar
// area swelling, discharge, ulcer, redness, lymph nodes, P/S and P/V
// examinations) but not their questions, so each question is answered by what is
// on screen:
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
  await setupToGenitalAssessment(page, { gender: overrides.gender || 'Female' });
  await completeGenitalAssessment(page, overrides);
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
      // A required question's heading ends with "*" ("Describe the pain*"), so a
      // short label is also tried with the asterisk (a whole-text match would
      // otherwise miss it).
      if (exact && (await page.getByText(`${label}*`, { exact: true }).first().isVisible({ timeout: 200 }).catch(() => false))) return true;
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

test.describe('Genital Disease (Female) Protocol - Full Test Suite', () => {

test.describe.configure({ timeout: 900000 });

// ============================================================
// QUESTION 1/8 - Describe the problem (multi-select, required)
// ============================================================

// TC_GD_001 - the visit reason can be selected (for a female patient) and starts the assessment
test('TC_GD_001_Verify_Visit_Reason_Selection_Starts_Assessment', async ({ page }) => {
  await setupToGenitalAssessment(page);

  await expect(page.getByText(/^Question\s*1\/8$/).first(), 'The assessment should have 8 questions').toBeVisible({ timeout: 15000 });
  await expectHeading(page, 'Describe the problem');
});

// TC_GD_002 - all seven options are offered, and there is no Skip (required)
test('TC_GD_002_Verify_Problem_Question_Shows_All_Options_And_Is_Required', async ({ page }) => {
  await setupAndGoTo(page, 1);
  await waitForQuestion(page, 1);

  await expectHeading(page, 'Describe the problem');
  await expectOptionButtons(page, PROBLEM_OPTIONS, 'The question should offer all seven problems');
  expect.soft(await skipIsOffered(page), 'This question is marked required (*) and should have no Skip').toBeFalsy();
});

// TC_GD_003 - TC_GD_005 - each problem without a follow-up plus Submit advances to the duration
PROBLEM_PLAIN.forEach((label, i) => {
  test(`TC_GD_${pad(3 + i)}_Verify_Problem_${slug(label)}_Advances`, async ({ page }) => {
    await setupAndGoTo(page, 1);
    await answerMulti(page, 1, [label]);

    await waitForQuestion(page, 2);
    await expectHeading(page, 'Since when have you had this symptom?');
  });
});

// TC_GD_006 - several problems can be chosen together (multi-select)
test('TC_GD_006_Verify_Several_Problems_Can_Be_Chosen_Together', async ({ page }) => {
  await setupAndGoTo(page, 1);
  await answerMulti(page, 1, ['Vulvar pain', 'Vulvar pruritus']);

  await waitForQuestion(page, 2);
});

// TC_GD_007 - "Visible vulvar lesion" asks its colour
test('TC_GD_007_Verify_Visible_Vulvar_Lesion_Asks_Colour', async ({ page }) => {
  await openProblem(page, 'Visible vulvar lesion');

  await expectOptionButtons(page, LESION_COLOURS, 'A visible vulvar lesion should ask its colour: White, Red or Dark');
});

// TC_GD_008 - "Vaginal discharge" asks odor, amount and color
test('TC_GD_008_Verify_Vaginal_Discharge_Asks_Odor_Amount_And_Color', async ({ page }) => {
  await openProblem(page, 'Vaginal discharge');

  await expectAllShown(page, DISCHARGE_HEADINGS, 'Vaginal discharge should ask the odor, the amount and the color');
});

// TC_GD_009 - the odor options
test('TC_GD_009_Verify_Discharge_Odor_Offers_Three_Options', async ({ page }) => {
  await openProblem(page, 'Vaginal discharge');

  await expectOptionButtons(page, ODOR_OPTIONS, 'The odor question should offer Fish odor, Normal and Other abnormal odor');
});

// TC_GD_010 - "Other abnormal odor" reveals a free-text field
test('TC_GD_010_Verify_Discharge_Other_Abnormal_Odor_Reveals_Text_Field', async ({ page }) => {
  await openProblem(page, 'Vaginal discharge');

  await chooseOption(page, 'Other abnormal odor');
  await page.waitForTimeout(1200);

  const box = await boxAfterPress(page, 'Other abnormal odor');
  expect(box, 'Choosing "Other abnormal odor" should reveal a free-text field').not.toBeNull();

  await box.fill('Sweet smell');
  await expect(box).toHaveValue('Sweet smell');
});

// TC_GD_011 - the amount options
test('TC_GD_011_Verify_Discharge_Amount_Offers_Three_Options', async ({ page }) => {
  await openProblem(page, 'Vaginal discharge');

  await expectOptionButtons(page, AMOUNT_OPTIONS, 'The amount question should offer Increased, Decreased and Normal');
});

// TC_GD_012 - the color options
test('TC_GD_012_Verify_Discharge_Color_Offers_Five_Options', async ({ page }) => {
  await openProblem(page, 'Vaginal discharge');

  await expectOptionButtons(page, DISCHARGE_COLOURS, 'The color question should offer five colors');
});

// TC_GD_013 - an answered discharge (odor, amount and color) plus Submit advances
test('TC_GD_013_Verify_Vaginal_Discharge_Answered_Advances', async ({ page }) => {
  await openProblem(page, 'Vaginal discharge');

  await chooseOption(page, 'Fish odor');
  await chooseOption(page, 'Increased');
  await chooseOption(page, 'Yellow');
  await clickSubmit(page);

  await waitForQuestion(page, 2);
});

// TC_GD_014 - "Ulcer on vulva/pubis" offers number of ulcers, pain and discharge
test('TC_GD_014_Verify_Vulvar_Ulcer_Offers_Number_Pain_And_Discharge', async ({ page }) => {
  await openProblem(page, 'Ulcer on vulva/pubis');

  await expectAllShown(page, ULCER_ITEMS, 'An ulcer on the vulva/pubis should offer "Number of ulcers", "Pain in ulcer" and "Discharge from ulcer"');
});

// TC_GD_015 - "Number of ulcers" accepts a number
test('TC_GD_015_Verify_Number_Of_Ulcers_Accepts_A_Number', async ({ page }) => {
  await openProblem(page, 'Ulcer on vulva/pubis');

  const box = await fieldAfter(page, 'Number of ulcers');
  expect(box, 'There should be a box for the number of ulcers').not.toBeNull();

  await box.fill('2');
  await expect(box).toHaveValue('2');
});

// TC_GD_016 - "Pain in ulcer" asks Yes or No
test('TC_GD_016_Verify_Pain_In_Ulcer_Asks_Yes_Or_No', async ({ page }) => {
  await openProblem(page, 'Ulcer on vulva/pubis');

  await pressIfOffered(page, 'Pain in ulcer');
  await expectOptionButtons(page, YES_NO, 'Pain in ulcer should ask Yes or No');
});

// TC_GD_017 - "Discharge from ulcer" asks Yes or No
test('TC_GD_017_Verify_Discharge_From_Ulcer_Asks_Yes_Or_No', async ({ page }) => {
  await openProblem(page, 'Ulcer on vulva/pubis');

  await pressIfOffered(page, 'Discharge from ulcer');
  await expectOptionButtons(page, YES_NO, 'Discharge from ulcer should ask Yes or No');
});

// TC_GD_018 - "Others [Describe]" reveals a free-text field
test('TC_GD_018_Verify_Problem_Others_Reveals_Text_Field', async ({ page }) => {
  await setupAndGoTo(page, 1);
  await waitForQuestion(page, 1);

  const field = await fieldAfter(page, 'Others [Describe]');
  expect(field, 'Choosing "Others [Describe]" should reveal a free-text field').not.toBeNull();

  await field.fill('Burning after washing');
  await expect(field).toHaveValue('Burning after washing');
});

// TC_GD_019 - a lesion with its colour chosen plus Submit advances
test('TC_GD_019_Verify_Visible_Vulvar_Lesion_With_Colour_Advances', async ({ page }) => {
  await openProblem(page, 'Visible vulvar lesion');

  await chooseOption(page, 'Red');
  await clickSubmit(page);

  await waitForQuestion(page, 2);
});

// ============================================================
// QUESTION 2/8 - Since when have you had this symptom? (duration)
// ============================================================

// TC_GD_020 - a number and a unit are accepted and the question advances
test('TC_GD_020_Verify_Duration_Accepts_Number_And_Unit', async ({ page }) => {
  await setupAndGoTo(page, 2);
  await waitForQuestion(page, 2);

  expect(await page.locator('select:visible').count(), 'The duration question should offer a number and a unit').toBeGreaterThanOrEqual(2);

  await answerDuration(page, 2, '3', 'Hours');

  await waitForQuestion(page, 3);
  await expectHeading(page, 'Do you have the following symptom(s)?');
  await expect.soft(
    page.locator('div').filter({ hasText: 'Since when have you had this symptom?' }).filter({ hasText: '3 hours' }).first(),
    'The answered duration should read "3 hours"'
  ).toBeVisible({ timeout: 10000 });
});

// ============================================================
// QUESTION 3/8 - Associated symptoms (Yes/No checklist, 11 rows, required)
// ============================================================

// TC_GD_021 - all eleven symptoms are listed
test('TC_GD_021_Verify_Associated_Symptoms_Lists_All_11_Rows', async ({ page }) => {
  await setupAndGoTo(page, 3);
  await waitForQuestion(page, 3);

  for (const name of SYMPTOMS) {
    await expect(symptomRow(page, name), `Symptom "${name}" should be listed`).toBeVisible({ timeout: 10000 });
  }
});

// TC_GD_022 - every symptom "No" plus Submit advances
test('TC_GD_022_Verify_All_Symptoms_No_Advances_To_Marital_Status', async ({ page }) => {
  await setupAndGoTo(page, 3);
  await answerSymptoms(page);

  await waitForQuestion(page, 4);
  await expectHeading(page, 'Marital status');
});

// TC_GD_023 - every symptom without a follow-up can be answered "Yes" together
test('TC_GD_023_Verify_All_Plain_Symptoms_Yes_Are_Accepted', async ({ page }) => {
  await setupAndGoTo(page, 3);
  await answerSymptoms(page, { overrides: Object.fromEntries(SYMPTOMS_PLAIN.map((name) => [name, 'Yes'])) });

  await waitForQuestion(page, 4);
});

// TC_GD_024 - Abdominal pain opens six questions
test('TC_GD_024_Verify_Abdominal_Pain_Yes_Asks_Six_FollowUp_Questions', async ({ page }) => {
  await openSymptom(page, 'Abdominal pain');

  await expectAllShown(page, ABDOMEN_HEADINGS, 'Abdominal pain = Yes should open the site, onset, progress, character, timing and radiation questions');
});

// TC_GD_025 - the abdominal pain site options
test('TC_GD_025_Verify_Abdominal_Pain_Site_Offers_Ten_Options', async ({ page }) => {
  await openSymptom(page, 'Abdominal pain');

  await expectOptionButtons(page, ABD_SITE_OPTIONS, 'The site question should offer the nine regions and "All over"');
});

// TC_GD_026 - the abdominal pain onset options
test('TC_GD_026_Verify_Abdominal_Pain_Onset_Offers_Rapid_And_Gradual', async ({ page }) => {
  await openSymptom(page, 'Abdominal pain');

  await expectOptionButtons(page, ABD_ONSET_OPTIONS, 'The onset question should offer Rapid and Gradual');
});

// TC_GD_027 - the abdominal pain progress options
test('TC_GD_027_Verify_Abdominal_Pain_Progress_Offers_Three_Options', async ({ page }) => {
  await openSymptom(page, 'Abdominal pain');

  await expectOptionButtons(page, ABD_PROGRESS_OPTIONS, 'The progress question should offer Intermittent, Static and Progressive');
});

// TC_GD_028 - the abdominal pain character options
test('TC_GD_028_Verify_Abdominal_Pain_Character_Offers_Nine_Options', async ({ page }) => {
  await openSymptom(page, 'Abdominal pain');

  await expectOptionButtons(page, ABD_CHARACTER_OPTIONS, 'The character question should offer nine options');
});

// TC_GD_029 - the pain character "Other [describe]" reveals a free-text field
test('TC_GD_029_Verify_Abdominal_Pain_Character_Other_Reveals_Text_Field', async ({ page }) => {
  await openSymptom(page, 'Abdominal pain');

  const field = await fieldAfter(page, 'Other [describe]');
  expect(field, 'Choosing "Other [describe]" under the character of the pain should reveal a free-text field').not.toBeNull();

  await field.fill('Sharp when moving');
  await expect(field).toHaveValue('Sharp when moving');
});

// TC_GD_030 - the abdominal pain timing options
test('TC_GD_030_Verify_Abdominal_Pain_Timing_Offers_Three_Options', async ({ page }) => {
  await openSymptom(page, 'Abdominal pain');

  await expectOptionButtons(page, ABD_TIMING_OPTIONS, 'The timing question should offer Postprandial, Preprandial and Continous');
});

// TC_GD_031 - radiation = Yes asks where the pain goes
test('TC_GD_031_Verify_Abdominal_Pain_Radiation_Yes_Asks_Where', async ({ page }) => {
  await openSymptom(page, 'Abdominal pain');

  await chooseAnswerUnder(page, RADIATION_HEADING, 'Yes');
  await page.waitForTimeout(1200);

  await expectOptionButtons(page, RADIATION_TARGETS, 'Radiation = Yes should offer "to the chest/neck" and "to the back"');
});

// TC_GD_032 - "Change in frequency of urination [describe]" reveals a free-text field
test('TC_GD_032_Verify_Change_In_Frequency_Of_Urination_Reveals_Text_Field', async ({ page }) => {
  await openSymptom(page, 'Change in frequency of urination [describe]');

  const box = await boxAfterPress(page, 'Change in frequency of urination [describe]');
  expect(box, 'Answering "Change in frequency of urination [describe]" = Yes should reveal a free-text field').not.toBeNull();

  await box.fill('Every hour');
  await expect(box).toHaveValue('Every hour');
});

// TC_GD_033 - "Color change in urine [describe]" reveals a free-text field
test('TC_GD_033_Verify_Color_Change_In_Urine_Reveals_Text_Field', async ({ page }) => {
  await openSymptom(page, 'Color change in urine [describe]');

  const box = await boxAfterPress(page, 'Color change in urine [describe]');
  expect(box, 'Answering "Color change in urine [describe]" = Yes should reveal a free-text field').not.toBeNull();

  await box.fill('Dark yellow');
  await expect(box).toHaveValue('Dark yellow');
});

// TC_GD_034 - the symptom "Other [describe]" reveals a free-text field
test('TC_GD_034_Verify_Other_Symptom_Yes_Reveals_Text_Field', async ({ page }) => {
  await openSymptom(page, 'Other [describe]');

  const field = await findRevealedTextField(page, 'Associated symptoms -> Other [describe]');
  expect(field, 'Answering the "Other [describe]" symptom = Yes should reveal a free-text field').not.toBeNull();

  await field.fill('Lower back ache');
  await expect(field).toHaveValue('Lower back ache');
});

// ============================================================
// QUESTION 4/8 - Marital status (required; "Married" opens three more questions)
// ============================================================

// TC_GD_035 - all four options are offered, and there is no Skip (required)
test('TC_GD_035_Verify_Marital_Status_Question_Shows_All_Options_And_Is_Required', async ({ page }) => {
  await setupAndGoTo(page, 4);
  await waitForQuestion(page, 4);

  await expectHeading(page, 'Marital status');
  await expectOptionButtons(page, MARITAL_OPTIONS, 'The question should offer Married, Unmarried, Widowed and Separated');
  expect.soft(await skipIsOffered(page), 'This question is marked required (*) and should have no Skip').toBeFalsy();
});

// TC_GD_036 - TC_GD_038 - each status without a follow-up advances to the menstrual history
MARITAL_PLAIN.forEach((label, i) => {
  test(`TC_GD_${pad(36 + i)}_Verify_Marital_Status_${slug(label)}_Advances`, async ({ page }) => {
    await setupAndGoTo(page, 4);
    await answerSingleChoice(page, 4, label);

    await waitForQuestion(page, 5);
    await expectHeading(page, 'Menstrual history');
  });
});

// TC_GD_039 - "Married" asks about the patient's STDs, the partner's STDs and condom use
test('TC_GD_039_Verify_Married_Asks_About_STDs_And_Condom_Use', async ({ page }) => {
  await openMarried(page);

  await expectAllShown(
    page,
    [STD_PATIENT_HEADING, STD_PARTNER_HEADING, PROTECTION_HEADING],
    'Married should ask about past STDs of the patient, past STDs of the partner, and condom use'
  );
});

// TC_GD_040 - the STD question offers Yes, No and "Don't know or Declined to answer"
test('TC_GD_040_Verify_Patient_STD_Question_Offers_Three_Answers', async ({ page }) => {
  await openMarried(page);

  await expectOptionButtons(page, STD_OPTIONS, 'The STD question should offer Yes, No and "Don\'t know or Declined to answer"');
});

// TC_GD_041 - a past STD asks which problem
test('TC_GD_041_Verify_Patient_STD_Yes_Asks_Which_Problem', async ({ page }) => {
  await openMarried(page);

  await chooseAnswerUnder(page, STD_PATIENT_HEADING, 'Yes');
  await page.waitForTimeout(1200);

  await expectOptionButtons(page, STD_PROBLEM_OPTIONS, 'A past STD should ask which problem it was');
});

// TC_GD_042 - "When" (past STD) takes a number and a duration type
test('TC_GD_042_Verify_Patient_STD_When_Accepts_Number_And_Unit', async ({ page }) => {
  await openMarried(page);

  await chooseAnswerUnder(page, STD_PATIENT_HEADING, 'Yes');
  await page.waitForTimeout(1200);

  await answerDurationFollowUp(page);
});

// TC_GD_043 - the STD problem "Others [Describe]" reveals a free-text field
test('TC_GD_043_Verify_Patient_STD_Others_Reveals_Text_Field', async ({ page }) => {
  await openMarried(page);

  await chooseAnswerUnder(page, STD_PATIENT_HEADING, 'Yes');
  await page.waitForTimeout(1200);

  const field = await fieldAfter(page, 'Others [Describe]');
  expect(field, 'Choosing "Others [Describe]" should reveal a free-text field').not.toBeNull();

  await field.fill('Genital warts');
  await expect(field).toHaveValue('Genital warts');
});

// TC_GD_044 - condom use = Yes asks how often
test('TC_GD_044_Verify_Condom_Use_Yes_Asks_How_Often', async ({ page }) => {
  await openMarried(page);

  await chooseAnswerUnder(page, PROTECTION_HEADING, 'Yes');
  await page.waitForTimeout(1200);

  await expectOptionButtons(page, PROTECTION_FREQUENCY, 'Condom use = Yes should offer Always and Sometimes');
});

// TC_GD_045 - answering the three questions of "Married" plus Submit advances
test('TC_GD_045_Verify_Married_With_All_Questions_Answered_Advances', async ({ page }) => {
  await openMarried(page);

  await chooseAnswerUnder(page, STD_PATIENT_HEADING, 'No');
  await chooseAnswerUnder(page, STD_PARTNER_HEADING, 'No');
  await chooseAnswerUnder(page, PROTECTION_HEADING, 'No');
  await continueToNext(page, 4);

  await expectHeading(page, 'Menstrual history');
});

// ============================================================
// QUESTION 5/8 - Menstrual history (optional)
// ============================================================

// TC_GD_046 - all three options are offered, and the question can be skipped
test('TC_GD_046_Verify_Menstrual_History_Question_Shows_All_Options_And_Skip', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await waitForQuestion(page, 5);

  await expectHeading(page, 'Menstrual history');
  await expectOptionButtons(page, MENSTRUAL_OPTIONS, 'The question should offer the three menstrual states');
  await expect(page.getByRole('button', { name: 'Skip', exact: true }).first()).toBeVisible({ timeout: 10000 });
});

// TC_GD_047 - "Has not started menstruation" advances to the specific diseases
test('TC_GD_047_Verify_Menstrual_History_Not_Started_Advances', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await answerSingleChoice(page, 5, 'Has not started menstruation');

  await waitForQuestion(page, 6);
  await expectHeading(page, 'Have you ever been diagnosed with any of the following specific diseases?');
});

// TC_GD_048 - "Is menstruating" asks the age at onset and the last period
test('TC_GD_048_Verify_Menstruating_Asks_Age_At_Onset_And_Last_Period', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await waitForQuestion(page, 5);

  await chooseOption(page, 'Is menstruating');
  await page.waitForTimeout(1200);

  await expectAllShown(page, MENSTRUATING_ITEMS, 'Is menstruating should ask "Age at onset" and "Last menstruation period"');
});

// TC_GD_049 - "Age at onset" accepts a number
test('TC_GD_049_Verify_Age_At_Onset_Accepts_A_Number', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await waitForQuestion(page, 5);

  await chooseOption(page, 'Is menstruating');
  await page.waitForTimeout(1200);

  const box = await fieldAfter(page, 'Age at onset');
  expect(box, 'There should be a box for the age at onset').not.toBeNull();

  await box.fill('13');
  await expect(box).toHaveValue('13');
});

// TC_GD_050 - "Last menstruation period" has a box for a date
test('TC_GD_050_Verify_Last_Menstruation_Period_Asks_For_A_Date', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await waitForQuestion(page, 5);

  await chooseOption(page, 'Is menstruating');
  await page.waitForTimeout(1200);

  const box = await fieldAfter(page, 'Last menstruation period');
  expect(box, 'There should be a box for the date of the last menstruation period').not.toBeNull();
  await expect(box).toBeVisible({ timeout: 10000 });
});

// TC_GD_051 - "Is menopause" asks the age at menopause
test('TC_GD_051_Verify_Menopause_Asks_Age_At_Menopause', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await waitForQuestion(page, 5);

  await chooseOption(page, 'Is menopause');
  await page.waitForTimeout(1200);

  const box = await boxAfterPress(page, MENOPAUSE_BOX);
  expect(box, 'Is menopause should show a box for the age at menopause').not.toBeNull();

  await box.fill('50');
  await expect(box).toHaveValue('50');
});

// TC_GD_052 - skipping the optional question advances
test('TC_GD_052_Verify_Menstrual_History_Question_Can_Be_Skipped', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await waitForQuestion(page, 5);
  await skipQuestion(page, 5);

  await waitForQuestion(page, 6);
});

// ============================================================
// QUESTION 6/8 - Specific diseases (required)
// ============================================================

// TC_GD_053 - all four options are offered, and there is no Skip (required)
test('TC_GD_053_Verify_Specific_Diseases_Question_Shows_All_Options_And_Is_Required', async ({ page }) => {
  await setupAndGoTo(page, 6);
  await waitForQuestion(page, 6);

  await expectHeading(page, 'Have you ever been diagnosed with any of the following specific diseases?');
  await expectOptionButtons(page, SPECIFIC_OPTIONS, 'The question should offer HIV/AIDS, Obesity, Diabetes and None');
  expect.soft(await skipIsOffered(page), 'This question is marked required (*) and should have no Skip').toBeFalsy();
});

// TC_GD_054 - TC_GD_057 - each answer advances to the prior-treatment question
SPECIFIC_OPTIONS.forEach((label, i) => {
  test(`TC_GD_${pad(54 + i)}_Verify_Specific_Diseases_${slug(label)}_Advances`, async ({ page }) => {
    await setupAndGoTo(page, 6);
    await answerSingleChoice(page, 6, label);

    await waitForQuestion(page, 7);
    await expectHeading(page, 'Have you taken any treatment');
  });
});

// ============================================================
// QUESTION 7/8 - Prior treatment sought (optional)
// ============================================================

// TC_GD_058 - both options are offered, and the question can be skipped
test('TC_GD_058_Verify_Prior_Treatment_Question_Shows_Both_Options_And_Skip', async ({ page }) => {
  await setupAndGoTo(page, 7);
  await waitForQuestion(page, 7);

  await expectHeading(page, 'Have you taken any treatment');
  for (const label of PRIOR_OPTIONS) await expectOffered(page, label);
  await expect(page.getByRole('button', { name: 'Skip', exact: true }).first()).toBeVisible({ timeout: 10000 });
});

// TC_GD_059 - "None" advances to the last question
test('TC_GD_059_Verify_Prior_Treatment_None_Advances', async ({ page }) => {
  await setupAndGoTo(page, 7);
  await answerSingleChoice(page, 7, 'None');

  await waitForQuestion(page, 8);
  await expect(page.getByPlaceholder('Describe...')).toBeVisible({ timeout: 10000 });
});

// TC_GD_060 - "Yes [Describe]" reveals a free-text field
test('TC_GD_060_Verify_Prior_Treatment_Yes_Reveals_Text_Field', async ({ page }) => {
  await setupAndGoTo(page, 7);
  await waitForQuestion(page, 7);

  await chooseOption(page, 'Yes [Describe]');
  await page.waitForTimeout(1000);

  const field = await findRevealedTextField(page, 'Prior treatment -> Yes [Describe]');
  expect(field, 'Choosing "Yes [Describe]" should reveal a free-text field').not.toBeNull();

  await field.fill('Used an antifungal cream');
  await expect(field).toHaveValue('Used an antifungal cream');
});

// TC_GD_061 - skipping the optional question advances
test('TC_GD_061_Verify_Prior_Treatment_Can_Be_Skipped', async ({ page }) => {
  await setupAndGoTo(page, 7);
  await waitForQuestion(page, 7);
  await skipQuestion(page, 7);

  await waitForQuestion(page, 8);
});

// ============================================================
// QUESTION 8/8 - Additional information, and finishing the assessment
// ============================================================

// TC_GD_062 - text can be entered and submitted
test('TC_GD_062_Verify_Additional_Information_Text_Completes_Assessment', async ({ page }) => {
  await setupAndGoTo(page, 8);
  await answerAdditionalInfo(page, { text: 'The itching is worse at night' });

  await expect(page.getByText('Physical Examination', { exact: true }).first()).toBeVisible({ timeout: NEXT_QUESTION_TIMEOUT });
});

// TC_GD_063 - skipping completes the assessment
test('TC_GD_063_Verify_Additional_Information_Skip_Completes_Assessment', async ({ page }) => {
  await setupAndGoTo(page, 8);
  await answerAdditionalInfo(page);

  await expect(page.getByText('Physical Examination', { exact: true }).first()).toBeVisible({ timeout: NEXT_QUESTION_TIMEOUT });
});

// TC_GD_064 - the whole 8-question assessment completes via the composed helper
test('TC_GD_064_Verify_Full_Assessment_Completes', async ({ page }) => {
  await setupToGenitalAssessment(page);
  await completeGenitalAssessment(page);

  await expect(page.getByText('Physical Examination', { exact: true }).first()).toBeVisible({ timeout: NEXT_QUESTION_TIMEOUT });
});

// TC_GD_065 - the Visit reason summary lists the answers that were given
test('TC_GD_065_Verify_Visit_Reason_Summary_Lists_The_Answers', async ({ page }) => {
  await setupAndGoTo(page, 8);
  await answerAdditionalInfo(page, { finish: false });

  await expect(page.getByText('Visit reason summary', { exact: false }).first()).toBeVisible({ timeout: 15000 });

  const modal = page.locator('div').filter({ hasText: 'Visit reason summary' }).filter({ hasText: '3 hours' }).last();
  const text = await modal.innerText().catch(() => '');

  expect.soft(text, 'The summary should show the duration').toContain('3 hours');
  expect.soft(text, 'The summary should show the problem that was chosen').toContain('Vulvar pain');
});

// TC_GD_066 - a hand-washing reminder follows the assessment
test('TC_GD_066_Verify_Wash_Hands_Reminder_After_Assessment', async ({ page }) => {
  await setupAndGoTo(page, 8);
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

// TC_GD_067 - the Physical Examination starts after the assessment
test('TC_GD_067_Verify_Physical_Exam_Starts_After_Assessment', async ({ page }) => {
  await setupToPhysicalExam(page);

  await expect(page.getByText(questionRe(1)).first()).toBeVisible({ timeout: NEXT_QUESTION_TIMEOUT });
});

// TC_GD_068 - the Physical Examination can be completed up to its summary
test('TC_GD_068_Verify_Physical_Exam_Reaches_Summary', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completePhysicalExamGeneric(page);

  await expect(page.getByText('Physical examination summary', { exact: false })).toBeVisible({ timeout: NEXT_QUESTION_TIMEOUT });
});

// TC_GD_069 - confirming the Physical Examination summary leads to Medical History
test('TC_GD_069_Verify_Physical_Exam_Confirm_Navigates_To_Medical_History', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completePhysicalExamGeneric(page);
  await clickPhysicalExamSummaryConfirm(page);

  await expect(page.getByText('Medical History', { exact: true }).first()).toBeVisible({ timeout: NEXT_QUESTION_TIMEOUT });
});

// TC_GD_070 - the Medical History module completes within this protocol
test('TC_GD_070_Verify_Medical_History_Completes_Within_Protocol', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completePhysicalExamGeneric(page);
  await clickPhysicalExamSummaryConfirm(page);
  await completeMedicalHistoryGeneric(page);

  await expect(page.getByText('Medical history summary', { exact: false })).toBeVisible({ timeout: NEXT_QUESTION_TIMEOUT });
});

// TC_GD_071 - confirming the Medical History summary leads to the Visit Summary
test('TC_GD_071_Verify_Medical_History_Confirm_Navigates_To_Visit_Summary', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completePhysicalExamGeneric(page);
  await clickPhysicalExamSummaryConfirm(page);
  await completeMedicalHistoryGeneric(page);
  await clickMedicalHistorySummaryConfirm(page);

  await expect(page.getByText('Visit Summary', { exact: false }).first()).toBeVisible({ timeout: NEXT_QUESTION_TIMEOUT });
});

// TC_GD_072 - the Visit Summary shows the visit reason and the assessment fields
test('TC_GD_072_Verify_Visit_Summary_Checkup_Reason_Section', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completePhysicalExamGeneric(page);
  await clickPhysicalExamSummaryConfirm(page);
  await completeMedicalHistoryGeneric(page);
  await clickMedicalHistorySummaryConfirm(page);
  await waitForVisitSummaryToSettle(page);

  await expect(page.getByText(GENITAL_REASON_TEXT_RE).first()).toBeVisible({ timeout: 10000 });

  // Field names come from the questionnaire's question names. They are soft
  // checks: if the app labels a row differently, every mismatch is reported
  // together instead of stopping at the first.
  for (const label of ['Type of symptoms', 'Associated symptoms', 'Marital status', 'H/o specific illness', 'Prior treatment sought']) {
    await expect.soft(
      page.getByText(label, { exact: false }).first(),
      `The Visit Summary should show a "${label}" field`
    ).toBeVisible({ timeout: 5000 });
  }
});

// TC_GD_073 - end to end: assessment + physical exam + medical history + upload
test('TC_GD_073_Verify_End_To_End_Genital_Disease_Female_Protocol', async ({ page }) => {
  await setupToGenitalAssessment(page);
  await completeGenitalAssessment(page);

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
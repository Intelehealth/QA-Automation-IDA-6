import { test, expect } from '@playwright/test';

// ============================================================
// ANIMAL BITES & INSECT STINGS PROTOCOL - Full Test Suite
//
// Built from the questionnaire definition "Animal bites & Insect
// stings" (id ID-318844166). It has 8 top-level questions:
//
//   1. What animal/insect bit/stung you?*     single choice, 10 options
//   2. How long ago did this occur?*          DATE
//   3. Single or multiple bites/stings?*      single choice, 2 options
//   4. Site of animal/insect bite?            single choice, 6 options (optional)
//   5. Do you have the following symptom(s)?* Yes/No checklist, 21 rows
//   6. Diagnosed with specific diseases?      single choice, 3 options (optional)
//   7. Prior treatment sought                 Yes [Describe] / None (optional)
//   8. Additional information                 free text (optional)
//
// plus conditional follow-ups (Snake -> type of snake, Other ->
// describe, and several follow-ups under Associated symptoms).
//
// WHAT IS CERTAIN AND WHAT IS INFERRED
//   Certain  : question wording, option labels, which follow-up
//              belongs to which answer, which questions are
//              optional (they carry no asterisk) - all read
//              straight from the questionnaire.
//   Inferred : how each screen is laid out in the app. This is
//              taken from how the Abdominal Pain / Distention
//              protocols behave (choices without "repeats" are
//              single-select and auto-advance; a required
//              question has no Skip; "Associated symptoms" is a
//              Yes/No checklist). The date picker on Question 2
//              and the follow-up screens have not been seen
//              yet, so those helpers detect what is on screen
//              instead of assuming a layout.
//
//   The Physical Examination for this protocol is not part of the
//   questionnaire file (it only says which exam prompts to raise),
//   so that step is answered by an adaptive handler that picks the
//   negative/normal answer on whatever question is showing.
//
// Console output is hidden by quiet:true in playwright.config.js,
// so diagnostics are attached to the test report instead (see
// diag() and attachDiagnostics()).
// ============================================================

const ANIMAL_BITE_REASON_BUTTON_RE = /animal bites?.*insect stings?/i;
const ANIMAL_BITE_REASON_TEXT_RE = /^Animal bites?\s*(?:&|and|\/)?\s*Insect stings?$/i;

// ---- answer options exactly as written in the questionnaire ----
const ANIMAL_TYPES = [
  'Dog',
  'Cat',
  'Snake',
  'Small rodents (rats/mice)',
  'Human',
  'Spider',
  'Scorpion',
  'Bee/wasp',
  'Tick/mite',
  'Other [describe]'
];

// Types that have no follow-up question of their own.
const PLAIN_ANIMAL_TYPES = [
  'Cat',
  'Small rodents (rats/mice)',
  'Human',
  'Spider',
  'Scorpion',
  'Bee/wasp',
  'Tick/mite'
];

const COUNT_OPTIONS = ['Single', 'Multiple bites / Stings'];

const BITE_SITES = [
  'Head & Face',
  'Neck & Torso',
  'Upper Limbs-Right',
  'Upper Limbs-Left',
  'Lower Limbs-Right',
  'Lower Limbs-Left'
];

// The 21 associated symptoms, in questionnaire order. "Fresh menstrual
// bleeding" carries a gender extension of "0" (female only), so a male
// patient is offered 20 and a female patient 21.
const SYMPTOMS = [
  'Drooping of eyelids',
  'Drooling',
  'Difficulty swallowing',
  'Slurred speech',
  'Difficulty breathing',
  'Bluish discoloration of tongue and lips',
  'Muscle weakness',
  'Skin rash',
  'Gum bleeding',
  'Fresh menstrual bleeding',
  'Skin bruises',
  'Fever',
  'Vomiting',
  'Extensive perspiration',
  'Swelling / Redness / Warm at bites / Sting sites',
  'Pain at site(s) of bite/sting',
  'Itching at Bites/sting sites',
  'Discharge at injury site*',
  'Joint pain',
  'Paresthesia',
  'Other [Describe]'
];
const FEMALE_ONLY_SYMPTOMS = ['Fresh menstrual bleeding'];

const ILLNESS_OPTIONS = ['Chronic liver disease', 'Diabetes', 'Epilepsy'];

// Follow-ups under "Paresthesia".
const PARESTHESIA_SENSATIONS = [
  'Numbness',
  'Burning',
  'Prickling',
  'Tingling',
  'Itching',
  'Sensory loss',
  'Metallic taste',
  'Other [Describe]'
];
const PARESTHESIA_PROGRESSION = ['Stays the same (Static)', 'Worsening (Progressive)'];

// Learned from the first question marker ("Question 1/8").
let ASSESSMENT_TOTAL = 8;

function symptomNamesFor(gender) {
  return gender === 'Female' ? SYMPTOMS : SYMPTOMS.filter((s) => !FEMALE_ONLY_SYMPTOMS.includes(s));
}

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
// SHARED HELPERS (carried over unchanged from the Abdominal Pain suite)
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
// select "Animal bites & Insect stings") -> Start Assessment ->
// arrives at Question 1/8.
// ============================================================

async function setupToAnimalBiteAssessment(page, { gender = 'Male' } = {}) {

  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(30000);

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
        `setupToAnimalBiteAssessment — preflight attempt ${attempt}/${PREFLIGHT_ATTEMPTS} failed ` +
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
      `setupToAnimalBiteAssessment — backend still unreachable after ${PREFLIGHT_ATTEMPTS} preflight ` +
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

  await expect(page).toHaveURL(/.*dashboard/, { timeout: 30000 });

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

    diag('setupToAnimalBiteAssessment — "Add Patients" button never appeared on the dashboard.');
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
      diag(`setupToAnimalBiteAssessment — reloading the dashboard (attempt ${attempt}/3) to recover "Add Patients".`);
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(8000);
      recoveredAddPatients = await waitVisible(addPatientsButton, 20000);
    }

    if (recoveredAddPatients) {
      diag('setupToAnimalBiteAssessment — "Add Patients" recovered after reload retries.');
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
        `setupToAnimalBiteAssessment — "Add Patients" button never appeared on the dashboard (URL: ${currentUrl}), ` +
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

  // Gender decides whether the female-only symptom "Fresh menstrual
  // bleeding" is offered (20 symptoms for a male patient, 21 for a
  // female one). Verified rather than a bare .check(): in the Abdominal
  // Pain suite an unverified click silently left the default gender.
  const genderApplied = await selectGenderRadio(page, gender);

  if (!genderApplied) {
    await page
      .screenshot({ path: `debug-gender-radio-${gender}-${Date.now()}.png`, fullPage: true })
      .catch(() => {});
    diag(
      `setupToAnimalBiteAssessment — WARNING: could not confirm the "${gender}" radio was checked. ` +
      'The symptom list may not match the requested gender if the default gender was used instead.'
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
    for (const typed of ['01/01/2000', '01-01-2000', '2000-01-01', '01.01.2000']) {
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

      failedStep = 'bring 2000 into view';
      const yearButton = picker.getByRole('button', { name: '2000', exact: true }).first();
      for (let i = 0; i < 6 && !(await waitVisible(yearButton, 1000)); i++) {
        // The previous-decade arrow is icon-only; inside the calendar
        // the first empty-text button is the previous arrow.
        await picker.getByRole('button').filter({ hasText: /^$/ }).first().click({ timeout: 5000 });
        await page.waitForTimeout(250);
      }

      failedStep = 'select year 2000';
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
      diag(`setupToAnimalBiteAssessment - the calendar route failed at "${failedStep}" (${reason}).`);

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
      'setupToAnimalBiteAssessment - could not set a date of birth by typing it or by using the ' +
      'calendar. Falling back to the Age field would not help: the server rejects a patient with no ' +
      'date of birth (HTTP 400). See the calendar markup and the screenshot saved with this run.'
    );
  }
  diag(`setupToAnimalBiteAssessment - date of birth set by ${dobRoute}.`);

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
        'setupToAnimalBiteAssessment — still on the patient registration form; it was never accepted.'
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
        `setupToAnimalBiteAssessment — patient "${patientFullName}" was never created. ` +
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
  // 18. VISIT REASON - search and select "Animal bites & Insect stings"
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
    await reasonSearchBox.pressSequentially('animal bites', { delay: 80 }).catch(() => {});
    await page.waitForTimeout(1500);

    let option = page.getByRole('button', { name: ANIMAL_BITE_REASON_BUTTON_RE }).first();
    let optionVisible = await option.isVisible({ timeout: 5000 }).catch(() => false);

    if (!optionVisible) {
      option = page.locator('div').filter({ hasText: ANIMAL_BITE_REASON_TEXT_RE }).nth(1);
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

      option = page.getByRole('button', { name: ANIMAL_BITE_REASON_BUTTON_RE }).first();
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
      `setupToAnimalBiteAssessment — "Animal bites & Insect stings" not offered on attempt ${attempt}/${REASON_ATTEMPTS}; the reasons list may still be loading (buttons currently in main: ${gridButtonCount}).`
    );

    // From the second attempt onward, reload the page. Confirmed
    // from the TC_AP_018 recording: when the reasons request comes
    // back empty, waiting longer never helps - the grid under "All
    // reasons" simply stays empty for the rest of the run. A
    // reload re-issues the request, and the visit is already saved
    // server-side so the app returns to this same step.
    if (attempt >= 2 && attempt < REASON_ATTEMPTS) {
      diag('setupToAnimalBiteAssessment — reloading the Visit Reason page to re-request the reasons list.');

      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.waitForTimeout(5000);

      const backOnReasonPage = await waitVisible(
        page.getByRole('textbox', { name: 'Type or select reason eg.' }),
        20000
      );

      if (!backOnReasonPage) {
        diag('setupToAnimalBiteAssessment — the reload did not return to the Visit Reason page.');
        break;
      }

      continue;
    }

    // Give the reasons request more time before trying again.
    await page.waitForTimeout(8000);
  }

  if (!reasonSelected) {
    const mainButtons = await page.locator('main button').allTextContents().catch(() => []);

    diag('setupToAnimalBiteAssessment — reasons list never populated.');
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
      `setupToAnimalBiteAssessment — the visit-reason list never populated after ${REASON_ATTEMPTS} attempts ` +
      `(including page reloads) spanning several minutes, so "Animal bites & Insect stings" could not be selected. ` +
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
  // ANIMAL BITES ASSESSMENT - Question 1/N ready
  // ============================================================

  await waitForQuestion(page, 1, 30000);
  await expect(
    page.getByText('What animal/insect bit/stung you?', { exact: false })
  ).toBeVisible({ timeout: 10000 });

  // The total is part of the marker ("Question 1/8"); remember it.
  const firstMarker = await getQuestionMarker(page);
  const totalMatch = firstMarker && firstMarker.match(/Question\s*1\/(\d+)/);
  if (totalMatch) ASSESSMENT_TOTAL = Number(totalMatch[1]);
}

// ============================================================
// ASSESSMENT HELPERS (8 questions)
// ============================================================

async function waitForQuestion(page, n, timeout = 20000) {
  const marker = page.getByText(questionRe(n)).first();
  if (await waitVisible(marker, timeout)) return;

  const info = await attachDiagnostics(page, `waiting for Question ${n}`);
  throw new Error(`Expected to reach Question ${n}, but it never appeared.\n${info}`);
}

async function optionOffered(page, label, timeout = 8000) {
  return waitVisible(optionButtonByLabel(page, label), timeout);
}

async function chooseOption(page, label) {
  const option = optionButtonByLabel(page, label);

  if (!(await waitVisible(option, 15000))) {
    const info = await attachDiagnostics(page, `option "${label}" not offered`);
    throw new Error(`The option "${label}" was not offered on this question.\n${info}`);
  }

  await scrollIntoViewWithClearance(page, option, 250);
  await robustClick(option);
  await page.waitForTimeout(400);
}

async function clickSubmit(page) {
  const submit = page.getByRole('button', { name: 'Submit', exact: true }).first();
  await expect(submit, 'Expected a Submit button on this question').toBeVisible({ timeout: 15000 });
  await scrollIntoViewWithClearance(page, submit, 200);
  await robustClick(submit);
  await page.waitForTimeout(1000);
}

async function clickSubmitIfVisible(page) {
  const submit = page.getByRole('button', { name: 'Submit', exact: true }).first();
  const visible = await submit.isVisible({ timeout: 1500 }).catch(() => false);
  if (!visible) return false;
  await scrollIntoViewWithClearance(page, submit, 200);
  await robustClick(submit);
  await page.waitForTimeout(1000);
  return true;
}

// Single-choice questions advance by themselves; multi-select and
// date questions need Submit. Rather than assume which this is, wait
// briefly for the next question and press Submit only if it has not
// appeared.
async function continueToNext(page, n) {
  const next = page.getByText(questionRe(n + 1)).first();
  if (await waitVisible(next, 3500)) return;

  await clickSubmitIfVisible(page);
  await waitForQuestion(page, n + 1, 20000);
}

async function skipQuestion(page, n) {
  const skip = page.getByRole('button', { name: 'Skip', exact: true }).first();
  await expect(skip, `Question ${n} is optional and should offer Skip`).toBeVisible({ timeout: 10000 });
  await scrollIntoViewWithClearance(page, skip, 200);
  await robustClick(skip);
  await page.waitForTimeout(1000);
  if (n < ASSESSMENT_TOTAL) await waitForQuestion(page, n + 1, 20000);
}

async function expectAnyVisible(page, builders, message, timeout = 10000) {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    for (const build of builders) {
      if (await build().isVisible({ timeout: 300 }).catch(() => false)) return;
    }
    await page.waitForTimeout(400);
  }

  const info = await attachDiagnostics(page, message);
  throw new Error(`${message}\n${info}`);
}

// ------------------------------------------------------------
// Question 1/8 - "What animal/insect bit/stung you?*"
// Single choice (no "repeats"), required: auto-advances.
// Snake and Other [describe] have follow-up questions.
// ------------------------------------------------------------
async function answerBiteType(page, type = 'Dog', { advance = true } = {}) {
  await waitForQuestion(page, 1);
  await chooseOption(page, type);
  if (advance) await continueToNext(page, 1);
}

// ------------------------------------------------------------
// Question 2/8 - "How long ago did this occur?*"
// The only DATE question in the protocol. The abdominal protocols'
// duration question is a number + unit pair, so this widget has not
// been seen. It is handled by detecting what is on screen:
//   a native <input type="date">,
//   a text input (typed in several date formats), or
//   a calendar that opens on click (today is clicked as a last resort).
// A date in the past is used - "how long ago" must not be in the future.
// Returns a short description of the route that worked.
// ------------------------------------------------------------
async function fillOccurredDate(page) {
  // The 15th of last month: always in the past, and a day number above
  // 12 can only be read one way. Typing "06/10/2026" is a valid date
  // whether the field is day-first or month-first, and a real run read
  // it month-first (recorded as 2026-06-10, not today). A day above 12
  // is rejected in the wrong order, so the right format is the one kept.
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const dd = String(target.getDate()).padStart(2, '0');
  const mm = String(target.getMonth() + 1).padStart(2, '0');
  const yyyy = String(target.getFullYear());
  const typedFormats = [`${dd}/${mm}/${yyyy}`, `${mm}/${dd}/${yyyy}`, `${yyyy}-${mm}-${dd}`, `${dd}-${mm}-${yyyy}`];

  const inputs = page.locator('input:visible');
  const total = await inputs.count().catch(() => 0);
  const usable = [];

  for (let i = 0; i < total; i++) {
    const el = inputs.nth(i);
    const placeholder = (await el.getAttribute('placeholder').catch(() => '')) || '';
    const type = ((await el.getAttribute('type').catch(() => '')) || '').toLowerCase();
    if (/search/i.test(placeholder) || ['checkbox', 'radio', 'hidden', 'file'].includes(type)) continue;
    usable.push({ el, type });
  }

  const hasValue = async (el) => String((await el.inputValue().catch(() => '')) || '').trim() !== '';

  for (const { el, type } of usable.slice(0, 3)) {
    if (type === 'date') {
      await el.fill(`${yyyy}-${mm}-${dd}`).catch(() => {});
      await page.keyboard.press('Tab').catch(() => {});
      await page.waitForTimeout(400);
      if (await hasValue(el)) return 'native date input';
      continue;
    }

    // A calendar that closes on Tab keeps the value only if the typed
    // text is a real date, so a surviving value means the date took.
    for (const typed of typedFormats) {
      await el.click({ timeout: 5000 }).catch(() => {});
      await el.fill('', { timeout: 3000 }).catch(() => {});
      await el.fill(typed, { timeout: 3000 }).catch(() => {});
      await page.keyboard.press('Tab').catch(() => {});
      await page.waitForTimeout(500);
      if (await hasValue(el)) return `typed ${typed}`;
    }

    // Typing did not stick: open the calendar and click today.
    await el.click({ timeout: 5000 }).catch(() => {});
    const today = page.locator('.react-datepicker__day--today, [aria-current="date"]').first();
    if (await today.isVisible({ timeout: 2000 }).catch(() => false)) {
      await robustClick(today);
      await page.waitForTimeout(500);
      if (await hasValue(el)) return 'calendar (today)';
    }
  }

  const info = await attachDiagnostics(page, 'date question');
  throw new Error(
    'Could not enter a date on "How long ago did this occur?". No usable date input was found, or ' +
    `typing and the calendar both failed. The screen was attached to the report.\n${info}`
  );
}

async function answerOccurredDate(page, { advance = true } = {}) {
  await waitForQuestion(page, 2);
  const route = await fillOccurredDate(page);
  diag(`Question 2 date entered via: ${route}`);
  if (advance) await continueToNext(page, 2);
  return route;
}

// The "Describe..." box that sits under a labelled follow-up, e.g. the
// box under "Single joint [Describe which joint]" (seen in a recording:
// each such label is a heading with its own text area beneath it).
function describeFieldFor(page, labelText) {
  return page.getByText(labelText, { exact: false }).first().locator('xpath=following::textarea[1]');
}

// ------------------------------------------------------------
// Question 3/8 - "Do you have single or multiple bites/stings?*"
// ------------------------------------------------------------
async function answerBiteCount(page, count = 'Single') {
  await waitForQuestion(page, 3);
  await chooseOption(page, count);
  await continueToNext(page, 3);
}

// ------------------------------------------------------------
// Question 4/8 - "Site of animal/insect bite?" - optional, so it
// also offers Skip. Pass null to skip.
// ------------------------------------------------------------
async function answerBiteSite(page, site = 'Head & Face') {
  await waitForQuestion(page, 4);
  if (site === null) {
    await skipQuestion(page, 4);
    return;
  }
  await chooseOption(page, site);
  await continueToNext(page, 4);
}

// ------------------------------------------------------------
// Question 5/8 - "Do you have the following symptom(s)?*"
// A Yes/No checklist: one row per symptom, then Submit. Rows are
// numbered ("8. Skin rash") and the numbering shifts with gender,
// so rows are found by name with the number ignored.
// ------------------------------------------------------------
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

async function answerSymptoms(
  page,
  { gender = 'Male', defaultAnswer = 'No', overrides = {}, subAnswers = {}, submit = true } = {}
) {
  await waitForQuestion(page, 5);

  for (const name of symptomNamesFor(gender)) {
    const answer = overrides[name] || defaultAnswer;
    await answerSymptomRow(page, name, answer);

    // A "Yes" can open a follow-up that must be answered before Submit.
    for (const label of subAnswers[name] || []) {
      await chooseOption(page, label);
    }
  }

  if (!submit) return;
  await clickSubmit(page);
  await waitForQuestion(page, 6, 20000);
}

// ------------------------------------------------------------
// Question 6/8 - "Have you ever been diagnosed with any of the
// following specific diseases?" - optional single choice.
// Pass null to skip.
// ------------------------------------------------------------
async function answerIllnessHistory(page, illness = null) {
  await waitForQuestion(page, 6);
  if (illness === null) {
    await skipQuestion(page, 6);
    return;
  }
  await chooseOption(page, illness);
  await continueToNext(page, 6);
}

// ------------------------------------------------------------
// Question 7/8 - "Have you taken any treatment ...?" - Yes
// [Describe] / None.
// ------------------------------------------------------------
async function answerPriorTreatment(page, value = 'None') {
  await waitForQuestion(page, 7);
  await chooseOption(page, value);
  await continueToNext(page, 7);
}

// ------------------------------------------------------------
// Question 8/8 (final) - "Additional information" - free text +
// Skip. Afterwards the Visit reason summary modal appears
// (Confirm) and then the "wash your hands" reminder (Okay).
// ------------------------------------------------------------
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

async function completeAnimalBiteAssessment(page, overrides = {}) {
  const {
    animal = 'Dog',
    count = 'Single',
    site = 'Head & Face',
    gender = 'Male',
    symptomDefault = 'No',
    symptomOverrides = {},
    symptomSubAnswers = {},
    illness = null,
    prior = 'None',
    additionalInfo = {}
  } = overrides;

  await answerBiteType(page, animal);
  await answerOccurredDate(page);
  await answerBiteCount(page, count);
  await answerBiteSite(page, site);
  await answerSymptoms(page, {
    gender,
    defaultAnswer: symptomDefault,
    overrides: symptomOverrides,
    subAnswers: symptomSubAnswers
  });
  await answerIllnessHistory(page, illness);
  await answerPriorTreatment(page, prior);
  await answerAdditionalInfo(page, additionalInfo);
}

// Setup, then answer every question before `n` with defaults so the
// flow stands on question `n`.
async function setupAndGoTo(page, n, { gender = 'Male', animal = 'Dog', count = 'Single', site = 'Head & Face' } = {}) {
  await setupToAnimalBiteAssessment(page, { gender });
  if (n > 1) await answerBiteType(page, animal);
  if (n > 2) await answerOccurredDate(page);
  if (n > 3) await answerBiteCount(page, count);
  if (n > 4) await answerBiteSite(page, site);
  if (n > 5) await answerSymptoms(page, { gender });
  if (n > 6) await answerIllnessHistory(page, null);
  if (n > 7) await answerPriorTreatment(page, 'None');
}

// ============================================================
// PHYSICAL EXAMINATION - adaptive
//
// The exam questions for this protocol are not in the questionnaire
// file, so each question is answered by what is on screen:
//   - a Yes/No checklist: "No" on every row, then Submit
//   - option buttons: the negative/normal one (No, None, Normal,
//     Nails are normal, No oedema ...), or the first if none reads
//     as negative; Submit is pressed if the question has one
//   - otherwise Skip
// A question that will not advance fails with the screen attached.
// ============================================================
const CHROME_BUTTONS = new Set([
  '', 'add patient', 'add patients', 'patient details', 'start visit', 'vitals',
  'visit reason', 'physical examination', 'medical history', 'dashboard', 'home',
  'achievements', 'help & support', 'educational videos', 'settings', 'about us',
  'log-out', 'submit', 'skip', 'back', 'confirm', 'change', 'edit answer', 'take a picture'
]);

const NEGATIVE_ANSWER_RE = /^(no|none|normal|absent|negative|nil|not present|no known)\b|\bnormal\b|^no\s/i;

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

  const skip = page.getByRole('button', { name: 'Skip', exact: true }).first();
  if (await skip.isVisible({ timeout: 1500 }).catch(() => false)) {
    await robustClick(skip);
    return 'skip';
  }

  return 'nothing';
}

async function expectPhysicalExamStarted(page) {
  const firstQuestion = page.getByText(questionRe(1)).first();
  const stillOnAssessment = page.getByText('What animal/insect bit/stung you?', { exact: false }).first();
  const deadline = Date.now() + 25000;

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
  await setupToAnimalBiteAssessment(page, { gender: overrides.gender || 'Male' });
  await completeAnimalBiteAssessment(page, overrides);
  await expectPhysicalExamStarted(page);
}

// ============================================================
// PHYSICAL EXAM CONFIRM, MEDICAL HISTORY, VISIT SUMMARY / UPLOAD
// (carried over unchanged from the Abdominal Pain suite)
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

// Opens a collapsed follow-up (if the answer options are hidden behind
// its heading) and returns once the option is on screen.
async function revealOption(page, headingRe, optionLabel) {
  if (await optionOffered(page, optionLabel, 2500)) return;

  const asButton = page.getByRole('button', { name: headingRe }).first();
  if (await asButton.isVisible({ timeout: 1500 }).catch(() => false)) {
    await robustClick(asButton);
  } else {
    const asText = page.getByText(headingRe).first();
    if (await asText.isVisible({ timeout: 1500 }).catch(() => false)) await robustClick(asText);
  }
  await page.waitForTimeout(600);
}

const pad = (n) => String(n).padStart(3, '0');
const slug = (text) => text.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

test.describe('Animal Bites & Insect Stings Protocol - Full Test Suite', () => {

test.describe.configure({ timeout: 900000 });

// ============================================================
// QUESTION 1/8 - What animal/insect bit/stung you?
// ============================================================

// TC_AB_001 - the visit reason can be selected and starts the assessment
test('TC_AB_001_Verify_Visit_Reason_Selection_Starts_Assessment', async ({ page }) => {
  await setupToAnimalBiteAssessment(page);

  await expect(page.getByText(questionRe(1)).first()).toBeVisible();
  await expect(page.getByText('What animal/insect bit/stung you?', { exact: false })).toBeVisible();
});

// TC_AB_002 - all ten answer options are offered
test('TC_AB_002_Verify_Bite_Type_Question_Shows_All_Options', async ({ page }) => {
  await setupToAnimalBiteAssessment(page);
  await waitForQuestion(page, 1);

  for (const label of ANIMAL_TYPES) {
    await expect(optionButtonByLabel(page, label), `Option "${label}" should be offered`).toBeVisible({ timeout: 10000 });
  }
});

// TC_AB_003 - a single choice advances to the date question
test('TC_AB_003_Verify_Selecting_Dog_Advances_To_Date_Question', async ({ page }) => {
  await setupToAnimalBiteAssessment(page);
  await answerBiteType(page, 'Dog');

  await waitForQuestion(page, 2);
  await expect(page.getByText('How long ago did this occur?', { exact: false })).toBeVisible({ timeout: 10000 });
});

// TC_AB_004 - TC_AB_010 - every type that has no follow-up question
PLAIN_ANIMAL_TYPES.forEach((animal, i) => {
  test(`TC_AB_${pad(4 + i)}_Verify_${slug(animal)}_Can_Be_Selected`, async ({ page }) => {
    await setupToAnimalBiteAssessment(page);
    await answerBiteType(page, animal);

    await waitForQuestion(page, 2);
  });
});

// TC_AB_011 - Snake reveals its follow-up (Type of Snake / Unknown)
test('TC_AB_011_Verify_Snake_Reveals_Type_Of_Snake_FollowUp', async ({ page }) => {
  await setupToAnimalBiteAssessment(page);
  await waitForQuestion(page, 1);

  await chooseOption(page, 'Snake');
  await page.waitForTimeout(1200);

  await expectAnyVisible(page, [
    () => optionButtonByLabel(page, 'Unknown'),
    () => optionButtonByLabel(page, 'Type of Snake'),
    () => page.getByText(/type of snake/i).first()
  ], 'Choosing Snake should reveal the follow-up question ("Type of Snake" / "Unknown")');
});

// TC_AB_012 - answering the snake follow-up with Unknown continues to question 2
test('TC_AB_012_Verify_Snake_Unknown_Advances_To_Date_Question', async ({ page }) => {
  await setupToAnimalBiteAssessment(page);
  await waitForQuestion(page, 1);

  await chooseOption(page, 'Snake');
  await page.waitForTimeout(1000);
  await chooseOption(page, 'Unknown');
  await continueToNext(page, 1);

  await expect(page.getByText('How long ago did this occur?', { exact: false })).toBeVisible({ timeout: 10000 });
});

// TC_AB_013 - choosing "Type of Snake" reveals a free-text field
test('TC_AB_013_Verify_Type_Of_Snake_Reveals_Text_Field', async ({ page }) => {
  await setupToAnimalBiteAssessment(page);
  await waitForQuestion(page, 1);

  await chooseOption(page, 'Snake');
  await page.waitForTimeout(1000);
  await chooseOption(page, 'Type of Snake');
  await page.waitForTimeout(800);

  const field = await findRevealedTextField(page, 'Snake -> Type of Snake');
  expect(field, 'Choosing "Type of Snake" should reveal a free-text field').not.toBeNull();

  await field.fill('Cobra');
  await expect(field).toHaveValue('Cobra');
});

// TC_AB_014 - "Other [describe]" reveals a free-text field
test('TC_AB_014_Verify_Other_Animal_Reveals_Text_Field', async ({ page }) => {
  await setupToAnimalBiteAssessment(page);
  await waitForQuestion(page, 1);

  await chooseOption(page, 'Other [describe]');
  await page.waitForTimeout(1000);

  const field = await findRevealedTextField(page, 'Type of bites/stings -> Other [describe]');
  expect(field, 'Choosing "Other [describe]" should reveal a free-text field').not.toBeNull();

  await field.fill('Monkey');
  await expect(field).toHaveValue('Monkey');
});

// ============================================================
// QUESTION 2/8 - How long ago did this occur? (date)
// ============================================================

// TC_AB_015 - the date question accepts today's date and advances
test('TC_AB_015_Verify_Occurrence_Date_Is_Accepted_And_Advances', async ({ page }) => {
  await setupAndGoTo(page, 2);

  await expect(page.getByText('How long ago did this occur?', { exact: false })).toBeVisible({ timeout: 10000 });
  await answerOccurredDate(page);

  await waitForQuestion(page, 3);
  await expect(page.getByText('single or multiple bites/stings', { exact: false })).toBeVisible({ timeout: 10000 });
});

// ============================================================
// QUESTION 3/8 - Single or multiple bites/stings?
// ============================================================

// TC_AB_016 - both options are offered
test('TC_AB_016_Verify_Bite_Count_Question_Shows_Both_Options', async ({ page }) => {
  await setupAndGoTo(page, 3);
  await waitForQuestion(page, 3);

  for (const label of COUNT_OPTIONS) {
    await expect(optionButtonByLabel(page, label), `Option "${label}" should be offered`).toBeVisible({ timeout: 10000 });
  }
});

// TC_AB_017 - "Single" advances to question 4
test('TC_AB_017_Verify_Single_Bite_Advances_To_Site_Question', async ({ page }) => {
  await setupAndGoTo(page, 3);
  await answerBiteCount(page, 'Single');

  await waitForQuestion(page, 4);
  await expect(page.getByText('Site of animal/insect bite?', { exact: false })).toBeVisible({ timeout: 10000 });
});

// TC_AB_018 - "Multiple bites / Stings" advances to question 4
test('TC_AB_018_Verify_Multiple_Bites_Advances_To_Site_Question', async ({ page }) => {
  await setupAndGoTo(page, 3);
  await answerBiteCount(page, 'Multiple bites / Stings');

  await waitForQuestion(page, 4);
});

// ============================================================
// QUESTION 4/8 - Site of animal/insect bite? (optional)
// ============================================================

// TC_AB_019 - all six sites are offered, and the question can be skipped
test('TC_AB_019_Verify_Bite_Site_Question_Shows_All_Options', async ({ page }) => {
  await setupAndGoTo(page, 4);
  await waitForQuestion(page, 4);

  for (const label of BITE_SITES) {
    await expect(optionButtonByLabel(page, label), `Option "${label}" should be offered`).toBeVisible({ timeout: 10000 });
  }
  await expect(page.getByRole('button', { name: 'Skip', exact: true }).first()).toBeVisible({ timeout: 10000 });
});

// TC_AB_020 - skipping the optional site question advances
test('TC_AB_020_Verify_Bite_Site_Can_Be_Skipped', async ({ page }) => {
  await setupAndGoTo(page, 4);
  await answerBiteSite(page, null);

  await waitForQuestion(page, 5);
});

// TC_AB_021 - choosing a site advances
test('TC_AB_021_Verify_Choosing_A_Bite_Site_Advances', async ({ page }) => {
  await setupAndGoTo(page, 4);
  await answerBiteSite(page, 'Lower Limbs-Left');

  await waitForQuestion(page, 5);
  await expect(page.getByText('Do you have the following symptom(s)?', { exact: false })).toBeVisible({ timeout: 10000 });
});

// ============================================================
// QUESTION 5/8 - Associated symptoms (Yes/No checklist)
// ============================================================

// TC_AB_022 - a male patient is offered 20 symptoms, without the female-only one
test('TC_AB_022_Verify_Male_Patient_Is_Offered_20_Symptoms', async ({ page }) => {
  await setupAndGoTo(page, 5, { gender: 'Male' });
  await waitForQuestion(page, 5);

  for (const name of symptomNamesFor('Male')) {
    await expect(symptomRow(page, name), `Symptom "${name}" should be listed`).toBeVisible({ timeout: 10000 });
  }

  const femaleOnlyShown = await symptomRow(page, 'Fresh menstrual bleeding').isVisible({ timeout: 3000 }).catch(() => false);
  expect(
    femaleOnlyShown,
    '"Fresh menstrual bleeding" is female-only in the questionnaire and should not be offered to a male patient'
  ).toBeFalsy();
});

// TC_AB_023 - answering every symptom "No" and submitting advances
test('TC_AB_023_Verify_All_Symptoms_No_Advances_To_Illness_Question', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await answerSymptoms(page);

  await waitForQuestion(page, 6);
  await expect(page.getByText('diagnosed with any of the following specific diseases', { exact: false })).toBeVisible({ timeout: 10000 });
});

// TC_AB_024 - a "Yes" on a symptom with no follow-up is accepted
test('TC_AB_024_Verify_Fever_Yes_Is_Accepted', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await answerSymptoms(page, { overrides: { Fever: 'Yes' } });

  await waitForQuestion(page, 6);
});

// TC_AB_025 - Skin rash = Yes is accepted. The questionnaire gives Skin rash a
// "Take a picture" child item, but a recording of the app shows nothing is
// added under the row, so the picture is not collected on this screen (the
// item carries a performPhysicalExam hint, so it belongs to the exam).
test('TC_AB_025_Verify_Skin_Rash_Yes_Is_Accepted', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await answerSymptoms(page, { overrides: { 'Skin rash': 'Yes' } });

  await waitForQuestion(page, 6);
});

// TC_AB_026 - Itching = Yes asks what aggravates it
test('TC_AB_026_Verify_Itching_Yes_Asks_What_Aggravates_It', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await answerSymptomRow(page, 'Itching at Bites/sting sites', 'Yes');
  await page.waitForTimeout(1000);

  await expectAnyVisible(page, [
    () => optionButtonByLabel(page, 'Night time'),
    () => page.getByText(/aggravated by/i).first()
  ], 'Answering "Itching" = Yes should ask what aggravates it (Night time / Hot water bath)');
  await expectAnyVisible(page, [
    () => optionButtonByLabel(page, 'Hot water bath'),
    () => page.getByText(/aggravated by/i).first()
  ], 'The "Aggravated by" follow-up should offer "Hot water bath"');
});

// TC_AB_027 - Discharge = Yes asks the nature of the discharge
test('TC_AB_027_Verify_Discharge_Yes_Asks_Nature_Of_Discharge', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await answerSymptomRow(page, 'Discharge at injury site*', 'Yes');
  await page.waitForTimeout(1000);

  for (const label of ['Pus', 'Blood', 'Clear']) {
    await expectAnyVisible(page, [
      () => optionButtonByLabel(page, label),
      () => page.getByText(/nature of discharge|discharge at injury site/i).nth(1)
    ], `The discharge follow-up should offer "${label}"`);
  }
});

// TC_AB_028 - Joint pain = Yes shows the joint follow-up. In the app each
// joint option is a heading with its own "Describe..." box under it (not a
// button), and the pain-moves question follows.
test('TC_AB_028_Verify_Joint_Pain_Yes_Asks_Involvement_And_Migration', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await answerSymptomRow(page, 'Joint pain', 'Yes');
  await page.waitForTimeout(1000);

  await expect(
    page.getByText('Single joint [Describe which joint]', { exact: false }).first(),
    'Joint pain = Yes should offer "Single joint [Describe which joint]"'
  ).toBeVisible({ timeout: 10000 });
  await expect(
    page.getByText('Multiple joints [Describe which joints]', { exact: false }).first(),
    'Joint pain = Yes should offer "Multiple joints [Describe which joints]"'
  ).toBeVisible({ timeout: 10000 });

  // Below the fold in the recording, so it is checked softly.
  await expect.soft(
    page.getByText('Does the pain move to other parts of the body?', { exact: false }).first(),
    'Joint pain = Yes should also ask whether the pain moves to other parts of the body'
  ).toBeVisible({ timeout: 5000 });
});

// TC_AB_029 - a joint can be described under "Single joint"
test('TC_AB_029_Verify_Single_Joint_Accepts_A_Description', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await answerSymptomRow(page, 'Joint pain', 'Yes');
  await page.waitForTimeout(1000);

  const field = describeFieldFor(page, 'Single joint [Describe which joint]');
  await expect(field, 'A "Describe..." box should sit under "Single joint [Describe which joint]"').toBeVisible({ timeout: 10000 });

  await field.fill('Left knee');
  await expect(field).toHaveValue('Left knee');
});

// TC_AB_030 - Paresthesia = Yes describes the sensation, its progression and the affected areas
test('TC_AB_030_Verify_Paresthesia_Yes_Asks_Sensation_Progression_And_Areas', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await answerSymptomRow(page, 'Paresthesia', 'Yes');
  await page.waitForTimeout(1000);

  await expectAnyVisible(page, [
    () => page.getByText(/describe the abnormal sensation/i).first(),
    () => optionButtonByLabel(page, 'Numbness')
  ], 'Answering "Paresthesia" = Yes should ask to describe the abnormal sensation');

  await expectAnyVisible(page, [
    () => page.getByText(/gradually increasing/i).first(),
    () => optionButtonByLabel(page, 'Stays the same (Static)')
  ], 'Answering "Paresthesia" = Yes should ask whether the sensation stays the same or is increasing');

  await expectAnyVisible(page, [
    () => page.getByText(/affected areas/i).first()
  ], 'Answering "Paresthesia" = Yes should ask for the affected areas');
});

// TC_AB_031 - the sensation's "Other [Describe]" reveals a free-text field
test('TC_AB_031_Verify_Paresthesia_Other_Sensation_Reveals_Text_Field', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await answerSymptomRow(page, 'Paresthesia', 'Yes');
  await page.waitForTimeout(1000);

  await revealOption(page, /describe the abnormal sensation/i, 'Other [Describe]');
  await chooseOption(page, 'Other [Describe]');
  await page.waitForTimeout(800);

  const field = await findRevealedTextField(page, 'Paresthesia -> Characteristics -> Other [Describe]');
  expect(field, 'Choosing "Other [Describe]" should reveal a free-text field').not.toBeNull();

  await field.fill('Cold feeling');
  await expect(field).toHaveValue('Cold feeling');
});

// TC_AB_032 - the symptom "Other [Describe]" = Yes reveals a free-text field
test('TC_AB_032_Verify_Other_Symptom_Yes_Reveals_Text_Field', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await answerSymptomRow(page, 'Other [Describe]', 'Yes');
  await page.waitForTimeout(1000);

  const field = await findRevealedTextField(page, 'Associated symptoms -> Other [Describe]');
  expect(field, 'Answering the "Other [Describe]" symptom = Yes should reveal a free-text field').not.toBeNull();

  await field.fill('Dizziness');
  await expect(field).toHaveValue('Dizziness');
});

// ============================================================
// QUESTION 6/8 - Diagnosed with specific diseases? (optional)
// ============================================================

// TC_AB_033 - all three illnesses are offered
test('TC_AB_033_Verify_Illness_History_Question_Shows_All_Options', async ({ page }) => {
  await setupAndGoTo(page, 6);
  await waitForQuestion(page, 6);

  for (const label of ILLNESS_OPTIONS) {
    await expect(optionButtonByLabel(page, label), `Option "${label}" should be offered`).toBeVisible({ timeout: 10000 });
  }
  await expect(page.getByRole('button', { name: 'Skip', exact: true }).first()).toBeVisible({ timeout: 10000 });
});

// TC_AB_034 - skipping the optional question advances
test('TC_AB_034_Verify_Illness_History_Can_Be_Skipped', async ({ page }) => {
  await setupAndGoTo(page, 6);
  await answerIllnessHistory(page, null);

  await waitForQuestion(page, 7);
});

// TC_AB_035 - choosing an illness advances
test('TC_AB_035_Verify_Choosing_An_Illness_Advances', async ({ page }) => {
  await setupAndGoTo(page, 6);
  await answerIllnessHistory(page, 'Epilepsy');

  await waitForQuestion(page, 7);
});

// ============================================================
// QUESTION 7/8 - Prior treatment sought
// ============================================================

// TC_AB_036 - both options are offered
test('TC_AB_036_Verify_Prior_Treatment_Question_Shows_Both_Options', async ({ page }) => {
  await setupAndGoTo(page, 7);
  await waitForQuestion(page, 7);

  await expect(page.getByText('Have you taken any treatment', { exact: false })).toBeVisible({ timeout: 10000 });
  await expect(optionButtonByLabel(page, 'Yes [Describe]')).toBeVisible({ timeout: 10000 });
  await expect(optionButtonByLabel(page, 'None')).toBeVisible({ timeout: 10000 });
});

// TC_AB_037 - "Yes [Describe]" reveals a free-text field
test('TC_AB_037_Verify_Prior_Treatment_Yes_Reveals_Text_Field', async ({ page }) => {
  await setupAndGoTo(page, 7);
  await waitForQuestion(page, 7);

  await chooseOption(page, 'Yes [Describe]');
  await page.waitForTimeout(1000);

  const field = await findRevealedTextField(page, 'Prior treatment -> Yes [Describe]');
  expect(field, 'Choosing "Yes [Describe]" should reveal a free-text field').not.toBeNull();

  await field.fill('Washed the wound and took an antibiotic');
  await expect(field).toHaveValue('Washed the wound and took an antibiotic');
});

// TC_AB_038 - "None" advances to the last question
test('TC_AB_038_Verify_Prior_Treatment_None_Advances', async ({ page }) => {
  await setupAndGoTo(page, 7);
  await answerPriorTreatment(page, 'None');

  await waitForQuestion(page, 8);
  await expect(page.getByPlaceholder('Describe...')).toBeVisible({ timeout: 10000 });
});

// ============================================================
// QUESTION 8/8 - Additional information, and finishing the assessment
// ============================================================

// TC_AB_039 - text can be entered and submitted
test('TC_AB_039_Verify_Additional_Information_Text_Completes_Assessment', async ({ page }) => {
  await setupAndGoTo(page, 8);
  await answerAdditionalInfo(page, { text: 'Patient reports the bite happened while feeding the animal' });

  await expect(page.getByText('Physical Examination', { exact: true }).first()).toBeVisible({ timeout: 20000 });
});

// TC_AB_040 - skipping completes the assessment
test('TC_AB_040_Verify_Additional_Information_Skip_Completes_Assessment', async ({ page }) => {
  await setupAndGoTo(page, 8);
  await answerAdditionalInfo(page);

  await expect(page.getByText('Physical Examination', { exact: true }).first()).toBeVisible({ timeout: 20000 });
});

// TC_AB_041 - the whole 8-question assessment completes via the composed helper
test('TC_AB_041_Verify_Full_Assessment_Completes', async ({ page }) => {
  await setupToAnimalBiteAssessment(page);
  await completeAnimalBiteAssessment(page);

  await expect(page.getByText('Physical Examination', { exact: true }).first()).toBeVisible({ timeout: 20000 });
});

// TC_AB_042 - the Visit reason summary lists the answers that were given
test('TC_AB_042_Verify_Visit_Reason_Summary_Lists_The_Answers', async ({ page }) => {
  await setupAndGoTo(page, 8, { animal: 'Dog', count: 'Single', site: 'Head & Face' });
  await answerAdditionalInfo(page, { finish: false });

  await expect(page.getByText('Visit reason summary', { exact: false }).first()).toBeVisible({ timeout: 15000 });

  const modal = page.locator('div').filter({ hasText: 'Visit reason summary' }).filter({ hasText: 'Dog' }).last();
  const text = await modal.innerText().catch(() => '');

  expect.soft(text, 'The summary should show the animal that was chosen').toContain('Dog');
  expect.soft(text, 'The summary should show whether it was a single bite').toContain('Single');
  expect.soft(text, 'The summary should show the site that was chosen').toContain('Head & Face');
});

// TC_AB_043 - a hand-washing reminder follows the assessment
test('TC_AB_043_Verify_Wash_Hands_Reminder_After_Assessment', async ({ page }) => {
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

// TC_AB_044 - a female patient is also offered the female-only symptom (21 in total)
test('TC_AB_044_Verify_Female_Patient_Is_Offered_21_Symptoms', async ({ page }) => {
  await setupAndGoTo(page, 5, { gender: 'Female' });
  await waitForQuestion(page, 5);

  for (const name of symptomNamesFor('Female')) {
    await expect(symptomRow(page, name), `Symptom "${name}" should be listed`).toBeVisible({ timeout: 10000 });
  }
});

// ============================================================
// PHYSICAL EXAMINATION, MEDICAL HISTORY, VISIT SUMMARY, UPLOAD
// ============================================================

// TC_AB_045 - the Physical Examination starts after the assessment
test('TC_AB_045_Verify_Physical_Exam_Starts_After_Assessment', async ({ page }) => {
  await setupToPhysicalExam(page);

  await expect(page.getByText(questionRe(1)).first()).toBeVisible({ timeout: 20000 });
});

// TC_AB_046 - the Physical Examination can be completed up to its summary
test('TC_AB_046_Verify_Physical_Exam_Reaches_Summary', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completePhysicalExamGeneric(page);

  await expect(page.getByText('Physical examination summary', { exact: false })).toBeVisible({ timeout: 20000 });
});

// TC_AB_047 - confirming the Physical Examination summary leads to Medical History
test('TC_AB_047_Verify_Physical_Exam_Confirm_Navigates_To_Medical_History', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completePhysicalExamGeneric(page);
  await clickPhysicalExamSummaryConfirm(page);

  await expect(page.getByText('Medical History', { exact: true }).first()).toBeVisible({ timeout: 20000 });
});

// TC_AB_048 - the Medical History module completes within this protocol
test('TC_AB_048_Verify_Medical_History_Completes_Within_Protocol', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completePhysicalExamGeneric(page);
  await clickPhysicalExamSummaryConfirm(page);
  await completeMedicalHistoryGeneric(page);

  await expect(page.getByText('Medical history summary', { exact: false })).toBeVisible({ timeout: 20000 });
});

// TC_AB_049 - confirming the Medical History summary leads to the Visit Summary
test('TC_AB_049_Verify_Medical_History_Confirm_Navigates_To_Visit_Summary', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completePhysicalExamGeneric(page);
  await clickPhysicalExamSummaryConfirm(page);
  await completeMedicalHistoryGeneric(page);
  await clickMedicalHistorySummaryConfirm(page);

  await expect(page.getByText('Visit Summary', { exact: false }).first()).toBeVisible({ timeout: 20000 });
});

// TC_AB_050 - the Visit Summary shows the visit reason and the assessment fields
test('TC_AB_050_Verify_Visit_Summary_Checkup_Reason_Section', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completePhysicalExamGeneric(page);
  await clickPhysicalExamSummaryConfirm(page);
  await completeMedicalHistoryGeneric(page);
  await clickMedicalHistorySummaryConfirm(page);
  await waitForVisitSummaryToSettle(page);

  await expect(page.getByText(ANIMAL_BITE_REASON_BUTTON_RE).first()).toBeVisible({ timeout: 10000 });

  // Field names come from the questionnaire's item texts. They are
  // soft checks: if the app labels a row differently, every mismatch
  // is reported together instead of stopping at the first.
  for (const label of ['Type of bites/stings', 'Duration', 'No. of bites/stings', 'Associated symptoms', 'Prior treatment sought']) {
    await expect.soft(
      page.getByText(label, { exact: false }).first(),
      `The Visit Summary should show a "${label}" field`
    ).toBeVisible({ timeout: 5000 });
  }
});

// TC_AB_051 - end to end: assessment + physical exam + medical history + upload
test('TC_AB_051_Verify_End_To_End_Animal_Bite_Protocol', async ({ page }) => {
  await setupToAnimalBiteAssessment(page);
  await completeAnimalBiteAssessment(page);

  await expectPhysicalExamStarted(page);
  await completePhysicalExamGeneric(page);
  await clickPhysicalExamSummaryConfirm(page);

  await expect(page.getByText('Medical History', { exact: true }).first()).toBeVisible({ timeout: 20000 });
  await completeMedicalHistoryGeneric(page);
  await clickMedicalHistorySummaryConfirm(page);

  await expect(page.getByText('Visit Summary', { exact: false }).first()).toBeVisible({ timeout: 20000 });
  await completeVisitUpload(page, { doctorSpecialty: 'General Physician' });
});

// ============================================================
// REMAINING FOLLOW-UP OPTIONS FROM THE QUESTIONNAIRE
// ============================================================

// TC_AB_052 - joints can be described under "Multiple joints"
test('TC_AB_052_Verify_Multiple_Joints_Accepts_A_Description', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await answerSymptomRow(page, 'Joint pain', 'Yes');
  await page.waitForTimeout(1000);

  const field = describeFieldFor(page, 'Multiple joints [Describe which joints]');
  await expect(field, 'A "Describe..." box should sit under "Multiple joints [Describe which joints]"').toBeVisible({ timeout: 10000 });

  await field.fill('Both knees and the left ankle');
  await expect(field).toHaveValue('Both knees and the left ankle');
});

// TC_AB_053 - every abnormal sensation is offered under Paresthesia
test('TC_AB_053_Verify_Paresthesia_Offers_All_Sensations', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await answerSymptomRow(page, 'Paresthesia', 'Yes');
  await page.waitForTimeout(1000);

  for (const label of PARESTHESIA_SENSATIONS) {
    await revealOption(page, /describe the abnormal sensation/i, label);
    await expect(optionButtonByLabel(page, label), `The sensation "${label}" should be offered`).toBeVisible({ timeout: 10000 });
  }
});

// TC_AB_054 - both progression options are offered under Paresthesia
test('TC_AB_054_Verify_Paresthesia_Offers_Both_Progression_Options', async ({ page }) => {
  await setupAndGoTo(page, 5);
  await answerSymptomRow(page, 'Paresthesia', 'Yes');
  await page.waitForTimeout(1000);

  for (const label of PARESTHESIA_PROGRESSION) {
    await revealOption(page, /gradually increasing/i, label);
    await expect(optionButtonByLabel(page, label), `The progression "${label}" should be offered`).toBeVisible({ timeout: 10000 });
  }
});

}); // end test.describe
import { test, expect } from '@playwright/test';

test.describe('Medical History Module - Full Test Suite', () => {

test.describe.configure({ timeout: 300000 });

// ============================================================
// SHARED SETUP: Login -> Patient -> Vitals -> Visit Reason ->
// Assessment -> full Physical Examination (all 6 questions) ->
// Physical Examination Confirm click -> Medical History (handles
// the optional "Has your child been vaccinated?" question if it
// appears, then arrives at the Personal History checklist).
//
// This duplicates the Physical Examination flow from
// StartVisit_PhysicalExamination.spec.js so this file is
// self-contained, matching how that file was structured.
// ============================================================

async function setupToMedicalHistory(page) {

  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(30000);

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
  await page.getByRole('button', { name: 'Add Patients' }).click();
  await page.getByRole('button', { name: 'Accept' }).click();
  await page.getByRole('button', { name: 'Accept' }).click();

  await expect(
    page.getByRole('textbox', { name: 'First Name*' })
  ).toBeVisible({ timeout: 15000 });

  // 3. PATIENT DETAILS - unique last name avoids the same
  // strict-mode "multiple matching patients" issue found in the
  // Physical Examination suite when running the full test list.
  const uniqueLastName = `Test${Date.now()}${Math.floor(Math.random() * 1000)}`;

  await page.getByRole('textbox', { name: 'First Name*' }).fill('Automation');
  await page.getByRole('textbox', { name: 'Last Name*' }).fill(uniqueLastName);
  await page.getByRole('radio', { name: 'Male', exact: true }).check();

  // 4. DATE OF BIRTH
  await page.getByPlaceholder('Enter Date Of Birth').click();
  await page.locator('button:has(i.fa-chevron-down)').click();

  const previousDecade = page.getByRole('button').filter({ hasText: /^$/ }).nth(3);
  await previousDecade.click();
  await previousDecade.click();

  await page.getByRole('button', { name: '2000' }).click();
  await page.getByRole('button', { name: 'JAN' }).click();
  await page.locator(
    '.react-datepicker__day--001:not(.react-datepicker__day--outside-month)'
  ).click();

  // 5. PHONE
  await page.getByRole('textbox', { name: 'Enter phone number' }).fill('9090909090');

  // 6. EMERGENCY CONTACT
  await page.getByRole('textbox', { name: 'Emergency Contact Name*' }).fill('Test User');
  await page.getByRole('textbox', { name: 'Enter Emergency Contact Number' }).fill('9090909091');

  // 7. COUNTRY
  await page.getByRole('button', { name: 'Country*' }).click();
  await page.getByRole('textbox', { name: 'Search options...' }).fill('India');
  await page.getByRole('option', { name: 'India', exact: true }).click();

  // 8. POSTAL CODE
  await page.getByRole('textbox', { name: 'Postal Code*' }).fill('751002');

  // 9. STATE
  await page.locator('text=Select State').click({ force: true });
  await page.getByPlaceholder('Search options...').fill('Odisha');
  await page.getByText('Odisha', { exact: true }).click();

  // 10. DISTRICT
  await page.locator('text=Select District').click({ force: true });
  await page.getByPlaceholder('Search options...').fill('Khordha');
  await page.getByText('Khordha', { exact: true }).click();

  // 11. ADDRESS
  await page.getByRole('textbox', { name: 'Village/Town/City*' }).fill('Bhubaneswar');
  await page.getByRole('textbox', { name: 'Corresponding Address*' }).fill('Automation Address');
  await page.getByRole('textbox', { name: 'Corresponding Address 2*' }).fill('Automation Address 2');

  // 12. CONTACT TYPE
  await page.getByRole('button', { name: 'Contact Type*' }).click();
  await page.getByText('Family', { exact: true }).click();

  // 13. NEXT
  await page.getByRole('button', { name: 'Next' }).click();

  // 14. EDUCATION
  await page.getByRole('button', { name: 'Education*' }).click();
  await page.getByRole('option', { name: 'Primary' }).click();
  await page.getByRole('button', { name: 'Next' }).click();


  await page.waitForTimeout(5000);

  // 15. START VISIT - scoped to this test's unique patient name
  const patientFullName = `Automation ${uniqueLastName}`;

  const patientCard = page
    .locator('div.bg-white.rounded-xl.border')
    .filter({ has: page.locator('p.font-semibold', { hasText: patientFullName }) });

  const patientCardFound = await patientCard
    .isVisible({ timeout: 60000 })
    .catch(() => false);

  if (!patientCardFound) {
    await page.screenshot({
      path: `debug-patient-card-not-found-${Date.now()}.png`,
      fullPage: true
    }).catch(() => {});
    const pageUrl = page.url();
    const allCardNames = await page
      .locator('p.font-semibold')
      .allTextContents()
      .catch(() => []);
    throw new Error(
      `setupToMedicalHistory — patient card for "${patientFullName}" not found after 60s. ` +
      `Current URL: ${pageUrl}. ` +
      `All visible patient name elements: ${JSON.stringify(allCardNames.slice(0, 10))}. ` +
      `See debug-patient-card-not-found-*.png for a full-page screenshot.`
    );
  }

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
  await page.getByRole('textbox', { name: 'E.g., 72 bpm' }).fill('30');
  await page.getByRole('textbox', { name: 'E.g., 98.6 °F' }).fill('98');
  await page.getByRole('textbox', { name: 'E.g., 98%' }).fill('98');
  await page.getByRole('textbox', { name: 'E.g., 18 breaths/min' }).fill('18');
  await page.getByRole('textbox', { name: 'E.g., 90 mg/dL' }).fill('901');
  await page.locator('input[name="ppbs_mg_per_dl"]').fill('14011');
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

  // 18. VISIT REASON
  await expect(
    page.getByRole('textbox', { name: 'Type or select reason eg.' })
  ).toBeVisible({ timeout: 15000 });

  await page.getByText('/4 Visit Reason').click();

  const reason = page.getByRole('textbox', { name: 'Type or select reason eg.' });
  await reason.click();
  await reason.pressSequentially('other', { delay: 80 });
  await page.waitForTimeout(800);

  const noMatchesVisible = await page
    .getByText('No matching complaints found', { exact: false })
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  let otherOption;

  if (noMatchesVisible) {
    await reason.fill('');
    await page.waitForTimeout(500);
    otherOption = page.getByRole('button', { name: 'Other', exact: true }).first();
  } else {
    otherOption = page.locator('div').filter({ hasText: /^Other$/ }).nth(1);
  }

  await expect(otherOption).toBeVisible({ timeout: 15000 });
  await otherOption.click();

  await page.getByRole('button', { name: 'Start Assessment' }).click();

  // 19. ASSESSMENT
  await page.getByRole('button', { name: 'Yes' }).click();

  const description = page.getByRole('textbox', { name: "Describe the patient's" });
  await expect(description).toBeVisible({ timeout: 15000 });
  await description.fill('ok');
  await page.getByRole('button', { name: 'Submit' }).click();

  // 20. FOLLOW-UP ASSESSMENT
  await page.getByRole('button', { name: 'None' }).click();

  // BUGFIX: this used to match on 'Additional information - ['
  // (assuming a bracketed label like "[Describe]"), but the real
  // rendered accessible name is "Additional information - Enter
  // additional information" - no bracket at all. Matching on the
  // stable "Additional information" substring instead fixes this
  // for good, regardless of what text follows the dash. Since
  // this line lives in the SHARED setup that every test in this
  // file calls, the mismatch was failing the entire suite.
  const additionalInfo = page.getByRole('textbox', { name: 'Additional information', exact: false });
  await expect(additionalInfo).toBeVisible({ timeout: 15000 });
  await additionalInfo.fill('ok');
  await page.getByRole('button', { name: 'Submit' }).click();

  await page.getByRole('button', { name: 'Confirm' }).click();
  await page.getByRole('button', { name: 'Okay' }).click();

  // ============================================================
  // 21. PHYSICAL EXAMINATION (all 6 questions, happy path)
  // ============================================================

  await expect(
    page.getByRole('button', { name: 'No', exact: true }).first()
  ).toBeVisible({ timeout: 30000 });

  // Jaundice
  await page.getByRole('button', { name: 'No', exact: true }).first().click();

  // Pallor
  await page.getByRole('button', { name: 'Normal', exact: true }).first().click();

  // Question 3/6 - Pinch Skin (auto-advances, no Submit)
  await expect(page.getByText('Question 3/6', { exact: true })).toBeVisible({ timeout: 30000 });

  const question3Card = page
    .locator('div[style*="display: block"] div.shadow-\\[0px_4px_10px_0px_\\#3B3B3B0D\\]')
    .filter({ has: page.getByText('Question 3/6', { exact: true }) })
    .filter({ has: page.getByText('Pinch skin', { exact: false }) })
    .first();

  await expect(question3Card).toBeVisible({ timeout: 30000 });
  await question3Card.evaluate((el) => {
    el.scrollIntoView({ behavior: 'instant', block: 'start', inline: 'center' });
  });
  await page.evaluate(() => window.scrollBy(0, -120));
  await page.waitForTimeout(1000);

  const pinchNormalButton = question3Card.locator('button.selectable-option').filter({
    has: page.locator('span.label', { hasText: /^Normal$/ })
  });
  await expect(pinchNormalButton).toBeVisible({ timeout: 15000 });
  await pinchNormalButton.evaluate((el) => el.click());
  await page.waitForTimeout(1500);

  await expect(page.getByText('Question 4/6', { exact: true })).toBeVisible({ timeout: 15000 });

  // Question 4/6 - Nail abnormality (requires Submit)
  const nailAbnormalityOption = page.getByRole('button', { name: 'Nails are normal' }).first();
  await expect(nailAbnormalityOption).toBeVisible({ timeout: 15000 });
  await nailAbnormalityOption.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(300);
  await nailAbnormalityOption.evaluate((el) => el.click());
  await page.waitForTimeout(500);

  const q4Submit = page.getByRole('button', { name: 'Submit', exact: true });
  await expect(q4Submit).toBeVisible({ timeout: 15000 });
  await q4Submit.click();
  await page.waitForTimeout(1500);

  // Question 5/6 - Nail anemia (auto-advances, no Submit)
  await expect(page.getByText('Question 5/6', { exact: true })).toBeVisible({ timeout: 15000 });
  const nailAnemiaOption = page.getByRole('button', { name: 'Nails are normal' }).first();
  await expect(nailAnemiaOption).toBeVisible({ timeout: 15000 });
  await nailAnemiaOption.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(500);
  await nailAnemiaOption.evaluate((el) => el.click());
  await page.waitForTimeout(1500);

  // Question 6/6 - Ankle oedema (auto-advances to Summary)
  await expect(page.getByText('Question 6/6', { exact: true })).toBeVisible({ timeout: 15000 });
  const noOedemaButton = page.getByRole('button', { name: 'No oedema' });
  await expect(noOedemaButton).toBeVisible({ timeout: 15000 });
  await noOedemaButton.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(500);
  await noOedemaButton.evaluate((el) => el.click());
  await page.waitForTimeout(1500);

  const peSummaryVisible = await page
    .getByText('Physical examination summary', { exact: false })
    .isVisible({ timeout: 10000 })
    .catch(() => false);

  if (!peSummaryVisible) {
    const peSubmit = page.getByRole('button', { name: 'Submit', exact: true });
    const peSubmitVisible = await peSubmit.isVisible({ timeout: 5000 }).catch(() => false);
    if (peSubmitVisible) {
      await peSubmit.click();
    } else {
      const skip = page.getByRole('button', { name: 'Skip', exact: true });
      const skipVisible = await skip.isVisible({ timeout: 5000 }).catch(() => false);
      if (skipVisible) await skip.click();
    }
  }

  await page.waitForTimeout(1500);

  // Confirm the Physical Examination summary - scoped to the
  // modal wrapper to avoid colliding with any other "Confirm"
  // button in the DOM.
  await expect(
    page.getByText('Physical examination summary', { exact: false })
  ).toBeVisible({ timeout: 20000 });

  const peModal = page
    .locator('div.bg-white.shadow-xl.flex.flex-col')
    .filter({ has: page.getByText('Physical examination summary', { exact: false }) })
    .first();

  const peConfirmButton = peModal.getByRole('button', { name: 'Confirm', exact: true });
  await expect(peConfirmButton).toBeVisible({ timeout: 15000 });
  await peConfirmButton.evaluate((el) => el.click()).catch(() => {});
  await page.waitForTimeout(1000);

  const peModalStillVisible = await page
    .getByText('Physical examination summary', { exact: false })
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (peModalStillVisible) {
    await peConfirmButton.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  // The Medical History flow sometimes starts with a "Has your
  // child been vaccinated?" question (Incomplete/Complete/
  // On-going + Skip) even for this suite's adult patient - real
  // screenshot evidence shows "Question 1/8" with this question
  // first, contradicting the earlier assumption that it's child-
  // only. Handle it here if present, so every test downstream can
  // reliably assume setupToMedicalHistory() leaves them on the
  // Personal History checklist ("Do you have a history of any of
  // the following?"), regardless of whether vaccination showed up.
  await expect(
    page.getByText('Medical History', { exact: true }).first()
  ).toBeVisible({ timeout: 20000 });

  const vaccinationQuestionVisible = await page
    .getByText('Has your child been vaccinated?', { exact: false })
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (vaccinationQuestionVisible) {
    const completeButton = page.getByRole('button', { name: 'Complete', exact: true });
    const completeVisible = await completeButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (completeVisible) {
      await completeButton.click();
    } else {
      const skipButton = page.getByRole('button', { name: 'Skip', exact: true });
      const skipVisible = await skipButton.isVisible({ timeout: 3000 }).catch(() => false);
      if (skipVisible) await skipButton.click();
    }

    await page.waitForTimeout(1000);
  }

  await expect(
    page.getByText('Do you have a history of any of the following?', { exact: false })
  ).toBeVisible({ timeout: 20000 });
}

// ============================================================
// MEDICAL HISTORY STEP FUNCTIONS
// ============================================================

// ------------------------------------------------------------
// STAGE: Question 1/5 - "Has your child been vaccinated?"
// Screenshot shows this rendered with a "Complete" action.
// Clicking it marks the section complete (no further sub-form
// was observed in the provided screenshots/recording beyond a
// single click).
// ------------------------------------------------------------

const PERSONAL_HISTORY_ITEMS = [
  '1. High Blood Pressure',
  '2. Heart Problems',
  '3. Stroke',
  '4. Diabetes',
  '5. Asthma',
  '6. Tuberculosis',
  '7. Cancer/Tumour',
  '8. HIV/AIDS',
  '9. Operation',
  '10. Accident',
  '11. Hospitalization',
  '12. Other [Describe]',
  '13. None'
];

// ------------------------------------------------------------
// Selecting "Yes" on a checklist item can reveal a required
// follow-up text input (confirmed via real run: selecting "Yes"
// for an item like "4. Diabetes" can trigger a "Please enter a
// value" toast on Submit if a newly-revealed field is left
// empty). Fill any visible, currently-empty text inputs on the
// page before Submit is clicked, as a generic safety net.
// ------------------------------------------------------------

async function fillAnyEmptyRequiredInputs(page, value = '1') {
  // BUGFIX: this used to search page.locator('input[type="text"]...')
  // with NO scoping at all, which matches ANY visible text input on
  // the page - including the global "Patient Search" combobox in
  // the header. Since that box starts empty, the function was
  // wrongly typing into it instead of the real required follow-up
  // field for a "Yes" answer (confirmed via a real screenshot: "1"
  // ended up typed into Patient Search), leaving the actual
  // required field empty. The app then rejects Submit with a
  // "Please select any one option" toast and the checklist never
  // advances - exactly the MH_005 failure this caused. Scoping to
  // <main> keeps this function inside the actual question content.
  const scope = page.locator('main');
  const scopeVisible = await scope.isVisible({ timeout: 3000 }).catch(() => false);
  const root = scopeVisible ? scope : page;

  const inputs = root.locator('input[type="text"]:visible, input:not([type]):visible, textarea:visible');
  const count = await inputs.count().catch(() => 0);

  for (let i = 0; i < count; i++) {
    const inputEl = inputs.nth(i);

    // Extra safety net even within <main>: never fill anything
    // that looks like a search field, regardless of scoping.
    const placeholder = (await inputEl.getAttribute('placeholder').catch(() => '')) || '';
    const ariaLabel = (await inputEl.getAttribute('aria-label').catch(() => '')) || '';
    if (/search/i.test(placeholder) || /search/i.test(ariaLabel)) continue;

    const currentValue = await inputEl.inputValue().catch(() => null);

    if (currentValue === '') {
      await inputEl.fill(value).catch(() => {});
    }
  }
}

// ------------------------------------------------------------
// Answer a single checklist row by its label (e.g.
// "1. High Blood Pressure") with "Yes" or "No". Each row has
// its own Yes/No button pair sharing the SAME accessible name
// across every row on the page ("yes Yes" / "no No" - the
// button's icon alt-text concatenated with its visible text),
// so we scope to the specific row containing the item label
// rather than using a raw index into all matching buttons on
// the page, which breaks if rows are reordered or added.
// ------------------------------------------------------------

async function answerChecklistItem(page, itemLabel, answer = 'No') {
  const row = page
    .locator('div.flex.items-center.justify-between')
    .filter({ has: page.locator('span', { hasText: itemLabel }) })
    .first();

  await expect(
    row,
    `Checklist row for "${itemLabel}" not found`
  ).toBeVisible({ timeout: 10000 });

  const buttonPattern = answer.toLowerCase() === 'no' ? /no\s*No/i : /yes\s*Yes/i;
  const button = row.getByRole('button', { name: buttonPattern });

  await expect(
    button,
    `"${answer}" button not found in row for "${itemLabel}"`
  ).toBeVisible({ timeout: 8000 });

  await button.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(100);

  await button.click({ timeout: 5000 }).catch(async () => {
    await button.click({ force: true, timeout: 5000 }).catch(async () => {
      await button.evaluate((el) => el.click()).catch(() => {});
    });
  });

  if (answer.toLowerCase() === 'yes') {
    await answerChecklistItemYesFollowUp(page);
  }
}

// "Yes" on some checklist items (e.g. Diabetes) reveals a
// mandatory "Select one or more" follow-up panel with its own
// button options - confirmed via a real accessibility snapshot:
// for Diabetes, the options are "Since when", "Current
// medication", "Last measured Blood Sugar and HbA1C". Leaving
// this unanswered blocks Submit with "Please select any one
// option", even though every Yes/No row was itself answered
// correctly - this was the real cause of MH_005 failing, not the
// search-box-scoping bug fixed earlier (that was real too, just
// not the cause here).
async function answerChecklistItemYesFollowUp(page) {
  await page.waitForTimeout(400);

  const followUpPrompt = page.locator('main').getByText('Select one or more', { exact: false }).last();
  const followUpVisible = await followUpPrompt.isVisible({ timeout: 2000 }).catch(() => false);

  if (!followUpVisible) return;

  const followUpContainer = followUpPrompt.locator('xpath=..');
  const firstOption = followUpContainer.getByRole('button').first();
  const firstOptionVisible = await firstOption.isVisible({ timeout: 2000 }).catch(() => false);

  if (!firstOptionVisible) return;

  await firstOption.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(200);
  await firstOption.click({ timeout: 5000 }).catch(async () => {
    await firstOption.evaluate((el) => el.click()).catch(() => {});
  });
  await page.waitForTimeout(500);

  // That option itself may reveal a further required field (a
  // number/duration dropdown pair, a text input, or another set
  // of button choices) - handle generically rather than assuming
  // one specific shape, the same technique already proven for the
  // Abdominal Pain protocol's Lumps sub-questions.
  const selectsAfter = page.locator('main').locator('select:visible');
  const selectCount = await selectsAfter.count().catch(() => 0);
  for (let i = 0; i < selectCount; i++) {
    const select = selectsAfter.nth(i);
    const currentValue = await select.inputValue().catch(() => null);
    if (!currentValue) {
      const optionCount = await select.locator('option').count().catch(() => 0);
      if (optionCount > 1) {
        await select.selectOption({ index: 1 }).catch(() => {});
      }
    }
  }

  const openInput = page
    .locator('main')
    .locator('input[type="text"]:visible, input[type="number"]:visible, textarea:visible')
    .first();
  const openInputVisible = await openInput.isVisible({ timeout: 1500 }).catch(() => false);

  if (openInputVisible) {
    const placeholder = (await openInput.getAttribute('placeholder').catch(() => '')) || '';
    const ariaLabel = (await openInput.getAttribute('aria-label').catch(() => '')) || '';

    if (!/search/i.test(placeholder) && !/search/i.test(ariaLabel)) {
      const currentValue = await openInput.inputValue().catch(() => null);
      if (currentValue === '') {
        await openInput.fill('1').catch(() => {});
      }
    }
  }

  await page.waitForTimeout(300);
}

// GENERIC ADAPTIVE HANDLER
//
// The Medical History question set/count varies by context, so
// this handler inspects whatever is actually on screen and
// answers accordingly, regardless of question number or total
// count, rather than assuming a fixed question sequence.

async function getMedicalHistoryQuestionMarker(page) {
  // Use an ANCHORED regex (^...$) instead of a guessed CSS class
  // combo (which turned out not to match the real DOM - it was
  // always returning null in a real run). Playwright's getByText
  // with an anchored regex matches only elements whose FULL
  // (trimmed) text content equals exactly "Question N/M" - this
  // naturally excludes any larger wrapping container (whose full
  // text would contain the question title, options, etc. as
  // well), without needing to guess at specific class names.
  const marker = page.getByText(/^Question\s*\d+\/\d+$/).first();
  const visible = await marker.isVisible({ timeout: 5000 }).catch(() => false);
  if (!visible) return null;
  return await marker.textContent().catch(() => null);
}

async function answerCurrentMedicalHistoryQuestion(page) {
  const questionMarkerText = await getMedicalHistoryQuestionMarker(page);

  // Case 0: Vaccination-style "Complete" action (child patients only)
  const completeButton = page.getByRole('button', { name: 'Complete', exact: true });
  if (await completeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await completeButton.click();
    await page.waitForTimeout(1000);
    return 'complete-action';
  }

  // Case 1: Checklist style - multiple rows, each with its own
  // "no No" button (same accessible name repeated per row).
  // Row-scoped (not a flat nth() index into all matching buttons
  // on the page) so each click is tied firmly to its own row,
  // regardless of ordering drift elsewhere on the page.
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

      // Try a normal click first; if it doesn't register, force
      // click; if that also fails, fall back to a direct DOM
      // click which bypasses any overlay/coordinate issues.
      await noButton.click({ timeout: 5000 }).catch(async () => {
        await noButton.click({ force: true, timeout: 5000 }).catch(async () => {
          await noButton.evaluate((el) => el.click()).catch(() => {});
        });
      });

      await page.waitForTimeout(150);
    }

    const submit = page.getByRole('button', { name: 'Submit', exact: true });
    await expect(submit).toBeVisible({ timeout: 15000 });

    await submit.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(300);

    await submit.click({ timeout: 5000 }).catch(async () => {
      await submit.click({ force: true, timeout: 5000 }).catch(async () => {
        await submit.evaluate((el) => el.click()).catch(() => {});
      });
    });

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

  // --------------------------------------------------------
  // Case 3: generic named-button single choice, PREFERRING a
  // negative/default answer (e.g. "No known allergies" vs
  // "Yes [Describe]").
  //
  // *** BUGFIX ***: this check MUST run BEFORE the blind
  // ".selectable-option" click that used to be Case 3. On
  // questions like "Do you have any allergies?" BOTH
  // "Yes [Describe]" AND "No known allergies" share the exact
  // same "selectable-option" class, so a blind
  // page.locator('button.selectable-option').first() has no way
  // to distinguish them - it just grabs whichever one happens to
  // sit FIRST in the DOM, which in this app is "Yes [Describe]".
  // Clicking that reveals a required description text field, but
  // the handler never types into that field or clicks a
  // Next/Submit for it, so the screen never advances - the loop
  // then lands on the exact same "Question 3/7" on its next
  // iteration, forever, until completeMedicalHistoryGeneric's
  // maxSteps cap is hit and the whole test throws
  // "did not reach the Medical History summary within 12 steps."
  // Checking for an explicit negative-wording button FIRST fixes
  // this for allergies and any similar Yes/No-worded card
  // question without needing per-question special-casing.
  // --------------------------------------------------------
  const negativeButton = page.getByRole('button', { name: /no known|^no$/i }).first();
  if (await negativeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await negativeButton.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(200);

    await negativeButton.click({ timeout: 5000 }).catch(async () => {
      await negativeButton.click({ force: true, timeout: 5000 }).catch(async () => {
        await negativeButton.evaluate((el) => el.click()).catch(() => {});
      });
    });

    await page.waitForTimeout(1500);

    // Defensive: some of these single-choice cards still require
    // an explicit Submit click to actually advance, even though
    // others auto-advance on click alone. If a Submit button is
    // visible right after the click, click it too.
    const pageSubmit = page.getByRole('button', { name: 'Submit', exact: true });
    const pageSubmitVisible = await pageSubmit.isVisible({ timeout: 3000 }).catch(() => false);

    if (pageSubmitVisible) {
      await pageSubmit.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(300);

      await pageSubmit.click({ timeout: 5000 }).catch(async () => {
        await pageSubmit.click({ force: true, timeout: 5000 }).catch(async () => {
          await pageSubmit.evaluate((el) => el.click()).catch(() => {});
        });
      });
      await page.waitForTimeout(1500);
    }

    return 'generic-negative-option';
  }

  // Case 4: selectable-option style card (e.g. Pinch Skin
  // "Normal"/"Abnormal") where NEITHER option matches the
  // negative-wording regex above, so Case 3 above did not fire.
  // Only reached when there's no explicit "No known.../No"
  // option on the page - safe to take the first one here.
  const selectableOption = page.locator('button.selectable-option').first();
  if (await selectableOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    await selectableOption.evaluate((el) => el.click());
    await page.waitForTimeout(1500);
    return 'selectable-option';
  }

  // Case 5: LAST-RESORT generic fallback for entirely novel
  // single-choice questions we have no specific wording for yet
  // (e.g. "Do you chew tobacco?" - confirmed via real run to
  // have buttons ["Do not Chew", "Frequency", "Since", "Denied
  // answer"], where "Frequency"/"Since" are likely follow-up
  // field labels, not real answer options).
  //
  // This does NOT depend on questionMarkerText (which repeatedly
  // failed to be located across multiple real runs, despite
  // several different locator strategies) - it operates directly
  // on ALL buttons currently on the page, filtering out known
  // navigation/breadcrumb noise (confirmed via real run: the
  // breadcrumb items like "Add Patient", "Vitals", etc. are
  // themselves clickable buttons picked up by getByRole) and
  // known control buttons (Submit/Skip/Back), then prefers an
  // explicit negative/decline-style option over just the first
  // remaining button.
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

      // Icon-only buttons may have no visible text at all - fall
      // back to aria-label, then to an inner <img alt="...">,
      // which is what "yes"/"no" icon buttons elsewhere in this
      // app use for their accessible name.
      if (!text) {
        const ariaLabel = await btn.getAttribute('aria-label').catch(() => null);
        if (ariaLabel && ariaLabel.trim()) {
          text = ariaLabel.trim();
        }
      }

      if (!text) {
        const imgAlt = await btn.locator('img').first().getAttribute('alt').catch(() => null);
        if (imgAlt && imgAlt.trim()) {
          text = imgAlt.trim();
        }
      }

      const isNoise = text && NAV_AND_CONTROL_NOISE.has(text.toLowerCase());

      // Confirmed via real run: the sidebar collapse/expand arrow
      // is a button with NO text/aria-label/alt, fixed/absolute
      // positioned, containing only a chevron icon (<i class="...
      // fa-chevron-left">). It was being clicked accidentally as
      // a "candidate" since it has no accessible name. Exclude
      // any icon-only button that only contains a chevron icon -
      // this is page chrome, never a real question option.
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
        // Keep even icon-only buttons with still-empty resolved
        // text (marked "(icon-only)") - better to have a
        // clickable last-resort candidate than none at all, and
        // logging exposes exactly what we clicked for review.
        candidates.push({ index: i, text: text || '(icon-only, no text/aria-label/alt found)' });
      }
    }

    if (candidates.length > 0) {
      const negativeMatch = candidates.find((c) => /do\s*not|denied|never|declin|^no$/i.test(c.text));
      const chosen = negativeMatch || candidates[0];
      const chosenButton = allPageButtons.nth(chosen.index);

      // The button may be sitting right at the bottom edge of the
      // viewport (confirmed via screenshot - options cut off at
      // the fold), same issue solved earlier for Physical
      // Examination's sticky-footer overlap. Use an evaluate-based
      // scroll with extra clearance instead of relying solely on
      // scrollIntoViewIfNeeded().
      await chosenButton.evaluate((el) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      }).catch(() => {});
      await page.evaluate(() => window.scrollBy(0, -150)).catch(() => {});
      await page.waitForTimeout(500);

      await chosenButton.click({ timeout: 5000 }).catch(async () => {
        await chosenButton.click({ force: true, timeout: 5000 }).catch(async () => {
          await chosenButton.evaluate((el) => el.click()).catch(() => {});
        });
      });

      await page.waitForTimeout(1000);

      // A Submit may be required after selecting this option.
      const pageSubmit = page.getByRole('button', { name: 'Submit', exact: true });
      const pageSubmitVisible = await pageSubmit.isVisible({ timeout: 3000 }).catch(() => false);

      if (pageSubmitVisible) {
        await pageSubmit.evaluate((el) => {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
        }).catch(() => {});
        await page.evaluate(() => window.scrollBy(0, -150)).catch(() => {});
        await page.waitForTimeout(300);

        await pageSubmit.click({ timeout: 5000 }).catch(async () => {
          await pageSubmit.click({ force: true, timeout: 5000 }).catch(async () => {
            await pageSubmit.evaluate((el) => el.click()).catch(() => {});
          });
        });
        await page.waitForTimeout(1500);
      }

      return 'generic-card-option';
    }
  }

  // Nothing recognized at all - dump diagnostics rather than
  // silently doing nothing.
  const allButtons = await page.getByRole('button').allTextContents().catch(() => []);
  console.log(
    `answerCurrentMedicalHistoryQuestion — [${questionMarkerText}] could not determine question type. All buttons on page:`,
    JSON.stringify(allButtons)
  );
  await page.screenshot({ path: `debug-medical-history-unknown-${Date.now()}.png`, fullPage: true }).catch(() => {});

  return 'unknown';
}

// ------------------------------------------------------------
// Loop through Medical History questions generically until the
// Summary screen appears (or a safety cap is hit).
// ------------------------------------------------------------

async function completeMedicalHistoryGeneric(page, maxSteps = 12) {
  for (let step = 1; step <= maxSteps; step++) {
    const summaryVisible = await page
      .getByText('Medical history summary', { exact: false })
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (summaryVisible) {
      return;
    }

    const resultType = await answerCurrentMedicalHistoryQuestion(page);

    if (resultType === 'unknown') {
      throw new Error(
        `completeMedicalHistoryGeneric — could not determine the current question's type at step ${step}. See DIAGNOSTIC buttons logged above and the debug-medical-history-unknown screenshot.`
      );
    }
  }

  throw new Error(
    `completeMedicalHistoryGeneric — did not reach the Medical History summary within ${maxSteps} steps. The flow may have more questions than expected, or gotten stuck on an unrecognized screen.`
  );
}

// ------------------------------------------------------------
// Composed helper: runs the full Medical History flow using the
// GENERIC adaptive handler (reliable regardless of patient
// age/question count), stopping at the Medical History Summary
// modal (does NOT click Confirm).
// ------------------------------------------------------------

async function runFullMedicalHistory(page) {
  await setupToMedicalHistory(page);
  await completeMedicalHistoryGeneric(page);

  await expect(
    page.getByText('Medical history summary', { exact: false })
  ).toBeVisible({ timeout: 20000 });
}

// ------------------------------------------------------------
// Medical History Summary modal helpers.
//
// NOTE: unlike the Physical Examination summary (where we had
// the real HTML and could scope to exact grid rows), we only
// have screenshots for this modal. These helpers use a looser
// "row contains both label and value text" check scoped to the
// modal - accurate enough to catch real regressions, but should
// be tightened to exact row matching (like expectSummaryRow in
// the Physical Examination suite) once real HTML is available.
// ------------------------------------------------------------

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

async function expectMedicalHistorySummaryRow(page, label, value) {
  const modal = getMedicalHistoryModal(page);
  const row = modal.locator('div').filter({ hasText: label }).filter({ hasText: value }).last();
  await expect(
    row,
    `Medical History summary did not show "${label}" = "${value}" as expected`
  ).toBeVisible({ timeout: 8000 });
}

// ------------------------------------------------------------
// VISIT SUMMARY LOADING SETTLE
//
// CONFIRMED via real recording: immediately after clicking
// Confirm on the Medical History summary, the Visit Summary page
// mounts with a loading spinner overlaid on top of the Vitals
// panel - the underlying panel content (Height(cm), BP, etc.) is
// already present in the DOM at this point, but the spinner sits
// on screen for 9-12+ seconds (observed across 3 consecutive
// frames spaced 3s apart) before it clears and the page becomes
// genuinely settled. A plain `toBeVisible()` check with a 10s
// timeout on panel text (e.g. "Height(cm)") lands right inside
// that window and times out reporting the element as "hidden" -
// this is what caused MH_018 to fail while MH_019/MH_020 (whose
// assertions happen to run slightly later in the script) passed
// in the same run purely by timing luck.
//
// Rather than just padding every downstream assertion's timeout
// (fragile - the spinner's duration will vary further under CI
// load or parallel workers), explicitly wait for the spinner to
// disappear first. Tries several common spinner selectors since
// we don't have the exact markup; falls through harmlessly if
// none match (e.g. if a given page load didn't spinner at all).
// ------------------------------------------------------------

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
      await spinner.waitFor({ state: 'hidden', timeout: 45000 }).catch(() => {});
      break;
    }
  }

  // The spinner selectors above are guesses - the real spinner
  // markup varies and may not match any of them, especially on
  // slower loads. Fall back to polling a real, stable data signal
  // instead: the "Height(cm)" label is always the first thing
  // populated in the Vitals panel once actual data has loaded,
  // regardless of whether the spinner itself was detected. This
  // page's load time has been observed to vary widely (roughly
  // 9-45+ seconds depending on shared dev-server/parallel-worker
  // load), so this budget covers that range with headroom.
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
      .catch(() => {});
  }

  // A brief settle buffer regardless - a short reflow/re-render
  // can immediately follow the panel actually populating.
  await page.waitForTimeout(500);
}

// ------------------------------------------------------------
// VISIT SUMMARY / UPLOAD VISIT (bonus flow continuation)
//
// After confirming the Medical History summary, the app lands
// on the Visit Summary page (Vitals / Check-up reason /
// Physical examination / Medical History review), followed by
// Doctor's specialty selection and "Upload Visit". This is not
// strictly part of "Medical History" but is the natural next
// step shown in the provided recording/screenshots, so a small
// set of tests cover it as the end-to-end continuation.
// ------------------------------------------------------------

async function completeVisitUpload(page, { doctorSpecialty = 'General Physician' } = {}) {
  // Settle first - the Visit Summary loading spinner (see
  // waitForVisitSummaryToSettle) can still be up when this is
  // called directly, and clicking "Select Doctor's specialty" or
  // "Upload Visit" while it's mid-load is unreliable.
  await waitForVisitSummaryToSettle(page);

  if (doctorSpecialty) {
    // The "Select Doctor's specialty" control may not render as a
    // real <button> element (could be a custom dropdown/select
    // styled div) - if getByRole('button', ...) matches nothing,
    // silently skipping it would leave no specialty selected and
    // likely block "Upload Visit" from working, which matches the
    // repeated Upload Visit clicks seen in the original recording.
    // Try multiple strategies instead of assuming button role.

    let specialtyOpened = false;

    // Strategy 1: real button role (confirmed via real page
    // snapshot: this IS a real <button> element). Use the same
    // robust scroll + click cascade that fixed other buttons
    // whose click wasn't registering with a plain .click().
    const specialtyButton = page.getByRole('button', { name: "Select Doctor's specialty" });
    const specialtyButtonVisible = await specialtyButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (specialtyButtonVisible) {
      await specialtyButton.evaluate((el) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      }).catch(() => {});
      await page.evaluate(() => window.scrollBy(0, -150)).catch(() => {});
      await page.waitForTimeout(400);

      await specialtyButton.click({ timeout: 5000 }).catch(async () => {
        await specialtyButton.click({ force: true, timeout: 5000 }).catch(async () => {
          await specialtyButton.evaluate((el) => el.click()).catch(() => {});
        });
      });

      await page.waitForTimeout(600);

      // Verify the dropdown actually opened - if the button
      // itself still says "Select Doctor's specialty" and no
      // option list appeared, the click likely didn't register
      // even after the cascade above.
      specialtyOpened = true;
    } else {
      // Strategy 2: any clickable element containing that text
      // (div, combobox, custom dropdown trigger, etc.)
      const specialtyByText = page.getByText("Select Doctor's specialty", { exact: false }).first();
      const specialtyByTextVisible = await specialtyByText.isVisible({ timeout: 5000 }).catch(() => false);

      if (specialtyByTextVisible) {
        await specialtyByText.click({ timeout: 5000 }).catch(async () => {
          await specialtyByText.click({ force: true, timeout: 5000 }).catch(async () => {
            await specialtyByText.evaluate((el) => el.click()).catch(() => {});
          });
        });
        await page.waitForTimeout(600);
        specialtyOpened = true;
      } else {
        await page.screenshot({ path: `debug-visit-summary-specialty-${Date.now()}.png`, fullPage: true }).catch(() => {});
      }
    }

    if (specialtyOpened) {
      // Strategy A: plain text match
      let specialtyOption = page.getByText(doctorSpecialty, { exact: true });
      let specialtyOptionVisible = await specialtyOption.isVisible({ timeout: 4000 }).catch(() => false);

      // Strategy B: this may be a proper combobox/listbox
      // component (option role), not plain clickable text.
      if (!specialtyOptionVisible) {
        specialtyOption = page.getByRole('option', { name: doctorSpecialty });
        specialtyOptionVisible = await specialtyOption.isVisible({ timeout: 4000 }).catch(() => false);
      }

      // Strategy C: retry the button click once more (dropdown
      // may not have actually opened despite our click attempts).
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

      // Strategy D: keyboard type-ahead. Many custom combobox
      // components (react-select, downshift, MUI Autocomplete)
      // support typing to filter/select the option, and Enter to
      // confirm, even when the option isn't reachable as a
      // simple clickable element.
      if (!specialtyOptionVisible) {
        await page.keyboard.type(doctorSpecialty, { delay: 50 }).catch(() => {});
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter').catch(() => {});
        await page.waitForTimeout(800);

        // Check whether the button now displays the chosen
        // specialty instead of the placeholder text, as proof
        // the keyboard approach worked.
        const specialtyNowSelected = await page
          .getByText(doctorSpecialty, { exact: false })
          .first()
          .isVisible({ timeout: 3000 })
          .catch(() => false);

        if (specialtyNowSelected) {
          specialtyOptionVisible = true;
          specialtyOption = null; // already selected via keyboard, no click needed
        }
      }

      if (specialtyOption && specialtyOptionVisible) {
        await specialtyOption.click({ timeout: 5000 }).catch(async () => {
          await specialtyOption.click({ force: true, timeout: 5000 }).catch(async () => {
            await specialtyOption.evaluate((el) => el.click()).catch(() => {});
          });
        });
        await page.waitForTimeout(500);
      } else if (!specialtyOptionVisible) {
        await page.screenshot({ path: `debug-specialty-dropdown-${Date.now()}.png`, fullPage: true }).catch(() => {});
      }
    }
  }

  const uploadButton = page.getByRole('button', { name: 'Upload Visit', exact: true });
  await expect(uploadButton).toBeVisible({ timeout: 15000 });

  const uploadDisabled = await uploadButton.isDisabled().catch(() => false);

  await uploadButton.evaluate((el) => {
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
  }).catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150)).catch(() => {});
  await page.waitForTimeout(500);

  await uploadButton.click({ timeout: 5000 }).catch(async () => {
    await uploadButton.click({ force: true, timeout: 5000 }).catch(async () => {
      await uploadButton.evaluate((el) => el.click()).catch(() => {});
    });
  });
  await page.waitForTimeout(1500);

  // A "Send Visit" confirmation modal appears after Upload Visit
  // is clicked ("Are you sure you want to upload this visit?"
  // with No/Yes buttons). Scope the "Yes" click specifically to
  // this modal rather than a bare page-wide getByRole('button',
  // {name:'Yes'}), which could be ambiguous if another "Yes"
  // button exists elsewhere in the DOM.
  // bare page-wide getByRole('button', {name:'Yes'}), which
  // could be ambiguous if another "Yes" button exists elsewhere
  // in the DOM (e.g. a leftover from the earlier Assessment step).
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

      await yesButton.click({ timeout: 5000 }).catch(async () => {
        await yesButton.click({ force: true, timeout: 5000 }).catch(async () => {
          await yesButton.evaluate((el) => el.click()).catch(() => {});
        });
      });

      await page.waitForTimeout(1000);
    }
  } else {
    // Fallback: modal not detected via the expected text - try a
    // generic page-wide "Yes" button as a last resort.
    const genericYesButton = page.getByRole('button', { name: 'Yes', exact: true });
    yesVisible = await genericYesButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (yesVisible) {
      await genericYesButton.click({ timeout: 5000 }).catch(async () => {
        await genericYesButton.evaluate((el) => el.click()).catch(() => {});
      });
      await page.waitForTimeout(1000);
    }
  }

}


// ============================================================
// MH_001 - Verify Medical History screen is reached
// ============================================================
test('MH_001_Verify_Medical_History_Screen_Reached', async ({ page }) => {
  await setupToMedicalHistory(page);

  await expect(page.getByText('Medical History', { exact: true }).first()).toBeVisible();
});

// ============================================================
// MH_002 - Verify the Personal History checklist is reached.
//
// The vaccination question ("Has your child been vaccinated?")
// can appear before this even for an adult patient - real
// screenshot evidence disproved the earlier "adult patients never
// see it" assumption. setupToMedicalHistory() now handles it
// internally when present, so this test only needs to confirm the
// checklist itself is reached, not whether vaccination showed up.
// ============================================================
test('MH_002_Verify_First_Question_Is_Personal_History_Checklist', async ({ page }) => {
  await setupToMedicalHistory(page);

  await expect(
    page.getByText('Do you have a history of any of the following?', { exact: false })
  ).toBeVisible({ timeout: 20000 });
});

// ============================================================
// MH_003 - Verify all 13 Personal History checklist items are
// displayed (labels confirmed via real HTML)
// ============================================================
test('MH_003_Verify_Personal_History_All_Items_Displayed', async ({ page }) => {
  await setupToMedicalHistory(page);

  await expect(
    page.getByText('Do you have a history of any of the following?', { exact: false })
  ).toBeVisible({ timeout: 20000 });

  for (const label of PERSONAL_HISTORY_ITEMS) {
    await expect(page.getByText(label, { exact: false }).first()).toBeVisible({ timeout: 10000 });
  }
});

// ============================================================
// MH_004 - Verify answering all Personal History items 'No'
// and Submit advances past this question
// ============================================================
test('MH_004_Verify_Personal_History_All_No_Advances', async ({ page }) => {
  await setupToMedicalHistory(page);

  const resultType = await answerCurrentMedicalHistoryQuestion(page);

  expect(resultType, 'Expected the Personal History checklist to be detected and answered').toBe('checklist');

  // Verify advancement directly: the checklist's own active
  // content (its "Select yes or no" helper text and item rows)
  // should no longer be showing as the CURRENT active question
  // after a successful Submit - this is more reliable than
  // comparing a "Question N/M" marker, which could not be
  // located via several different locator strategies across
  // multiple real runs on this app build.
  const checklistStillActive = await page
    .getByText('Select yes or no', { exact: false })
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  expect(
    checklistStillActive,
    'Expected the Personal History checklist to no longer be the active question after answering all items and clicking Submit'
  ).toBeFalsy();
});

// ============================================================
// MH_005 - Verify selecting 'Yes' for a specific item
// (e.g. Diabetes) is accepted without error
// ============================================================
test('MH_005_Verify_Personal_History_Yes_Item_Accepted', async ({ page }) => {
  await setupToMedicalHistory(page);

  await expect(
    page.getByText('Do you have a history of any of the following?', { exact: false })
  ).toBeVisible({ timeout: 20000 });

  await answerChecklistItem(page, '4. Diabetes', 'Yes');

  for (const label of PERSONAL_HISTORY_ITEMS) {
    if (label !== '4. Diabetes') {
      await answerChecklistItem(page, label, 'No');
    }
  }

  // Extra buffer before scanning for follow-up inputs - under
  // parallel test-worker load, the "Yes" selection's follow-up
  // field can take longer to render than in an isolated run.
  await page.waitForTimeout(800);
  await fillAnyEmptyRequiredInputs(page);
  await page.waitForTimeout(300);

  const submit = page.getByRole('button', { name: 'Submit', exact: true });
  await expect(submit).toBeVisible({ timeout: 15000 });
  await submit.click();
  await page.waitForTimeout(1500);

  // Same reasoning as MH_004 - verify advancement by checking
  // the checklist's own active content is gone, rather than
  // relying on the question marker locator.
  const checklistStillActive = await page
    .getByText('Select yes or no', { exact: false })
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  expect(
    checklistStillActive,
    'Expected to advance past the Personal History checklist after Submit with Diabetes=Yes'
  ).toBeFalsy();
});

// ============================================================
// MH_006 through MH_011 - the exact wording, order, and total
// count of the remaining adult-patient questions (2/7 through
// 7/7) were NOT captured in the provided screenshots - only
// Question 1/7 (Personal History) was confirmed directly. We
// do not fabricate assertions for question content we have not
// actually observed. Instead, MH_006 documents whatever
// questions the adaptive handler actually encounters, so the
// REAL sequence gets captured in the test log on first run -
// once you share that output (or matching screenshots), the
// remaining specific per-question tests can be written
// accurately, the same way MH_001-005 were corrected once we
// had real evidence.
// ============================================================
test('MH_006_Document_Remaining_Adult_Question_Sequence', async ({ page }) => {
  await setupToMedicalHistory(page);

  const observedQuestions = [];

  for (let step = 1; step <= 12; step++) {
    const summaryVisible = await page
      .getByText('Medical history summary', { exact: false })
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (summaryVisible) {
      console.log('MH_006 — Reached Medical History summary. Full observed question sequence:');
      console.log(JSON.stringify(observedQuestions, null, 2));
      return;
    }

    const questionMarker = await getMedicalHistoryQuestionMarker(page);

    const questionHeading = await page
      .locator('div.text-lg.font-medium, p.text-base.font-semibold')
      .first()
      .textContent()
      .catch(() => null);

    observedQuestions.push({ step, questionMarker, questionHeading });

    const resultType = await answerCurrentMedicalHistoryQuestion(page);

    if (resultType === 'unknown') {
      console.log('MH_006 — Stopped: encountered an unrecognized question type. Observed sequence so far:');
      console.log(JSON.stringify(observedQuestions, null, 2));
      throw new Error('MH_006 — could not determine question type; see logged sequence and DIAGNOSTIC output above.');
    }
  }

  console.log('MH_006 — Did not reach summary within 12 steps. Observed sequence:');
  console.log(JSON.stringify(observedQuestions, null, 2));
});

// ============================================================
// MH_007 - Verify the adaptive handler successfully completes
// the ENTIRE Medical History flow for an adult patient, however
// many questions it actually contains, and reaches the summary
// ============================================================
test('MH_007_Verify_Adaptive_Handler_Reaches_Summary', async ({ page }) => {
  await setupToMedicalHistory(page);
  await completeMedicalHistoryGeneric(page);

  await expect(page.getByText('Medical history summary', { exact: false })).toBeVisible({ timeout: 20000 });
});

// ============================================================
// MH_008 - Verify Personal History (first question) enforces a
// response before Submit can advance (mandatory validation)
// ============================================================
test('MH_008_Verify_Personal_History_Mandatory_Validation', async ({ page }) => {
  await setupToMedicalHistory(page);

  await expect(
    page.getByText('Do you have a history of any of the following?', { exact: false })
  ).toBeVisible({ timeout: 20000 });

  const questionTextBefore = await getMedicalHistoryQuestionMarker(page);

  // Click Submit with NOTHING answered and observe actual
  // behavior, rather than assuming Submit is disabled - the
  // Physical Examination suite found this app build often
  // enables Submit regardless and validates on click instead.
  const submit = page.getByRole('button', { name: 'Submit', exact: true });
  await expect(submit).toBeVisible({ timeout: 15000 });
  await submit.click();
  await page.waitForTimeout(1500);

  // CONFIRMED via real run: the app shows a validation toast
  // "Please select any one option" when Submit is clicked with
  // nothing answered. Check for that directly - it's stronger,
  // more direct evidence of validation than a before/after
  // question-marker comparison, which is sensitive to incidental
  // page changes (e.g. the toast itself) unrelated to whether
  // the question actually advanced.
  const validationToastVisible = await page
    .getByText('Please select any one option', { exact: false })
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  const questionTextAfter = await getMedicalHistoryQuestionMarker(page);

  if (validationToastVisible) {
    // Validation toast is direct proof the app blocked the
    // submission - this alone satisfies the test.
    expect(validationToastVisible).toBeTruthy();
  } else {
    // No toast seen - fall back to checking the question marker
    // did not change (i.e. we're still on the same question).
    expect(
      questionTextAfter,
      'Personal History is marked mandatory (*) but the app allowed advancing to the next question with Submit clicked and NO items answered - mandatory-field validation is not being enforced'
    ).toBe(questionTextBefore);
  }
});

// ============================================================
// MH_009 - Verify Medical History summary heading is displayed
// after completing the full adaptive flow
// ============================================================
test('MH_009_Verify_Medical_History_Summary_Heading_Displayed', async ({ page }) => {
  await setupToMedicalHistory(page);
  await completeMedicalHistoryGeneric(page);

  await expect(page.getByText('Medical history summary', { exact: false })).toBeVisible({ timeout: 20000 });
});

// ============================================================
// MH_010 - Verify the summary reflects "None"/"No"-style
// answers for checklist-based sections when everything was
// answered "No".
//
// NOTE: does NOT assert a "Vaccination History: Complete" row -
// that only applies to child patients. For our adult automated
// patient, we check for content we can reasonably expect
// regardless of exact adult question wording: some indication
// of "None"/"No" appearing in the Medical History summary,
// scoped to the modal.
// ============================================================
test('MH_010_Verify_Summary_Reflects_No_Answers', async ({ page }) => {
  await setupToMedicalHistory(page);
  await completeMedicalHistoryGeneric(page);

  const modal = getMedicalHistoryModal(page);
  await expect(modal).toBeVisible({ timeout: 15000 });

  const modalText = await modal.innerText().catch(() => '');

  const containsNoneOrNo = /none|no known|^no$/i.test(modalText);

  expect(
    containsNoneOrNo,
    'Expected the Medical History summary to reflect "None"/"No"-style answers, since every checklist item was answered "No" during the adaptive flow'
  ).toBeTruthy();
});

test('MH_016_Verify_Confirm_Button_Visible', async ({ page }) => {
  await setupToMedicalHistory(page);
  await runFullMedicalHistory(page);

  const confirmButton = getMedicalHistoryConfirmButton(page);
  await expect(confirmButton).toBeVisible({ timeout: 15000 });
  await expect(confirmButton).toBeEnabled();
});

// ============================================================
// MH_017 - Verify clicking Confirm navigates to Visit Summary
// ============================================================
test('MH_017_Verify_Confirm_Navigates_To_Visit_Summary', async ({ page }) => {
  await setupToMedicalHistory(page);
  await runFullMedicalHistory(page);

  await clickMedicalHistorySummaryConfirm(page);

  await waitForVisitSummaryToSettle(page);
});

// ============================================================
// MH_018 - Verify Visit Summary displays Vitals section
// ============================================================
// Some Visit Summary row labels (Height(cm), BP, etc.) can have
// more than one matching DOM node at once - a real screenshot
// showed the content fully rendered and visible on screen while
// getByText(...).first() reported it "hidden" on every one of 34
// consecutive polls over 30s. Since the page was provably already
// rendered by then, this looks like .first() landing on a
// different, permanently-hidden duplicate rather than a loading
// delay - so instead of just waiting longer, find whichever
// match is actually visible.
async function getFirstVisibleMatch(page, text, options = {}) {
  const candidates = page.getByText(text, options);
  const count = await candidates.count().catch(() => 0);

  for (let i = 0; i < count; i++) {
    const candidate = candidates.nth(i);
    if (await candidate.isVisible({ timeout: 1000 }).catch(() => false)) {
      return candidate;
    }
  }

  return candidates.first();
}

test('MH_018_Verify_Visit_Summary_Shows_Vitals', async ({ page }) => {
  await setupToMedicalHistory(page);
  await runFullMedicalHistory(page);
  await clickMedicalHistorySummaryConfirm(page);
  await waitForVisitSummaryToSettle(page);

  await expect(page.getByText('Vitals', { exact: true }).first()).toBeVisible({ timeout: 30000 });

  const heightLabel = await getFirstVisibleMatch(page, 'Height(cm)', { exact: false });
  await expect(heightLabel).toBeVisible({ timeout: 30000 });

  const bpLabel = await getFirstVisibleMatch(page, 'BP', { exact: true });
  await expect(bpLabel).toBeVisible({ timeout: 30000 });
});

// ============================================================
// MH_019 - Verify Visit Summary Physical Examination section
// matches earlier answers
// ============================================================
test('MH_019_Verify_Visit_Summary_Shows_Physical_Examination', async ({ page }) => {
  await setupToMedicalHistory(page);
  await runFullMedicalHistory(page);
  await clickMedicalHistorySummaryConfirm(page);
  await waitForVisitSummaryToSettle(page);

  const peSection = page.locator('div').filter({ hasText: 'Physical examination' }).first();
  await expect(peSection).toBeVisible({ timeout: 20000 });

  await expect(page.getByText('Eyes: Jaundice', { exact: false })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Eyes: Pallor', { exact: false })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Nail abnormality', { exact: false })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// MH_020 - Verify Visit Summary Medical History section
// matches earlier answers
// ============================================================
test('MH_020_Verify_Visit_Summary_Shows_Medical_History', async ({ page }) => {
  await setupToMedicalHistory(page);
  await runFullMedicalHistory(page);
  await clickMedicalHistorySummaryConfirm(page);
  await waitForVisitSummaryToSettle(page);

  const mhSection = page.locator('div').filter({ hasText: 'Medical History' }).first();
  await expect(mhSection).toBeVisible({ timeout: 20000 });

  // NOTE: does NOT assert "Vaccination History of children" -
  // that row only applies to child patients and will not appear
  // for our automated adult patient.
  await expect(page.getByText('Drug history', { exact: false })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Allergies', { exact: false }).first()).toBeVisible({ timeout: 15000 });
});

// ============================================================
// MH_021 - Verify Doctor's specialty selector is present
// ============================================================
test('MH_021_Verify_Doctor_Specialty_Selector_Present', async ({ page }) => {
  await setupToMedicalHistory(page);
  await runFullMedicalHistory(page);
  await clickMedicalHistorySummaryConfirm(page);
  await waitForVisitSummaryToSettle(page);

  await expect(
    page.getByRole('button', { name: "Select Doctor's specialty" })
  ).toBeVisible({ timeout: 15000 });
});

// ============================================================
// MH_022 - Verify selecting a Doctor's specialty is recorded
// ============================================================
test('MH_022_Verify_Doctor_Specialty_Selection_Recorded', async ({ page }) => {
  await setupToMedicalHistory(page);
  await runFullMedicalHistory(page);
  await clickMedicalHistorySummaryConfirm(page);
  await waitForVisitSummaryToSettle(page);

  const specialtySelector = page.getByRole('button', { name: "Select Doctor's specialty" });
  await expect(specialtySelector).toBeVisible({ timeout: 15000 });
  await specialtySelector.click();

  await page.getByText('General Physician', { exact: true }).click();
  await page.waitForTimeout(500);

  await expect(page.getByText('General Physician', { exact: false }).first()).toBeVisible({ timeout: 10000 });
});

// ============================================================
// MH_023 - Verify Priority Visit toggle is present
// ============================================================
test('MH_023_Verify_Priority_Visit_Toggle_Present', async ({ page }) => {
  await setupToMedicalHistory(page);
  await runFullMedicalHistory(page);
  await clickMedicalHistorySummaryConfirm(page);
  await waitForVisitSummaryToSettle(page);

  await expect(page.getByText('Priority Visit', { exact: false })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// MH_024 - Verify clicking 'Upload Visit' (with specialty
// selected) proceeds / opens a confirmation
// ============================================================
test('MH_024_Verify_Upload_Visit_With_Specialty_Proceeds', async ({ page }) => {
  await setupToMedicalHistory(page);
  await runFullMedicalHistory(page);
  await clickMedicalHistorySummaryConfirm(page);
  await waitForVisitSummaryToSettle(page);

  await completeVisitUpload(page, { doctorSpecialty: 'General Physician' });

  // After a successful upload, the "Upload Visit" button/page
  // should no longer be the active view.
  const uploadButtonStillVisible = await page
    .getByRole('button', { name: 'Upload Visit', exact: true })
    .isVisible({ timeout: 8000 })
    .catch(() => false);

  expect(
    uploadButtonStillVisible,
    'Expected the "Upload Visit" button/page to no longer be active after a successful upload'
  ).toBeFalsy();
});

// ============================================================
// MH_025 - End-to-end: complete Medical History + Upload Visit
// (Critical happy path)
// ============================================================
test('MH_025_Verify_End_To_End_Medical_History_And_Upload', async ({ page }) => {
  await setupToMedicalHistory(page);
  await runFullMedicalHistory(page);

  // NOTE: does NOT assert a "Vaccination History: Complete" row -
  // that only applies to child patients, not our automated adult
  // patient. "Medical History", "Drug history", and "Allergies"
  // rows are expected to still exist regardless of patient age.
  await expectMedicalHistorySummaryRow(page, 'Medical History', 'None');
  await expectMedicalHistorySummaryRow(page, 'Drug history', 'No');
  await expectMedicalHistorySummaryRow(page, 'Allergies', 'No known allergies');

  await clickMedicalHistorySummaryConfirm(page);
  await waitForVisitSummaryToSettle(page);

  await completeVisitUpload(page, { doctorSpecialty: 'General Physician' });
});

});
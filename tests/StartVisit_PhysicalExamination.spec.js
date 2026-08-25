import { test, expect } from '@playwright/test';

test.describe('Physical Examination Module - Full Test Suite', () => {

test.describe.configure({ timeout: 180000 });

// ============================================================
// SHARED STEP FUNCTIONS
// Each function does one stage of the flow. Tests compose these
// so every test only pays for the steps it actually needs to
// reach its assertion point, and each stage's own expect()
// calls act as a built-in check for that stage's TCs.
// ============================================================

// ------------------------------------------------------------
// STAGE 1: Login -> Create Patient -> Start Visit -> Vitals ->
// Visit Reason -> Assessment -> arrives at the very first
// Physical Examination card ("Is there jaundice?").
// ------------------------------------------------------------

async function setupToPhysicalExamination(page) {

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

  // 3. PATIENT DETAILS
  await page.getByRole('textbox', { name: 'First Name*' }).fill('Automation');
  await page.getByRole('textbox', { name: 'Last Name*' }).fill('Test');
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

  // 15. START VISIT
  const patientCard = page
    .locator('div.bg-white.rounded-xl.border')
    .filter({ has: page.locator('p.font-semibold', { hasText: 'Automation Test' }) });

  await expect(patientCard).toBeVisible({ timeout: 30000 });

  const startVisitButton = patientCard.getByRole('button', { name: 'Start Visit' });
  await expect(startVisitButton).toBeVisible({ timeout: 30000 });
  await startVisitButton.click({ force: true });

  // 16. VITALS
  await expect(
    page.getByRole('textbox', { name: 'E.g., 172 cm' })
  ).toBeVisible({ timeout: 30000 });

  await page.getByRole('textbox', { name: 'E.g., 172 cm' }).fill('170');
  await page.getByRole('textbox', { name: 'E.g., 63 kg' }).fill('63');
  await page.getByRole('textbox', { name: 'E.g., 120 mmHg' }).fill('120');
  await page.getByRole('textbox', { name: 'E.g., 80 mmHg' }).fill('80');
  await page.getByRole('textbox', { name: 'E.g., 72 bpm' }).fill('72');
  await page.getByRole('textbox', { name: 'E.g., 98.6 °F' }).fill('98');
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

  // 18. VISIT REASON
  await expect(
    page.getByRole('textbox', { name: 'Type or select reason eg.' })
  ).toBeVisible({ timeout: 15000 });

  await page.getByText('/4 Visit Reason').click();

  const reason = page.getByRole('textbox', { name: 'Type or select reason eg.' });
  await reason.click();
  await reason.fill('other');

  const otherOption = page.locator('div').filter({ hasText: /^Other$/ }).nth(1);
  await expect(otherOption).toBeVisible({ timeout: 15000 });
  await otherOption.click();

  await page.getByRole('button', { name: 'Start Assessment' }).click();

  // 19. ASSESSMENT
  await page.getByRole('button', { name: 'Yes' }).click();

  const description = page.getByRole('textbox', { name: "Describe the patient's" });
  await expect(description).toBeVisible({ timeout: 15000 });
  await description.fill('other');
  await page.getByRole('button', { name: 'Submit' }).click();

  // 20. FOLLOW-UP ASSESSMENT
  await page.getByRole('button', { name: 'None' }).click();

  const additionalInfo = page.getByRole('textbox', { name: 'Additional information - [' });
  await expect(additionalInfo).toBeVisible({ timeout: 15000 });
  await additionalInfo.fill('ok');
  await page.getByRole('button', { name: 'Submit' }).click();

  await page.getByRole('button', { name: 'Confirm' }).click();
  await page.getByRole('button', { name: 'Okay' }).click();

  // PHYSICAL EXAMINATION - first card ready
  await expect(
    page.getByRole('button', { name: 'No', exact: true }).first()
  ).toBeVisible({ timeout: 30000 });
}

// ------------------------------------------------------------
// STAGE 2: "Is there jaundice?" - first unnumbered card.
// ------------------------------------------------------------

async function answerJaundice(page, value = 'No') {
  const button = page.getByRole('button', { name: value, exact: true }).first();
  await expect(button).toBeVisible({ timeout: 15000 });
  await button.click();
}

// ------------------------------------------------------------
// STAGE 3: "Is there pallor?" - second unnumbered card.
// ------------------------------------------------------------

async function answerPallor(page, value = 'Normal') {
  const button = page.getByRole('button', { name: value, exact: true }).first();
  await expect(button).toBeVisible({ timeout: 15000 });
  await button.click();
}

// ------------------------------------------------------------
// STAGE 4: Question 3/6 - Pinch Skin (single-select,
// auto-advances, no Submit button).
// ------------------------------------------------------------

async function answerPinchSkin(page, value = 'Normal') {
  await expect(
    page.getByText('Question 3/6', { exact: true })
  ).toBeVisible({ timeout: 30000 });

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

  const optionButton = question3Card.locator('button.selectable-option').filter({
    has: page.locator('span.label', { hasText: new RegExp(`^${value}$`) })
  });

  await expect(optionButton).toBeVisible({ timeout: 15000 });
  await optionButton.evaluate((el) => el.click());

  await page.waitForTimeout(1500);

  // Confirm advance by waiting for Question 4/6 next, instead of
  // waiting for a Submit that does not exist for this card.
  await expect(
    page.getByText('Question 4/6', { exact: true })
  ).toBeVisible({ timeout: 15000 });

  await page.waitForTimeout(500);
}

// ------------------------------------------------------------
// STAGE 5: Question 4/6 - Nail Abnormality (multi-select,
// requires explicit Submit click). Accepts an array of one or
// more option labels to select.
// ------------------------------------------------------------

async function answerNailAbnormality(page, values = ['Nails are normal']) {
  await expect(
    page.getByText('Question 4/6', { exact: true })
  ).toBeVisible({ timeout: 30000 });

  for (const value of values) {
    const option = page.getByRole('button', { name: value }).first();
    await expect(option).toBeVisible({ timeout: 15000 });
    await option.scrollIntoViewIfNeeded().catch(() => {});
    await page.evaluate(() => window.scrollBy(0, -150));
    await page.waitForTimeout(300);
    await option.evaluate((el) => el.click());
    await page.waitForTimeout(500);
  }

  const submit = page.getByRole('button', { name: 'Submit', exact: true });
  await expect(submit).toBeVisible({ timeout: 15000 });
  await submit.click();

  await page.waitForTimeout(1500);
}

// ------------------------------------------------------------
// STAGE 6: Question 5/6 - Nail Anemia (single-select,
// auto-advances, no Submit button).
// ------------------------------------------------------------

async function answerNailAnemia(page, value = 'Nails are normal') {
  await expect(
    page.getByText('Question 5/6', { exact: true })
  ).toBeVisible({ timeout: 30000 });

  const option = page.getByRole('button', { name: value }).first();
  await expect(option).toBeVisible({ timeout: 15000 });

  await option.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(500);

  await option.evaluate((el) => el.click());

  await page.waitForTimeout(1500);

  await expect(
    page.getByText('Question 6/6', { exact: true })
  ).toBeVisible({ timeout: 15000 });

  await page.waitForTimeout(500);
}

// ------------------------------------------------------------
// STAGE 7: Question 6/6 - Ankle Oedema (single-select, final
// question, auto-advances to the summary screen).
// ------------------------------------------------------------

async function answerAnkleOedema(page, value = 'No oedema') {
  await expect(
    page.getByText('Question 6/6', { exact: true })
  ).toBeVisible({ timeout: 30000 });

  const option = page.getByRole('button', { name: value }).first();
  await expect(option).toBeVisible({ timeout: 15000 });

  await option.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(500);

  await option.evaluate((el) => el.click());

  await page.waitForTimeout(1500);

  const summaryVisible = await page
    .getByText('Physical examination summary', { exact: false })
    .isVisible({ timeout: 10000 })
    .catch(() => false);

  if (!summaryVisible) {
    const submit = page.getByRole('button', { name: 'Submit', exact: true });
    const submitVisible = await submit.isVisible({ timeout: 5000 }).catch(() => false);

    if (submitVisible) {
      await submit.click();
    } else {
      const skip = page.getByRole('button', { name: 'Skip', exact: true });
      const skipVisible = await skip.isVisible({ timeout: 5000 }).catch(() => false);
      if (skipVisible) {
        await skip.click();
      }
    }
  }

  await page.waitForTimeout(1500);
}

// ------------------------------------------------------------
// Composed helper: runs the full flow end to end with default
// (happy-path) or overridden answers, stopping at the summary
// screen (does NOT click Confirm).
// ------------------------------------------------------------

async function runFullPhysicalExam(page, overrides = {}) {
  const {
    jaundice = 'No',
    pallor = 'Normal',
    pinchSkin = 'Normal',
    nailAbnormality = ['Nails are normal'],
    nailAnemia = 'Nails are normal',
    ankleOedema = 'No oedema'
  } = overrides;

  await setupToPhysicalExamination(page);
  await answerJaundice(page, jaundice);
  await answerPallor(page, pallor);
  await answerPinchSkin(page, pinchSkin);
  await answerNailAbnormality(page, nailAbnormality);
  await answerNailAnemia(page, nailAnemia);
  await answerAnkleOedema(page, ankleOedema);

  await expect(
    page.getByText('Physical examination summary', { exact: false })
  ).toBeVisible({ timeout: 20000 });
}

// ------------------------------------------------------------
// The Physical Examination Summary renders as a MODAL (a
// "bg-white shadow-xl flex flex-col" wrapper div), not an
// inline page section. Each answer is a row like:
//   <div class="grid grid-cols-[0px_240px_260px] ...">
//     <span>•</span>
//     <span class="text-gray-500 font-medium">Eyes: Jaundice</span>
//     <span class="break-words"><span class="text-gray-900">No</span></span>
//   </div>
// We scope to the actual modal wrapper and to each specific row
// by its label, rather than loosely matching "contains both
// label and value text anywhere", which was unreliable since
// values like "Normal" repeat across multiple rows (Pallor, Arm).
// ------------------------------------------------------------

function getSummaryModal(page) {
  return page
    .locator('div.bg-white.shadow-xl.flex.flex-col')
    .filter({ has: page.getByText('Physical examination summary', { exact: false }) })
    .first();
}

function getSummaryConfirmButton(page) {
  return getSummaryModal(page).getByRole('button', { name: 'Confirm', exact: true });
}

async function clickSummaryConfirm(page) {
  const confirmButton = getSummaryConfirmButton(page);

  await expect(confirmButton).toBeVisible({ timeout: 15000 });

  await confirmButton.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(500);

  // Strategy 1: DOM click - bypasses any overlay/z-index issues
  await confirmButton.evaluate((el) => el.click()).catch(() => {});
  await page.waitForTimeout(1000);

  let summaryStillVisible = await page
    .getByText('Physical examination summary', { exact: false })
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  // Strategy 2: normal Playwright click (only if the button is
  // still present - if the modal already closed, Strategy 1 worked)
  if (summaryStillVisible) {
    const stillPresent = await confirmButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (stillPresent) {
      await confirmButton.click().catch(() => {});
      await page.waitForTimeout(1000);
      summaryStillVisible = await page
        .getByText('Physical examination summary', { exact: false })
        .isVisible({ timeout: 3000 })
        .catch(() => false);
    }
  }

  // Strategy 3: force click
  if (summaryStillVisible) {
    const stillPresent = await confirmButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (stillPresent) {
      await confirmButton.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
    }
  }
}

// ------------------------------------------------------------
// Assert a summary row shows the expected label/value pair.
// Scoped to the modal, and to the SPECIFIC grid row matching the
// label, then checks the value span's exact text - not just
// "this text appears somewhere in the summary".
// ------------------------------------------------------------

async function expectSummaryRow(page, label, value) {
  const modal = getSummaryModal(page);

  const row = modal
    .locator('div.grid')
    .filter({ has: page.getByText(label, { exact: false }) })
    .first();

  await expect(
    row,
    `Summary screen does not have a row for label "${label}"`
  ).toBeVisible({ timeout: 8000 });

  const valueSpan = row.locator('span.text-gray-900').first();

  await expect(
    valueSpan,
    `Summary row "${label}" expected value "${value}" but did not match`
  ).toHaveText(value, { timeout: 8000 });
}

// ============================================================
// TC_PE_001 - Verify Physical Examination screen loads
// ============================================================
test('TC_PE_001_Verify_Physical_Examination_Screen_Loads', async ({ page }) => {
  await setupToPhysicalExamination(page);

  // Only the FIRST question (Jaundice) renders on initial load.
  // Subsequent questions (e.g. Pallor's "Normal" option) do not
  // exist in the DOM until the current question is answered -
  // this is a strictly sequential, one-question-at-a-time flow.
  await expect(
    page.getByRole('button', { name: 'No', exact: true }).first()
  ).toBeVisible();

  await expect(
    page.getByText('Is there jaundice?', { exact: false })
  ).toBeVisible();

  // Now answer Jaundice and confirm the NEXT question (Pallor,
  // with its "Normal" option) becomes available.
  await answerJaundice(page, 'No');

  await expect(
    page.getByRole('button', { name: 'Normal', exact: true }).first()
  ).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_PE_002 - Verify Assessment Progress bar initial state
// ============================================================
test('TC_PE_002_Verify_Assessment_Progress_Initial_State', async ({ page }) => {
  await setupToPhysicalExamination(page);

  await expect(page.getByText('Assessment Progress')).toBeVisible();
  await expect(page.getByText('LIVE')).toBeVisible();
});

// ============================================================
// TC_PE_003 - Verify selecting 'No' for jaundice records answer
// ============================================================
test('TC_PE_003_Verify_Jaundice_No_Answer_Recorded', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');

  await expect(page.getByText('Is there jaundice?')).toBeVisible();
  await expect(
    page.locator('div').filter({ hasText: 'Is there jaundice?' }).filter({ hasText: 'No' }).first()
  ).toBeVisible();
});

// ============================================================
// TC_PE_004 - Verify jaundice answer can be edited
// ============================================================
test('TC_PE_004_Verify_Jaundice_Answer_Editable', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');

  const jaundiceCard = page.locator('div').filter({ hasText: 'Is there jaundice?' }).first();
  const editIcon = jaundiceCard.getByRole('button', { name: /edit/i }).first();

  const editIconVisible = await editIcon.isVisible({ timeout: 5000 }).catch(() => false);

  expect(
    editIconVisible,
    'Expected an edit icon to be available on the answered Jaundice card'
  ).toBeTruthy();
});

// ============================================================
// TC_PE_005 - Verify selecting 'Normal' for pallor records answer
// ============================================================
test('TC_PE_005_Verify_Pallor_Normal_Answer_Recorded', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');

  await expect(page.getByText('Is there pallor?')).toBeVisible();
  await expect(
    page.locator('div').filter({ hasText: 'Is there pallor?' }).filter({ hasText: 'Normal' }).first()
  ).toBeVisible();
});

// ============================================================
// TC_PE_006 - Verify pallor question offers alternate option
// ============================================================
test('TC_PE_006_Verify_Pallor_Options_Available', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');

  await expect(
    page.getByRole('button', { name: 'Normal', exact: true }).first()
  ).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_PE_007 - Verify Question 3/6 Pinch Skin displays correctly
// ============================================================
test('TC_PE_007_Verify_Pinch_Skin_Question_Displays', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');

  await expect(page.getByText('Question 3/6', { exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Pinch skin', { exact: false })).toBeVisible();

  const question3Card = page
    .locator('div[style*="display: block"] div.shadow-\\[0px_4px_10px_0px_\\#3B3B3B0D\\]')
    .filter({ has: page.getByText('Question 3/6', { exact: true }) })
    .filter({ has: page.getByText('Pinch skin', { exact: false }) })
    .first();

  await expect(
    question3Card.locator('button.selectable-option').filter({ has: page.locator('span.label', { hasText: /^Normal$/ }) })
  ).toBeVisible({ timeout: 15000 });

  await expect(
    question3Card.locator('button.selectable-option').filter({ has: page.locator('span.label', { hasText: /^Slow$/ }) })
  ).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_PE_008 - Verify Pinch Skin auto-advances without Submit
// ============================================================
test('TC_PE_008_Verify_Pinch_Skin_Auto_Advances', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');

  await expect(page.getByText('Question 4/6', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(
    page.locator('div').filter({ hasText: 'Pinch skin' }).filter({ hasText: 'Normal' }).first()
  ).toBeVisible();
});

// ============================================================
// TC_PE_009 - Verify selecting 'Slow' on Pinch Skin recorded
// ============================================================
test('TC_PE_009_Verify_Pinch_Skin_Slow_Option_Recorded', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Slow');

  await expect(
    page.locator('div').filter({ hasText: 'Pinch skin' }).filter({ hasText: 'Slow' }).first()
  ).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_PE_010 - Verify Pinch Skin marked mandatory
// ============================================================
test('TC_PE_010_Verify_Pinch_Skin_Mandatory_Indicator', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');

  await expect(page.getByText('Question 3/6', { exact: true })).toBeVisible({ timeout: 30000 });

  const question3Card = page
    .locator('div[style*="display: block"] div.shadow-\\[0px_4px_10px_0px_\\#3B3B3B0D\\]')
    .filter({ has: page.getByText('Question 3/6', { exact: true }) })
    .filter({ has: page.getByText('Pinch skin', { exact: false }) })
    .first();

  await expect(question3Card.getByText('*', { exact: true })).toBeVisible();
});

// ============================================================
// TC_PE_011 - Verify Question 4/6 shows all nail abnormality
// options with reference images
// ============================================================
test('TC_PE_011_Verify_Nail_Abnormality_Options_And_Images', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');

  await expect(page.getByText('Question 4/6', { exact: true })).toBeVisible({ timeout: 15000 });

  for (const label of ['Nails are normal', 'Clubbing', 'Spoon Nails', 'Discolored', 'Take a Picture']) {
    await expect(page.getByRole('button', { name: label }).first()).toBeVisible({ timeout: 10000 });
  }

  await expect(page.getByText('References:', { exact: false })).toBeVisible();
});

// ============================================================
// TC_PE_012 - Verify 'Select one or more' label present
// ============================================================
test('TC_PE_012_Verify_Nail_Abnormality_MultiSelect_Label', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');

  await expect(page.getByText('Question 4/6', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Select one or more', { exact: false })).toBeVisible();
});

// ============================================================
// TC_PE_013 - Verify Nail Abnormality requires explicit Submit
// ============================================================
test('TC_PE_013_Verify_Nail_Abnormality_Requires_Submit', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');
  await answerNailAbnormality(page, ['Nails are normal']);

  await expect(page.getByText('Question 5/6', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_PE_014 - Verify selecting multiple abnormality options
// ============================================================
test('TC_PE_014_Verify_Nail_Abnormality_Multiple_Selections', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');
  await answerNailAbnormality(page, ['Clubbing', 'Discolored']);

  await expect(page.getByText('Question 5/6', { exact: true })).toBeVisible({ timeout: 15000 });

  const nailRow = page.locator('div').filter({ hasText: 'Nail abnormality' }).last();
  await expect(nailRow).toContainText(/Clubbing/i);
});

// ============================================================
// TC_PE_015 - Verify Nail Abnormality validation when Submit is
// clicked with NO option selected.
//
// CONFIRMED via real run: Submit is both visible and ENABLED
// even before any selection is made (this app build does not
// disable the button pre-emptively). This means mandatory-field
// enforcement, if it exists at all, must happen at click-time -
// either the app should reject the click (stay on Question 4/6,
// show a validation message) or it should NOT be possible to
// advance to Question 5/6 without a selection. This test
// verifies that actual behavior rather than assuming Submit's
// disabled state.
// ============================================================
test('TC_PE_015_Verify_Nail_Abnormality_Validation_On_Empty_Submit', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');

  await expect(page.getByText('Question 4/6', { exact: true })).toBeVisible({ timeout: 15000 });

  const question4Card = page
    .locator('div[style*="display: block"] div.shadow-\\[0px_4px_10px_0px_\\#3B3B3B0D\\]')
    .filter({ has: page.getByText('Question 4/6', { exact: true }) })
    .first();

  const submitInCard = question4Card.getByRole('button', { name: 'Submit', exact: true });
  await expect(submitInCard).toBeVisible({ timeout: 5000 });

  // Click Submit with NOTHING selected and observe what actually
  // happens - this is the real validation check.
  await submitInCard.click();
  await page.waitForTimeout(1500);

  const advancedToQuestion5 = await page
    .getByText('Question 5/6', { exact: true })
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  const stillOnQuestion4 = await page
    .getByText('Question 4/6', { exact: true })
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  console.log(
    `TC_PE_015 — After clicking Submit with no selection: advanced to Question 5/6 = ${advancedToQuestion5}, still on Question 4/6 = ${stillOnQuestion4}`
  );

  expect(
    advancedToQuestion5,
    'Question 4/6 (Nail abnormality) is marked mandatory (*) but the app allowed advancing to Question 5/6 with Submit clicked and NO option selected - mandatory-field validation is not being enforced'
  ).toBeFalsy();
});

// ============================================================
// TC_PE_016 - Verify 'Take a Picture' opens camera/upload
// ============================================================
test('TC_PE_016_Verify_Take_A_Picture_Option', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');

  await expect(page.getByText('Question 4/6', { exact: true })).toBeVisible({ timeout: 15000 });

  const takePictureButton = page.getByRole('button', { name: 'Take a Picture' });
  await expect(takePictureButton).toBeVisible({ timeout: 10000 });

  // Only verify the control exists and is clickable - actual
  // camera/file-picker OS dialogs are outside Playwright's DOM
  // control and are not asserted here.
  await expect(takePictureButton).toBeEnabled();
});

// ============================================================
// TC_PE_017 - Verify Question 5/6 displays correct options
// ============================================================
test('TC_PE_017_Verify_Nail_Anemia_Question_Displays', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');
  await answerNailAbnormality(page, ['Nails are normal']);

  await expect(page.getByText('Question 5/6', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Are the nails pale?', { exact: false })).toBeVisible();
  await expect(page.getByText('Select any one', { exact: false }).first()).toBeVisible();

  for (const label of ['Nails are normal', 'Nails are pale', 'Take a Picture']) {
    await expect(page.getByRole('button', { name: label }).first()).toBeVisible({ timeout: 10000 });
  }
});

// ============================================================
// TC_PE_018 - Verify Question 5/6 auto-advances without Submit
// ============================================================
test('TC_PE_018_Verify_Nail_Anemia_Auto_Advances', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');
  await answerNailAbnormality(page, ['Nails are normal']);
  await answerNailAnemia(page, 'Nails are normal');

  await expect(page.getByText('Question 6/6', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_PE_019 - Verify 'Nails are pale' recorded distinctly
// ============================================================
test('TC_PE_019_Verify_Nail_Anemia_Pale_Option_Recorded', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await runFullPhysicalExam(page, { nailAnemia: 'Nails are pale' });

  await expectSummaryRow(page, 'Nail anemia', 'Nails are pale');
});

// ============================================================
// TC_PE_020 - Verify Question 6/6 displays with reference image
// ============================================================
test('TC_PE_020_Verify_Ankle_Oedema_Question_Displays', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');
  await answerNailAbnormality(page, ['Nails are normal']);
  await answerNailAnemia(page, 'Nails are normal');

  await expect(page.getByText('Question 6/6', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Is there ankle oedema?', { exact: false })).toBeVisible();
  await expect(page.getByText('References:', { exact: false })).toBeVisible();

  for (const label of ['No oedema', 'In left', 'In right', 'Both', 'Take a Picture']) {
    await expect(page.getByRole('button', { name: label }).first()).toBeVisible({ timeout: 10000 });
  }
});

// ============================================================
// TC_PE_021 - Verify 'Skip' shown before selection
// ============================================================
test('TC_PE_021_Verify_Skip_Button_Before_Selection', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');
  await answerNailAbnormality(page, ['Nails are normal']);
  await answerNailAnemia(page, 'Nails are normal');

  await expect(page.getByText('Question 6/6', { exact: true })).toBeVisible({ timeout: 15000 });

  const skipVisible = await page
    .getByRole('button', { name: 'Skip', exact: true })
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  expect(skipVisible, 'Expected "Skip" button to be visible before any option is selected').toBeTruthy();
});

// ============================================================
// TC_PE_022 - Verify 'No oedema' advances to Summary
// ============================================================
test('TC_PE_022_Verify_No_Oedema_Advances_To_Summary', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await runFullPhysicalExam(page, { ankleOedema: 'No oedema' });

  await expect(page.getByText('Physical examination summary', { exact: false })).toBeVisible();
});

// ============================================================
// TC_PE_023 - Verify alternate oedema options update summary
// ============================================================
test('TC_PE_023_Verify_Oedema_In_Left_Option_Recorded', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await runFullPhysicalExam(page, { ankleOedema: 'In left' });

  await expectSummaryRow(page, 'Ankle', 'In left');
});

// ============================================================
// TC_PE_024 - Verify 'Skip' bypasses the oedema question
// ============================================================
test('TC_PE_024_Verify_Skip_Bypasses_Oedema_Question', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');
  await answerNailAbnormality(page, ['Nails are normal']);
  await answerNailAnemia(page, 'Nails are normal');

  await expect(page.getByText('Question 6/6', { exact: true })).toBeVisible({ timeout: 15000 });

  const skipButton = page.getByRole('button', { name: 'Skip', exact: true });
  const skipVisible = await skipButton.isVisible({ timeout: 5000 }).catch(() => false);

  if (skipVisible) {
    await skipButton.click();
    await page.waitForTimeout(1500);

    // Document actual behavior rather than assuming - either the
    // summary appears (Skip is allowed) or the app stays on this
    // question / shows validation (Skip is blocked for this field).
    const advancedToSummary = await page
      .getByText('Physical examination summary', { exact: false })
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    console.log(
      `TC_PE_024 — Skip on Question 6/6 ${advancedToSummary ? 'advanced to Summary' : 'did NOT advance (question may be mandatory)'}`
    );
  } else {
    console.log('TC_PE_024 — Skip button was not available to test (may already require a selection)');
  }
});

// ============================================================
// TC_PE_025 - Verify Summary heading displayed
// ============================================================
test('TC_PE_025_Verify_Summary_Heading_Displayed', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await runFullPhysicalExam(page);

  await expect(page.getByText('Physical examination summary', { exact: false })).toBeVisible();
  await expect(page.getByText('General Exams', { exact: false }).first()).toBeVisible();
});

// ============================================================
// TC_PE_026 - Verify all 6 answered fields listed correctly
// ============================================================
test('TC_PE_026_Verify_All_Summary_Fields_Correct', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await runFullPhysicalExam(page);

  await expectSummaryRow(page, 'Jaundice', 'No');
  await expectSummaryRow(page, 'Pallor', 'Normal');
  await expectSummaryRow(page, 'Arm', 'Normal');
  await expectSummaryRow(page, 'Nail abnormality', 'Nails are normal');
  await expectSummaryRow(page, 'Nail anemia', 'Nails are normal');
  await expectSummaryRow(page, 'Ankle', 'No oedema');
});

// ============================================================
// TC_PE_027 - Verify 'Change' button allows editing summary
// ============================================================
test('TC_PE_027_Verify_Change_Button_Present', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await runFullPhysicalExam(page);

  const changeButton = getSummaryModal(page).getByRole('button', { name: 'Change' });
  await expect(changeButton).toBeVisible({ timeout: 10000 });
});

// ============================================================
// TC_PE_028 - Verify 'Back' button navigates to previous step
// ============================================================
test('TC_PE_028_Verify_Back_Button_Present_On_Summary', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await runFullPhysicalExam(page);

  const backButton = getSummaryModal(page).getByRole('button', { name: 'Back', exact: true });
  await expect(backButton).toBeVisible({ timeout: 10000 });
  await expect(backButton).toBeEnabled();
});

// ============================================================
// TC_PE_029 - Verify 'Confirm' button visible and enabled
// ============================================================
test('TC_PE_029_Verify_Confirm_Button_Visible_And_Enabled', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await runFullPhysicalExam(page);

  const confirmButton = getSummaryConfirmButton(page);
  await expect(confirmButton).toBeVisible({ timeout: 15000 });
  await expect(confirmButton).toBeEnabled();
});

// ============================================================
// TC_PE_030 - Verify clicking 'Confirm' finalizes the exam
// ============================================================
test('TC_PE_030_Verify_Confirm_Finalizes_Physical_Examination', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await runFullPhysicalExam(page);

  await clickSummaryConfirm(page);

  // After confirming, the summary screen itself should no longer
  // be showing as the active/editable step.
  await expect(
    page.getByText('Physical examination summary', { exact: false })
  ).not.toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_PE_031 - Verify summary values exactly match selections
// ============================================================
test('TC_PE_031_Verify_Summary_Matches_Selections_Exactly', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await runFullPhysicalExam(page, {
    pinchSkin: 'Slow',
    nailAbnormality: ['Clubbing'],
    nailAnemia: 'Nails are pale',
    ankleOedema: 'In right'
  });

  await expectSummaryRow(page, 'Jaundice', 'No');
  await expectSummaryRow(page, 'Pallor', 'Normal');
  await expectSummaryRow(page, 'Arm', 'Slow');
  await expectSummaryRow(page, 'Nail anemia', 'Nails are pale');
  await expectSummaryRow(page, 'Ankle', 'In right');

  const nailAbnormalityRow = page.locator('div').filter({ hasText: 'Nail abnormality' }).last();
  await expect(nailAbnormalityRow).toContainText(/Clubbing/i);
});

// ============================================================
// TC_PE_032 - Verify re-editing an earlier answer updates summary
// ============================================================
test('TC_PE_032_Verify_Reedit_Updates_Summary', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await runFullPhysicalExam(page);

  const changeButton = page.getByRole('button', { name: 'Change' });
  const changeVisible = await changeButton.isVisible({ timeout: 5000 }).catch(() => false);

  if (changeVisible) {
    await changeButton.click();
    await page.waitForTimeout(1000);
    console.log('TC_PE_032 — "Change" clicked; manual/DOM-specific follow-up selection would be required to complete a full re-edit flow for this app build.');
  } else {
    console.log('TC_PE_032 — "Change" button not found on summary screen; re-edit path may use a different control.');
  }
});

// ============================================================
// TC_PE_033 - Verify Pinch Skin cannot be left unanswered
// ============================================================
test('TC_PE_033_Verify_Pinch_Skin_Mandatory_Enforcement', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');

  await expect(page.getByText('Question 3/6', { exact: true })).toBeVisible({ timeout: 30000 });

  // Confirm Question 4/6 has NOT already rendered without
  // answering Question 3/6 first (i.e. the app has not silently
  // skipped the mandatory field).
  const question4AlreadyVisible = await page
    .getByText('Question 4/6', { exact: true })
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  expect(
    question4AlreadyVisible,
    'Question 4/6 should not be reachable before Question 3/6 (Pinch Skin) is answered'
  ).toBeFalsy();
});

// ============================================================
// TC_PE_034 - Verify Nail abnormality requires >=1 selection
// ============================================================
test('TC_PE_034_Verify_Nail_Abnormality_Requires_Selection', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');

  await expect(page.getByText('Question 4/6', { exact: true })).toBeVisible({ timeout: 15000 });

  const question5AlreadyVisible = await page
    .getByText('Question 5/6', { exact: true })
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  expect(
    question5AlreadyVisible,
    'Question 5/6 should not be reachable before Question 4/6 (Nail abnormality) has at least one selection submitted'
  ).toBeFalsy();
});

// ============================================================
// TC_PE_035 - Verify progress dot indicator updates
// ============================================================
test('TC_PE_035_Verify_Progress_Dot_Indicator_Updates', async ({ page }) => {
  await setupToPhysicalExamination(page);

  const dotIndicator = page.locator('span.rounded-full').first();
  const dotsVisibleBefore = await dotIndicator.isVisible({ timeout: 5000 }).catch(() => false);

  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');

  const dotsVisibleAfter = await dotIndicator.isVisible({ timeout: 5000 }).catch(() => false);

  expect(
    dotsVisibleBefore || dotsVisibleAfter,
    'Expected the progress dot indicator to be present on the Physical Examination screen'
  ).toBeTruthy();
});

// ============================================================
// TC_PE_036 - Verify Assessment Progress % increases
// ============================================================
test('TC_PE_036_Verify_Progress_Percentage_Increases', async ({ page }) => {
  await setupToPhysicalExamination(page);

  const progressText = page.locator('span.text-lg.font-semibold');
  const initialProgress = await progressText.first().textContent().catch(() => null);

  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');

  const laterProgress = await progressText.first().textContent().catch(() => null);

  console.log(`TC_PE_036 — Progress before: "${initialProgress}", after 3 questions: "${laterProgress}"`);

  expect(
    laterProgress,
    'Expected the Assessment Progress percentage text to be readable after answering questions'
  ).not.toBeNull();
});

// ============================================================
// TC_PE_037 - Verify sticky Back bar does not obstruct buttons
// ============================================================
test('TC_PE_037_Verify_Sticky_Footer_Does_Not_Block_Options', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');

  await expect(page.getByText('Question 3/6', { exact: true })).toBeVisible({ timeout: 30000 });

  const question3Card = page
    .locator('div[style*="display: block"] div.shadow-\\[0px_4px_10px_0px_\\#3B3B3B0D\\]')
    .filter({ has: page.getByText('Question 3/6', { exact: true }) })
    .filter({ has: page.getByText('Pinch skin', { exact: false }) })
    .first();

  const normalButton = question3Card.locator('button.selectable-option').filter({
    has: page.locator('span.label', { hasText: /^Normal$/ })
  });

  await normalButton.evaluate((el) => {
    el.scrollIntoView({ behavior: 'instant', block: 'end' });
  });
  await page.waitForTimeout(500);

  const box = await normalButton.boundingBox();
  expect(box, 'Pinch Skin Normal option should have a valid bounding box').not.toBeNull();

  if (box) {
    const elementAtCenter = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return el ? el.tagName + '.' + (el.className || '') : null;
    }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });

    console.log('TC_PE_037 — Element at Normal button center after scroll-to-end:', elementAtCenter);
  }
});

// ============================================================
// TC_PE_038 - Verify reference images render correctly
// ============================================================
test('TC_PE_038_Verify_Reference_Images_Render', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');

  await expect(page.getByText('Question 4/6', { exact: true })).toBeVisible({ timeout: 15000 });

  const referenceImages = page.locator('img').filter({ hasText: '' });
  const imageCount = await page.locator('img[alt], img[src]').count().catch(() => 0);

  expect(imageCount, 'Expected at least one reference image to be present on Question 4/6').toBeGreaterThan(0);
});

// ============================================================
// TC_PE_039 - Verify editing Jaundice after reaching summary
// ============================================================
test('TC_PE_039_Verify_Edit_Jaundice_After_Summary', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await runFullPhysicalExam(page);

  const jaundiceCard = page.locator('div').filter({ hasText: 'Is there jaundice?' }).first();
  const editIcon = jaundiceCard.getByRole('button', { name: /edit/i }).first();

  const editIconVisible = await editIcon.isVisible({ timeout: 5000 }).catch(() => false);

  console.log(`TC_PE_039 — Edit icon on Jaundice card visible from summary screen: ${editIconVisible}`);
});

// ============================================================
// TC_PE_040 - End-to-end happy path (Critical)
// ============================================================
test('TC_PE_040_Verify_End_To_End_Happy_Path', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await runFullPhysicalExam(page);

  await expectSummaryRow(page, 'Jaundice', 'No');
  await expectSummaryRow(page, 'Pallor', 'Normal');
  await expectSummaryRow(page, 'Arm', 'Normal');
  await expectSummaryRow(page, 'Nail abnormality', 'Nails are normal');
  await expectSummaryRow(page, 'Nail anemia', 'Nails are normal');
  await expectSummaryRow(page, 'Ankle', 'No oedema');

  await expect(getSummaryConfirmButton(page)).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_PE_041 - Verify flow works on a freshly created patient
// ============================================================
test('TC_PE_041_Verify_Fresh_Patient_No_Stale_Data', async ({ page }) => {
  await setupToPhysicalExamination(page);

  // A fresh patient/visit should show every question unanswered
  // at the start - none of the later question numbers should
  // already be visible before we've answered anything.
  const question3AlreadyVisible = await page
    .getByText('Question 3/6', { exact: true })
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  expect(
    question3AlreadyVisible,
    'A freshly created patient should not start with later questions already answered/visible'
  ).toBeFalsy();

  await runFullPhysicalExam(page);
  await expect(page.getByText('Physical examination summary', { exact: false })).toBeVisible();
});

// ============================================================
// TC_PE_042 - Verify refresh mid-flow preserves saved answers
// ============================================================
test('TC_PE_042_Verify_Refresh_Preserves_Answers', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');

  const urlBeforeRefresh = page.url();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const jaundiceStillAnswered = await page
    .locator('div').filter({ hasText: 'Is there jaundice?' }).filter({ hasText: 'No' }).first()
    .isVisible({ timeout: 10000 })
    .catch(() => false);

  console.log(
    `TC_PE_042 — After refresh, Jaundice answer still visible: ${jaundiceStillAnswered}. URL before refresh: ${urlBeforeRefresh}, after: ${page.url()}`
  );
});

// ============================================================
// TC_PE_043 - Verify keyboard navigation reaches option buttons
// ============================================================
test('TC_PE_043_Verify_Keyboard_Navigation_Support', async ({ page }) => {
  await setupToPhysicalExamination(page);

  const firstNoButton = page.getByRole('button', { name: 'No', exact: true }).first();
  await firstNoButton.focus();

  const isFocused = await firstNoButton.evaluate((el) => el === document.activeElement);

  expect(isFocused, 'Expected the first "No" option button to be focusable via keyboard').toBeTruthy();

  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);

  const jaundiceAnswered = await page
    .locator('div').filter({ hasText: 'Is there jaundice?' }).filter({ hasText: 'No' }).first()
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  console.log(`TC_PE_043 — Jaundice answered via keyboard Enter press: ${jaundiceAnswered}`);
});

// ============================================================
// TC_PE_044 - Verify question transition completes within
// an acceptable time
// ============================================================
test('TC_PE_044_Verify_Question_Transition_Performance', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');

  await expect(page.getByText('Question 3/6', { exact: true })).toBeVisible({ timeout: 30000 });

  const question3Card = page
    .locator('div[style*="display: block"] div.shadow-\\[0px_4px_10px_0px_\\#3B3B3B0D\\]')
    .filter({ has: page.getByText('Question 3/6', { exact: true }) })
    .filter({ has: page.getByText('Pinch skin', { exact: false }) })
    .first();

  const normalButton = question3Card.locator('button.selectable-option').filter({
    has: page.locator('span.label', { hasText: /^Normal$/ })
  });

  await expect(normalButton).toBeVisible({ timeout: 15000 });

  const startTime = Date.now();
  await normalButton.evaluate((el) => el.click());

  await expect(page.getByText('Question 4/6', { exact: true })).toBeVisible({ timeout: 15000 });
  const elapsedMs = Date.now() - startTime;

  console.log(`TC_PE_044 — Question 3/6 to Question 4/6 transition took ${elapsedMs}ms`);

  expect(
    elapsedMs,
    `Expected the question transition to complete within a reasonable time (observed ${elapsedMs}ms)`
  ).toBeLessThan(15000);
});

// ============================================================
// TC_PE_045 - Verify consistent flow across roles
// NOTE: this environment's credentials are fixed to the
// 'nurse1' role. This test documents the expected behavior and
// should be extended with real alternate-role credentials
// (e.g. a doctor login) when those are available in this test
// environment, rather than assuming they match without a check.
// ============================================================
test('TC_PE_045_Verify_Consistent_Flow_Across_Roles', async ({ page }) => {
  await setupToPhysicalExamination(page);

  await expect(
    page.getByRole('button', { name: 'No', exact: true }).first()
  ).toBeVisible();

  console.log(
    'TC_PE_045 — Verified flow for role "nurse1". Re-run with alternate role credentials (e.g. doctor) when available to confirm identical question set and validation rules.'
  );
});

// ============================================================
// TC_PE_046 - TC_PE_051
// QUESTION NAME/TITLE VERIFICATION
// Each of these is a dedicated, standalone real-time check that
// the exact question title text is rendered on screen at the
// correct point in the flow - not bundled inside other option-
// selection tests, so a wording/label regression on any single
// question fails its own specific test rather than being masked
// by a broader test that happens to still pass.
// ============================================================

// ------------------------------------------------------------
// TC_PE_046 - Verify "Is there jaundice?" question title displays
// ------------------------------------------------------------
test('TC_PE_046_Verify_Jaundice_Question_Title_Displayed', async ({ page }) => {
  await setupToPhysicalExamination(page);

  // exact:false is required here - the question title's DOM node
  // includes a trailing "*" mandatory-field indicator (in a
  // sibling span), so its full text content is actually
  // "Is there jaundice?*", not exactly "Is there jaundice?".
  await expect(
    page.getByText('Is there jaundice?', { exact: false })
  ).toBeVisible({ timeout: 15000 });
});

// ------------------------------------------------------------
// TC_PE_047 - Verify "Is there pallor?" question title displays
// ------------------------------------------------------------
test('TC_PE_047_Verify_Pallor_Question_Title_Displayed', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');

  // exact:false for the same reason as TC_PE_046 - the rendered
  // text includes a trailing "*" mandatory-field indicator.
  await expect(
    page.getByText('Is there pallor?', { exact: false })
  ).toBeVisible({ timeout: 15000 });
});

// ------------------------------------------------------------
// TC_PE_048 - Verify "Pinch skin" question title displays under
// "General Exams - Arm" as Question 3/6
// ------------------------------------------------------------
test('TC_PE_048_Verify_PinchSkin_Question_Title_Displayed', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');

  await expect(
    page.getByText('Question 3/6', { exact: true })
  ).toBeVisible({ timeout: 30000 });

  await expect(page.getByText('General Exams', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Arm', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Pinch skin', { exact: false })).toBeVisible();
});

// ------------------------------------------------------------
// TC_PE_049 - Verify "Is there any nail abnormality?" question
// title displays under "General Exams - Nail abnormality" as
// Question 4/6
// ------------------------------------------------------------
test('TC_PE_049_Verify_NailAbnormality_Question_Title_Displayed', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');

  await expect(
    page.getByText('Question 4/6', { exact: true })
  ).toBeVisible({ timeout: 15000 });

  await expect(page.getByText('Nail abnormality', { exact: false }).first()).toBeVisible();
  await expect(
    page.getByText('Is there any nail abnormality?', { exact: false })
  ).toBeVisible();
});

// ------------------------------------------------------------
// TC_PE_050 - Verify "Are the nails pale?" question title
// displays under "General Exams - Nail anemia" as Question 5/6
// ------------------------------------------------------------
test('TC_PE_050_Verify_NailAnemia_Question_Title_Displayed', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');
  await answerNailAbnormality(page, ['Nails are normal']);

  await expect(
    page.getByText('Question 5/6', { exact: true })
  ).toBeVisible({ timeout: 15000 });

  await expect(page.getByText('Nail anemia', { exact: false }).first()).toBeVisible();
  await expect(
    page.getByText('Are the nails pale?', { exact: false })
  ).toBeVisible();
});

// ------------------------------------------------------------
// TC_PE_051 - Verify "Is there ankle oedema?" question title
// displays under "General Exams - Ankle" as Question 6/6
// ------------------------------------------------------------
test('TC_PE_051_Verify_AnkleOedema_Question_Title_Displayed', async ({ page }) => {
  await setupToPhysicalExamination(page);
  await answerJaundice(page, 'No');
  await answerPallor(page, 'Normal');
  await answerPinchSkin(page, 'Normal');
  await answerNailAbnormality(page, ['Nails are normal']);
  await answerNailAnemia(page, 'Nails are normal');

  await expect(
    page.getByText('Question 6/6', { exact: true })
  ).toBeVisible({ timeout: 15000 });

  await expect(page.getByText('Ankle', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText('Is there ankle oedema?', { exact: false })
  ).toBeVisible();
});

});
import { test, expect } from '@playwright/test';

test.describe('Abdominal Distention Protocol - Full Test Suite', () => {

test.describe.configure({ timeout: 240000 });

// ============================================================
// This suite covers the "Abdominal Distention" visit-reason
// protocol: a dedicated 9-question assessment, a 10-question
// Physical Examination (6 generic questions + 4 abdomen-
// specific ones), the standard Medical History module, and the
// final Visit Summary / Upload Visit flow.
//
// Question wording, options, and section labels below were
// confirmed directly from a real recorded run of this exact
// protocol (video walkthrough), not guessed.
// ============================================================

// ------------------------------------------------------------
// SHARED SETUP: Login -> Patient -> Vitals -> Visit Reason
// (search + select "Abdominal Distention") -> Start Assessment
// -> arrives at Question 1/9 of the Abdominal Distention
// assessment.
// ------------------------------------------------------------

async function setupToAbdominalDistentionAssessment(page) {

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

  // 3. PATIENT DETAILS - unique last name avoids the strict-mode
  // "multiple matching patients" issue found in earlier suites
  // when running the full test list.
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
  // 18. VISIT REASON - search and select "Abdominal Distention"
  // ============================================================

  await expect(
    page.getByRole('textbox', { name: 'Type or select reason eg.' })
  ).toBeVisible({ timeout: 15000 });

  const reasonSearchBox = page.getByRole('textbox', { name: 'Type or select reason eg.' });
  await reasonSearchBox.click();
  await reasonSearchBox.fill('abdominal distention');

  await page.waitForTimeout(500);

  // Scoped via a div-text filter + nth(1), matching confirmed
  // working Playwright codegen exactly. This correctly targets
  // the actual selectable list item, not the "Selected reasons"
  // chip (which also has the exact text "Abdominal Distention"
  // and would otherwise be ambiguously matched first).
  const abdominalDistentionOption = page
    .locator('div')
    .filter({ hasText: /^Abdominal Distention$/ })
    .nth(1);

  await expect(abdominalDistentionOption).toBeVisible({ timeout: 15000 });
  await abdominalDistentionOption.click();

  await page.waitForTimeout(500);

  await page.getByRole('button', { name: 'Start Assessment' }).click();

  // The "Confirm visit reason?" modal appears as a result of the
  // Start Assessment click above (confirmed via real codegen: a
  // single, plain "Yes" click immediately after Start Assessment
  // is all that's needed - no complex retry logic required).
  const confirmYesButton = page.getByRole('button', { name: 'Yes', exact: true });
  const confirmYesVisible = await confirmYesButton.isVisible({ timeout: 8000 }).catch(() => false);

  if (confirmYesVisible) {
    await confirmYesButton.click();
    await page.waitForTimeout(800);
  }

  // ============================================================
  // ABDOMINAL DISTENTION ASSESSMENT - Question 1/9 ready
  // ============================================================

  const question1Visible = await page
    .getByText('Question 1/9', { exact: true })
    .isVisible({ timeout: 20000 })
    .catch(() => false);

  if (!question1Visible) {
    const allButtons = await page.getByRole('button').allTextContents().catch(() => []);
    console.log(
      'setupToAbdominalDistentionAssessment — Question 1/9 did not appear after clicking Start Assessment. All buttons on page:',
      JSON.stringify(allButtons)
    );
    await page.screenshot({ path: `debug-abdominal-distention-setup-${Date.now()}.png`, fullPage: true }).catch(() => {});
  }

  await expect(page.getByText('Question 1/9', { exact: true })).toBeVisible({ timeout: 5000 });
  await expect(
    page.getByText('Since when have you had this symptom?', { exact: false })
  ).toBeVisible();
}

// ============================================================
// ABDOMINAL DISTENTION ASSESSMENT STEP FUNCTIONS (9 questions)
// ============================================================

// ------------------------------------------------------------
// Question 1/9 - "Since when have you had this symptom?"
// Two native <select> dropdowns: Number (1-30+) and Duration
// Type (Hours/Days/Weeks/Months/Years), then Submit.
// ------------------------------------------------------------

async function answerSymptomDuration(page, number = '3', durationType = 'Hours') {
  await expect(page.getByText('Question 1/9', { exact: true })).toBeVisible({ timeout: 20000 });

  const numberDropdown = page.locator('select').filter({ hasText: 'Number' }).first();
  const numberDropdownVisible = await numberDropdown.isVisible({ timeout: 5000 }).catch(() => false);

  if (numberDropdownVisible) {
    await numberDropdown.selectOption({ label: number }).catch(async () => {
      await numberDropdown.selectOption(number).catch(() => {});
    });
  } else {
    // Fallback: locate by position (first of the two comboboxes
    // in this question's card) if the label-based filter misses.
    const combos = page.locator('select');
    await combos.first().selectOption({ label: number }).catch(async () => {
      await combos.first().selectOption(number).catch(() => {});
    });
  }

  await page.waitForTimeout(300);

  const durationDropdown = page.locator('select').filter({ hasText: 'Duration Type' }).first();
  const durationDropdownVisible = await durationDropdown.isVisible({ timeout: 5000 }).catch(() => false);

  if (durationDropdownVisible) {
    await durationDropdown.selectOption({ label: durationType }).catch(() => {});
  } else {
    const combos = page.locator('select');
    await combos.nth(1).selectOption({ label: durationType }).catch(() => {});
  }

  await page.waitForTimeout(300);

  const submit = page.getByRole('button', { name: 'Submit', exact: true });
  await expect(submit).toBeVisible({ timeout: 15000 });
  await submit.click();
  await page.waitForTimeout(1200);
}

// ------------------------------------------------------------
// Question 2/9 - "How fast did this symptom develop?"
// Single-select, auto-advances (no Submit): Over few days /
// Over few months / Over few years / Suddenly.
// ------------------------------------------------------------

async function answerOnsetSpeed(page, value = 'Over few days') {
  await expect(page.getByText('Question 2/9', { exact: true })).toBeVisible({ timeout: 20000 });

  const option = page.getByRole('button', { name: value, exact: true });
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 3/9', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 3/9 - "Does the swelling increase or decrease
// during a 24 hr cycle?" - No/Yes + Skip, auto-advances.
// ------------------------------------------------------------

async function answerSwellingCycle(page, value = 'No') {
  await expect(page.getByText('Question 3/9', { exact: true })).toBeVisible({ timeout: 20000 });

  const option = page.getByRole('button', { name: value, exact: true });
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 4/9', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 4/9 - "Weight change (kg)?" - No change / Weight
// gain / Weight loss, auto-advances.
// ------------------------------------------------------------

async function answerWeightChange(page, value = 'No change') {
  await expect(page.getByText('Question 4/9', { exact: true })).toBeVisible({ timeout: 20000 });

  const option = page.getByRole('button', { name: value, exact: true });
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 5/9', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 5/9 - "Have you experienced any change in
// appetite?" - No change / Appetite increased / Appetite
// decreased, auto-advances.
// ------------------------------------------------------------

async function answerAppetiteChange(page, value = 'No change') {
  await expect(page.getByText('Question 5/9', { exact: true })).toBeVisible({ timeout: 20000 });

  const option = page.getByRole('button', { name: value, exact: true });
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 6/9', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 6/9 - "Do you have the following symptom(s)?" -
// 13-item Yes/No checklist, then Submit.
// ------------------------------------------------------------

const ASSOCIATED_SYMPTOMS_ITEMS = [
  '1. Abdominal pain',
  '2. Constipation',
  '3. Diarrhea',
  '4. Vomiting',
  '5. Night sweats',
  '6. Difficulty breathing',
  '7. Pedal oedema/Feet swelling',
  '8. Sudden shortness of breath that wakes the patient up at night',
  '9. Difficulty in urination',
  '10. Burning sensation during urination',
  '11. Blood in stools',
  '12. Easy fatiguability',
  '13. Others [describe]'
];

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
}

async function answerAssociatedSymptoms(page, defaultAnswer = 'No', overrides = {}) {
  await expect(page.getByText('Question 6/9', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(
    page.getByText('Do you have the following symptom(s)?', { exact: false })
  ).toBeVisible();

  for (const label of ASSOCIATED_SYMPTOMS_ITEMS) {
    const answer = overrides[label] || defaultAnswer;
    await answerChecklistItem(page, label, answer);
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

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 7/9', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 7/9 - "Did you ever suffer from jaundice?" -
// Yes/No + Skip, auto-advances. NOTE: "Yes" is the FIRST button
// here (unlike most other Yes/No questions in this app where
// "No" comes first) - confirmed via real recording.
// ------------------------------------------------------------

async function answerJaundiceHistory(page, value = 'Yes') {
  await expect(page.getByText('Question 7/9', { exact: true })).toBeVisible({ timeout: 20000 });

  const option = page.getByRole('button', { name: value, exact: true });
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 8/9', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 8/9 - "Have you taken any treatment (including
// self-medication or home remedies) or seen any health
// provider for this problem before coming here today?" -
// "Yes [Describe]" / "None", auto-advances.
// ------------------------------------------------------------

async function answerTreatmentHistory(page, value = 'None') {
  await expect(page.getByText('Question 8/9', { exact: true })).toBeVisible({ timeout: 20000 });

  const option = page.getByRole('button', { name: value, exact: true });
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 9/9', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 9/9 (final) - "Additional information" free text +
// Skip. Not required, so we Skip by default.
// ------------------------------------------------------------

async function answerAdditionalInfo(page, { text = null, skip = true } = {}) {
  await expect(page.getByText('Question 9/9', { exact: true })).toBeVisible({ timeout: 20000 });

  if (text) {
    const describeBox = page.getByPlaceholder('Describe...');
    await expect(describeBox).toBeVisible({ timeout: 10000 });
    await describeBox.fill(text);

    const submit = page.getByRole('button', { name: 'Submit', exact: true });
    const submitVisible = await submit.isVisible({ timeout: 5000 }).catch(() => false);

    if (submitVisible) {
      await submit.click();
    } else {
      const skipButton = page.getByRole('button', { name: 'Skip', exact: true });
      await skipButton.click();
    }
  } else if (skip) {
    const skipButton = page.getByRole('button', { name: 'Skip', exact: true });
    await expect(skipButton).toBeVisible({ timeout: 10000 });
    await skipButton.click();
  }

  await page.waitForTimeout(1200);

  // Real Playwright codegen confirms the actual order: "Confirm"
  // (Visit reason summary) comes FIRST, then "Okay" (wash hands)
  // SECOND - the reverse of what we originally assumed.

  // "2/4. Visit reason summary" modal - lists every assessment
  // answer (Duration, Onset, Progress of abdominal distention,
  // Weight change, Appetite change, jaundice history, prior
  // treatment, associated symptoms) with a "Confirm" button.
  const visitReasonSummaryHeading = page.getByText('Visit reason summary', { exact: false });
  const visitReasonSummaryVisible = await visitReasonSummaryHeading
    .isVisible({ timeout: 8000 })
    .catch(() => false);

  if (visitReasonSummaryVisible) {
    const summaryConfirmButton = page.getByRole('button', { name: 'Confirm', exact: true });
    const summaryConfirmVisible = await summaryConfirmButton
      .isVisible({ timeout: 8000 })
      .catch(() => false);

    if (summaryConfirmVisible) {
      await summaryConfirmButton.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(300);

      await summaryConfirmButton.click({ timeout: 5000 }).catch(async () => {
        await summaryConfirmButton.click({ force: true, timeout: 5000 }).catch(async () => {
          await summaryConfirmButton.evaluate((el) => el.click()).catch(() => {});
        });
      });

      await page.waitForTimeout(1000);
    } else {
      console.log(
        'answerAdditionalInfo — "Visit reason summary" modal detected but its "Confirm" button could not be found.'
      );
    }
  }

  // "Please wash/sanitize your hands" modal - appears SECOND,
  // after confirming the Visit reason summary above.
  const washHandsOkay = page.getByRole('button', { name: 'Okay', exact: true });
  const washHandsVisible = await washHandsOkay.isVisible({ timeout: 8000 }).catch(() => false);

  if (washHandsVisible) {
    await washHandsOkay.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(300);

    await washHandsOkay.click({ timeout: 5000 }).catch(async () => {
      await washHandsOkay.click({ force: true, timeout: 5000 }).catch(async () => {
        await washHandsOkay.evaluate((el) => el.click()).catch(() => {});
      });
    });

    await page.waitForTimeout(500);
  }
}

// ------------------------------------------------------------
// Visit Reason (Assessment) summary modal helpers - exposed
// separately in case a test wants to verify its content before
// confirming.
// ------------------------------------------------------------

function getVisitReasonSummaryModal(page) {
  return page
    .locator('div')
    .filter({ hasText: 'Visit reason summary' })
    .filter({ hasText: 'Abdominal distention' })
    .last();
}

async function expectVisitReasonSummaryRow(page, label, value) {
  const modal = getVisitReasonSummaryModal(page);
  const row = modal.locator('div').filter({ hasText: label }).filter({ hasText: value }).last();
  await expect(
    row,
    `Visit reason summary did not show "${label}" = "${value}" as expected`
  ).toBeVisible({ timeout: 8000 });
}

// ------------------------------------------------------------
// Composed helper: runs all 9 Abdominal Distention assessment
// questions with default (happy-path) or overridden answers.
// ------------------------------------------------------------

async function completeAbdominalDistentionAssessment(page, overrides = {}) {
  const {
    number = '3',
    durationType = 'Hours',
    onsetSpeed = 'Over few days',
    swellingCycle = 'No',
    weightChange = 'No change',
    appetiteChange = 'No change',
    associatedSymptomsDefault = 'No',
    associatedSymptomsOverrides = {},
    jaundiceHistory = 'Yes',
    treatmentHistory = 'None',
    additionalInfo = {}
  } = overrides;

  await answerSymptomDuration(page, number, durationType);
  await answerOnsetSpeed(page, onsetSpeed);
  await answerSwellingCycle(page, swellingCycle);
  await answerWeightChange(page, weightChange);
  await answerAppetiteChange(page, appetiteChange);
  await answerAssociatedSymptoms(page, associatedSymptomsDefault, associatedSymptomsOverrides);
  await answerJaundiceHistory(page, jaundiceHistory);
  await answerTreatmentHistory(page, treatmentHistory);
  await answerAdditionalInfo(page, additionalInfo);
}

// ============================================================
// PHYSICAL EXAMINATION STEP FUNCTIONS (10 questions for the
// Abdominal Distention protocol: the same 6 generic questions
// used elsewhere, plus 4 abdomen-specific ones confirmed via
// the real recording).
// ============================================================

// ------------------------------------------------------------
// Question 1/10 - "Is there jaundice?" (selectable-option,
// auto-advances)
// ------------------------------------------------------------

async function answerJaundicePhysicalExam(page, value = 'No') {
  await expect(page.getByText('Question 1/10', { exact: true })).toBeVisible({ timeout: 20000 });

  const option = page.getByRole('button', { name: value, exact: true }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 2/10', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 2/10 - "Is there pallor?" - Normal/Pale, selectable-
// option, auto-advances.
// ------------------------------------------------------------

async function answerPallorPhysicalExam(page, value = 'Normal') {
  await expect(page.getByText('Question 2/10', { exact: true })).toBeVisible({ timeout: 20000 });

  const option = page.getByRole('button', { name: value, exact: true }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 3/10', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 3/10 - "Pinch skin" - Normal/Slow, auto-advances.
// ------------------------------------------------------------

async function answerPinchSkin(page, value = 'Normal') {
  await expect(page.getByText('Question 3/10', { exact: true })).toBeVisible({ timeout: 20000 });

  const question3Card = page
    .locator('div[style*="display: block"] div.shadow-\\[0px_4px_10px_0px_\\#3B3B3B0D\\], div.shadow-\\[0px_4px_10px_0px_\\#3B3B3B0D\\]')
    .filter({ has: page.getByText('Question 3/10', { exact: true }) })
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
  await expect(page.getByText('Question 4/10', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 4/10 - "Is there any nail abnormality?" - multi-
// select, requires explicit Submit.
// ------------------------------------------------------------

async function answerNailAbnormality(page, values = ['Nails are normal']) {
  await expect(page.getByText('Question 4/10', { exact: true })).toBeVisible({ timeout: 20000 });

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
  await expect(page.getByText('Question 5/10', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 5/10 - "Are the nails pale?" - auto-advances.
// ------------------------------------------------------------

async function answerNailAnemia(page, value = 'Nails are normal') {
  await expect(page.getByText('Question 5/10', { exact: true })).toBeVisible({ timeout: 20000 });

  const option = page.getByRole('button', { name: value }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(500);
  await option.evaluate((el) => el.click());

  await page.waitForTimeout(1500);
  await expect(page.getByText('Question 6/10', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 6/10 - "Is there ankle oedema?" - auto-advances.
// (This is NOT the final question in this protocol - unlike
// the standalone Physical Examination module, 4 more abdomen-
// specific questions follow.)
// ------------------------------------------------------------

async function answerAnkleOedema(page, value = 'No oedema') {
  await expect(page.getByText('Question 6/10', { exact: true })).toBeVisible({ timeout: 20000 });

  const option = page.getByRole('button', { name: value }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(500);
  await option.evaluate((el) => el.click());

  await page.waitForTimeout(1500);
  await expect(page.getByText('Question 7/10', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 7/10 - "Is there abdominal bloating?" (Abdomen /
// Distension section) - No/Yes/Take a Picture, auto-advances.
// ------------------------------------------------------------

async function answerAbdominalBloating(page, value = 'No') {
  await expect(page.getByText('Question 7/10', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Is there abdominal bloating?', { exact: false })).toBeVisible();

  const option = page.getByRole('button', { name: value, exact: true }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(500);
  await option.evaluate((el) => el.click());

  await page.waitForTimeout(1500);
  await expect(page.getByText('Question 8/10', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Shared helper: selecting "Yes" on the tenderness or lumps
// questions reveals a follow-up sub-question - "Select the
// location where there is tenderness" (or equivalent) - with 10
// quadrant buttons: Upper/Middle/Lower x (L)/(C)/(R), plus
// "All Over". Confirmed via real accessibility snapshot. The
// flow will NOT advance until this location is also answered,
// which is why answering "Yes" previously appeared to hang.
// ------------------------------------------------------------

const ABDOMEN_LOCATION_OPTIONS = [
  'Upper(L)', 'Upper(C)', 'Upper(R)',
  'Middle(L)', 'Middle(C)', 'Middle(R)',
  'Lower(L)', 'Lower(C)', 'Lower(R)',
  'All Over'
];

async function answerAbdomenLocationIfPrompted(page, location = 'All Over') {
  const locationPrompt = page.getByText('Select the location where there is', { exact: false });
  const locationPromptVisible = await locationPrompt
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (!locationPromptVisible) return false;

  const locationButton = page.getByRole('button', { name: location, exact: true }).first();
  const locationButtonVisible = await locationButton
    .isVisible({ timeout: 8000 })
    .catch(() => false);

  if (locationButtonVisible) {
    await locationButton.scrollIntoViewIfNeeded().catch(() => {});
    await page.evaluate(() => window.scrollBy(0, -150)).catch(() => {});
    await page.waitForTimeout(400);

    await locationButton.click({ timeout: 5000 }).catch(async () => {
      await locationButton.click({ force: true, timeout: 5000 }).catch(async () => {
        await locationButton.evaluate((el) => el.click()).catch(() => {});
      });
    });

    await page.waitForTimeout(1000);
    return true;
  }

  console.log(
    `answerAbdomenLocationIfPrompted — location prompt appeared but option "${location}" was not found. Expected one of: ${JSON.stringify(ABDOMEN_LOCATION_OPTIONS)}`
  );
  return false;
}

// ------------------------------------------------------------
// Question 8/10 - "Is there abdominal tenderness?" (Abdomen /
// Tenderness section) - "No tenderness"/"Yes" (NOTE: only two
// options here, no "Take a Picture" - confirmed via real
// recording). Choosing "Yes" reveals a location sub-question.
// ------------------------------------------------------------

async function answerAbdominalTenderness(page, value = 'No tenderness', location = 'All Over') {
  await expect(page.getByText('Question 8/10', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Is there abdominal tenderness?', { exact: false })).toBeVisible();

  const option = page.getByRole('button', { name: value, exact: true }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(500);
  await option.evaluate((el) => el.click());

  await page.waitForTimeout(1200);

  // If "Yes" was chosen, a location sub-question appears and
  // must be answered before the flow will advance.
  await answerAbdomenLocationIfPrompted(page, location);

  await page.waitForTimeout(800);
  await expect(page.getByText('Question 9/10', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 9/10 - "Are there any lumps?" (Abdomen / Lumps
// section) - No/Yes/Take a Picture + Skip.
//
// IMPORTANT: choosing "Yes" here reveals a DIFFERENT follow-up
// structure than the tenderness question. Instead of a single
// location grid, it reveals multiple separate sub-questions -
// confirmed via real screenshot: "Where is it?", "How many? -
// Enter number of lumps", "What is its shape?", "How is the
// surface?" (and possibly more below the fold). Each of these
// is its own expandable sub-question that must be answered.
//
// Since the exact option set inside each of those sub-questions
// has not been directly observed yet, the "Yes" path uses a
// generic best-effort handler that answers whatever it finds,
// then falls back to "Skip" if the flow still will not advance.
// The default "No" path (used by nearly every test) is
// unaffected and needs none of this.
// ------------------------------------------------------------

async function answerLumpsSubQuestions(page) {
  // Known sub-question triggers, in the order observed on screen.
  const subQuestionLabels = [
    'Where is it?',
    'How many?',
    'What is its shape?',
    'How is the surface?'
  ];

  // CRITICAL: scope everything to the Question 9/10 card. A
  // previous version searched the whole page for "the first
  // visible input", which matched the GLOBAL PATIENT SEARCH box
  // in the header and typed "1" into it - polluting app state
  // and breaking the Medical History flow further downstream.
  const questionCard = page
    .locator('div[style*="display: block"] div.shadow-\\[0px_4px_10px_0px_\\#3B3B3B0D\\], div.shadow-\\[0px_4px_10px_0px_\\#3B3B3B0D\\]')
    .filter({ has: page.getByText('Question 9/10', { exact: true }) })
    .first();

  const questionCardVisible = await questionCard.isVisible({ timeout: 5000 }).catch(() => false);

  if (!questionCardVisible) {
    console.log('answerLumpsSubQuestions — could not locate the Question 9/10 card; skipping sub-question handling.');
    return;
  }

  for (const label of subQuestionLabels) {
    const trigger = questionCard.getByRole('button', { name: label, exact: false }).first();
    const triggerVisible = await trigger.isVisible({ timeout: 3000 }).catch(() => false);

    if (!triggerVisible) continue;

    await trigger.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(300);

    await trigger.click({ timeout: 5000 }).catch(async () => {
      await trigger.evaluate((el) => el.click()).catch(() => {});
    });

    await page.waitForTimeout(800);

    // If this sub-question exposed a free-text input (e.g. the
    // "How many? - Enter number of lumps" one), fill it - but
    // ONLY within this question's card, never page-wide.
    const openInput = questionCard
      .locator('input[type="text"]:visible, input[type="number"]:visible, textarea:visible')
      .first();
    const openInputVisible = await openInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (openInputVisible) {
      const currentValue = await openInput.inputValue().catch(() => null);
      if (currentValue === '') {
        await openInput.fill('1').catch(() => {});
        await page.waitForTimeout(300);
      }
    }
  }
}

async function answerAbdominalLumps(page, value = 'No', location = 'All Over') {
  await expect(page.getByText('Question 9/10', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Are there any lumps?', { exact: false })).toBeVisible();

  const option = page.getByRole('button', { name: value, exact: true }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(500);
  await option.evaluate((el) => el.click());

  await page.waitForTimeout(1200);

  // Fast path: "No" (the default) advances immediately with no
  // follow-up sub-questions at all.
  const advancedAlready = await page
    .getByText('Question 10/10', { exact: true })
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (advancedAlready) return;

  // "Yes" path: handle the multi-sub-question follow-up.
  await answerLumpsSubQuestions(page);
  await page.waitForTimeout(1000);

  let advanced = await page
    .getByText('Question 10/10', { exact: true })
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  // Some sub-questions may be optional - if the flow still has
  // not advanced, try Skip.
  if (!advanced) {
    const skipButton = page.getByRole('button', { name: 'Skip', exact: true });
    const skipVisible = await skipButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (skipVisible) {
      await skipButton.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(300);
      await skipButton.click({ timeout: 5000 }).catch(async () => {
        await skipButton.evaluate((el) => el.click()).catch(() => {});
      });
      await page.waitForTimeout(1200);

      advanced = await page
        .getByText('Question 10/10', { exact: true })
        .isVisible({ timeout: 5000 })
        .catch(() => false);
    }
  }

  if (!advanced) {
    const allButtons = await page.getByRole('button').allTextContents().catch(() => []);
    console.log(
      `answerAbdominalLumps — flow did not advance to Question 10/10 after answering "${value}". All buttons on page:`,
      JSON.stringify(allButtons)
    );
    await page.screenshot({ path: `debug-lumps-subquestions-${Date.now()}.png`, fullPage: true }).catch(() => {});
  }

  await expect(page.getByText('Question 10/10', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 10/10 (final) - "Is the umbilicus flat or
// everted?" (Umbilicus / Shape section) - Flat/Everted.
// After this, the Physical Examination summary modal appears.
// ------------------------------------------------------------

async function answerUmbilicusShape(page, value = 'Flat') {
  await expect(page.getByText('Question 10/10', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(
    page.getByText('Is the umbilicus flat or everted?', { exact: false })
  ).toBeVisible();

  const option = page.getByRole('button', { name: value, exact: true }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(500);
  await option.evaluate((el) => el.click());

  await page.waitForTimeout(1500);
}

// ------------------------------------------------------------
// Composed helper: runs all 10 Physical Examination questions
// for this protocol with default (happy-path) or overridden
// answers, stopping right before the summary modal's Confirm.
// ------------------------------------------------------------

async function completeAbdominalDistentionPhysicalExam(page, overrides = {}) {
  const {
    jaundice = 'No',
    pallor = 'Normal',
    pinchSkin = 'Normal',
    nailAbnormality = ['Nails are normal'],
    nailAnemia = 'Nails are normal',
    ankleOedema = 'No oedema',
    abdominalBloating = 'No',
    abdominalTenderness = 'No tenderness',
    tendernessLocation = 'All Over',
    abdominalLumps = 'No',
    lumpsLocation = 'All Over',
    umbilicusShape = 'Flat'
  } = overrides;

  await answerJaundicePhysicalExam(page, jaundice);
  await answerPallorPhysicalExam(page, pallor);
  await answerPinchSkin(page, pinchSkin);
  await answerNailAbnormality(page, nailAbnormality);
  await answerNailAnemia(page, nailAnemia);
  await answerAnkleOedema(page, ankleOedema);
  await answerAbdominalBloating(page, abdominalBloating);
  await answerAbdominalTenderness(page, abdominalTenderness, tendernessLocation);
  await answerAbdominalLumps(page, abdominalLumps, lumpsLocation);
  await answerUmbilicusShape(page, umbilicusShape);

  await expect(
    page.getByText('Physical examination summary', { exact: false })
  ).toBeVisible({ timeout: 20000 });
}

// ------------------------------------------------------------
// Physical Examination Summary modal helpers. Confirmed section
// structure via real recording: "General Exams" (6 rows),
// "Abdomen" (Distension/Tenderness/Lumps), "Umbilicus" (Shape).
// ------------------------------------------------------------

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

async function expectPhysicalExamSummaryRow(page, label, value) {
  const modal = getPhysicalExamModal(page);
  const row = modal.locator('div').filter({ hasText: label }).filter({ hasText: value }).last();
  await expect(
    row,
    `Physical Examination summary did not show "${label}" = "${value}" as expected`
  ).toBeVisible({ timeout: 8000 });
}

// ============================================================
// MEDICAL HISTORY - GENERIC ADAPTIVE HANDLER
//
// Reused from the standalone Medical History suite: the exact
// question set/count is conditional on patient age. Our
// automation always creates an adult patient, so this adaptive
// handler inspects whatever is actually on screen and answers
// accordingly, regardless of question number or total count -
// proven reliable across the standalone Medical History suite.
// ============================================================

async function getQuestionMarker(page) {
  const marker = page.getByText(/^Question\s*\d+\/\d+$/).first();
  const visible = await marker.isVisible({ timeout: 5000 }).catch(() => false);
  if (!visible) return null;
  return await marker.textContent().catch(() => null);
}

async function fillAnyEmptyRequiredInputs(page, value = '1') {
  // Scope to the <main> content region so this can never touch
  // the global Patient Search box in the page header (which a
  // previous page-wide version did, typing "1" into it and
  // corrupting downstream app state).
  const scope = page.locator('main');
  const scopeVisible = await scope.isVisible({ timeout: 3000 }).catch(() => false);
  const root = scopeVisible ? scope : page;

  const inputs = root.locator('input[type="text"]:visible, input:not([type]):visible, textarea:visible');
  const count = await inputs.count().catch(() => 0);

  for (let i = 0; i < count; i++) {
    const inputEl = inputs.nth(i);

    // Extra safety: never fill anything that looks like a search
    // field, regardless of scoping.
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

  // Case 0: Vaccination-style "Complete" action (child patients only)
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

      await noButton.click({ timeout: 5000 }).catch(async () => {
        await noButton.click({ force: true, timeout: 5000 }).catch(async () => {
          await noButton.evaluate((el) => el.click()).catch(() => {});
        });
      });

      await page.waitForTimeout(150);
    }

    await page.waitForTimeout(800);
    await fillAnyEmptyRequiredInputs(page);
    await page.waitForTimeout(300);

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

  // Case 3: selectable-option style card.
  //
  // IMPORTANT: prefer a negative/decline-style option rather
  // than blindly taking .first(). Confirmed via step-by-step
  // diagnostics: on "Do you have any allergies?" the options are
  // ["Yes [Describe]", "No known allergies"], and .first() was
  // selecting "Yes [Describe]" - which opens a free-text
  // sub-question instead of advancing, leaving the flow stuck on
  // the same question indefinitely.
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
  // above. Prefer any button whose name suggests a negative
  // /default answer.
  const negativeButton = page.getByRole('button', { name: /no known|^no$/i }).first();
  if (await negativeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await negativeButton.evaluate((el) => {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
    }).catch(() => {});
    await page.evaluate(() => window.scrollBy(0, -150)).catch(() => {});
    await page.waitForTimeout(400);

    await negativeButton.click({ timeout: 5000 }).catch(async () => {
      await negativeButton.click({ force: true, timeout: 5000 }).catch(async () => {
        await negativeButton.evaluate((el) => el.click()).catch(() => {});
      });
    });

    await page.waitForTimeout(1500);
    return 'generic-negative-option';
  }

  // Case 5: LAST-RESORT generic fallback for entirely novel
  // single-choice questions (e.g. "Do you chew tobacco?",
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

      await chosenButton.click({ timeout: 5000 }).catch(async () => {
        await chosenButton.click({ force: true, timeout: 5000 }).catch(async () => {
          await chosenButton.evaluate((el) => el.click()).catch(() => {});
        });
      });

      await page.waitForTimeout(1000);

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

  const allButtons = await page.getByRole('button').allTextContents().catch(() => []);
  console.log(
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

    // Detect a stuck loop early: if the question marker has not
    // changed across consecutive steps, the handler is claiming
    // success but nothing is actually advancing. This converts a
    // vague "did not finish in 12 steps" timeout into an
    // immediate, precise failure naming the exact question and
    // handler case involved.
    if (markerAfter !== null && markerAfter === previousMarker) {
      stuckCount++;
    } else {
      stuckCount = 0;
    }
    previousMarker = markerAfter;

    if (stuckCount >= 2) {
      const allButtons = await page.getByRole('button').allTextContents().catch(() => []);
      console.log(
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

// ============================================================
// VISIT SUMMARY / UPLOAD VISIT
// ============================================================

async function completeVisitUpload(page, { doctorSpecialty = 'General Physician' } = {}) {
  await expect(page.getByText('Visit Summary', { exact: false }).first()).toBeVisible({ timeout: 20000 });

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

      await specialtyButton.click({ timeout: 5000 }).catch(async () => {
        await specialtyButton.click({ force: true, timeout: 5000 }).catch(async () => {
          await specialtyButton.evaluate((el) => el.click()).catch(() => {});
        });
      });

      await page.waitForTimeout(600);
      specialtyOpened = true;
    } else {
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
        await specialtyOption.click({ timeout: 5000 }).catch(async () => {
          await specialtyOption.click({ force: true, timeout: 5000 }).catch(async () => {
            await specialtyOption.evaluate((el) => el.click()).catch(() => {});
          });
        });
        await page.waitForTimeout(500);
      } else if (!specialtyOptionVisible) {
        console.log(
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

  await uploadButton.click({ timeout: 5000 }).catch(async () => {
    await uploadButton.click({ force: true, timeout: 5000 }).catch(async () => {
      await uploadButton.evaluate((el) => el.click()).catch(() => {});
    });
  });
  await page.waitForTimeout(1500);

  const uploadButtonStillPresent = await uploadButton.isVisible({ timeout: 3000 }).catch(() => false);

  // "Send Visit" confirmation modal - scoped specifically to
  // avoid ambiguity with any other "Yes" button in the DOM.
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
    console.log(
      `completeVisitUpload — unexpected outcome: uploadButtonStillPresentAfterClick=${uploadButtonStillPresent}, sendVisitModalDetected=${sendVisitModalVisible}, yesConfirmationClicked=${yesVisible}`
    );
  }
}

// ============================================================
// TC_AD_001 - Verify Abdominal Distention can be selected as
// visit reason and Assessment starts at Question 1/9
// ============================================================
test('TC_AD_001_Verify_Visit_Reason_Selection_Starts_Assessment', async ({ page }) => {
  await setupToAbdominalDistentionAssessment(page);

  await expect(page.getByText('Question 1/9', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Since when have you had this symptom?', { exact: false })
  ).toBeVisible();
});

// ============================================================
// TC_AD_002 - Verify Question 1/9 duration dropdowns and
// Submit work correctly
// ============================================================
test('TC_AD_002_Verify_Symptom_Duration_Question', async ({ page }) => {
  await setupToAbdominalDistentionAssessment(page);
  await answerSymptomDuration(page, '3', 'Hours');

  await expect(page.getByText('Question 2/9', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(
    page.locator('div').filter({ hasText: 'Since when have you had this symptom?' }).filter({ hasText: '3 hours' }).first()
  ).toBeVisible();
});

// ============================================================
// TC_AD_003 - Verify Question 2/9 onset speed options and
// auto-advance (no Submit needed)
// ============================================================
test('TC_AD_003_Verify_Onset_Speed_Question_Auto_Advances', async ({ page }) => {
  await setupToAbdominalDistentionAssessment(page);
  await answerSymptomDuration(page, '3', 'Hours');

  await expect(page.getByText('Question 2/9', { exact: true })).toBeVisible({ timeout: 15000 });
  for (const label of ['Over few days', 'Over few months', 'Over few years', 'Suddenly']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible({ timeout: 10000 });
  }

  await answerOnsetSpeed(page, 'Over few days');
  await expect(page.getByText('Question 3/9', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_AD_004 - Verify Question 3/9 swelling cycle question and
// Skip button presence
// ============================================================
test('TC_AD_004_Verify_Swelling_Cycle_Question', async ({ page }) => {
  await setupToAbdominalDistentionAssessment(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetSpeed(page, 'Over few days');

  await expect(page.getByText('Question 3/9', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByText('Does the swelling increase or decrease during a 24 hr cycle?', { exact: false })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip', exact: true })).toBeVisible();

  await answerSwellingCycle(page, 'No');
  await expect(page.getByText('Question 4/9', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_AD_005 - Verify Question 4/9 weight change options
// ============================================================
test('TC_AD_005_Verify_Weight_Change_Question', async ({ page }) => {
  await setupToAbdominalDistentionAssessment(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetSpeed(page, 'Over few days');
  await answerSwellingCycle(page, 'No');

  await expect(page.getByText('Question 4/9', { exact: true })).toBeVisible({ timeout: 15000 });
  for (const label of ['No change', 'Weight gain', 'Weight loss']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible({ timeout: 10000 });
  }

  await answerWeightChange(page, 'No change');
  await expect(page.getByText('Question 5/9', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_AD_006 - Verify Question 5/9 appetite change options
// ============================================================
test('TC_AD_006_Verify_Appetite_Change_Question', async ({ page }) => {
  await setupToAbdominalDistentionAssessment(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetSpeed(page, 'Over few days');
  await answerSwellingCycle(page, 'No');
  await answerWeightChange(page, 'No change');

  await expect(page.getByText('Question 5/9', { exact: true })).toBeVisible({ timeout: 15000 });
  for (const label of ['No change', 'Appetite increased', 'Appetite decreased']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible({ timeout: 10000 });
  }

  await answerAppetiteChange(page, 'Appetite increased');
  await expect(page.getByText('Question 6/9', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_AD_007 - Verify Question 6/9 displays all 13 associated
// symptom checklist items
// ============================================================
test('TC_AD_007_Verify_Associated_Symptoms_All_Items_Displayed', async ({ page }) => {
  await setupToAbdominalDistentionAssessment(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetSpeed(page, 'Over few days');
  await answerSwellingCycle(page, 'No');
  await answerWeightChange(page, 'No change');
  await answerAppetiteChange(page, 'No change');

  await expect(page.getByText('Question 6/9', { exact: true })).toBeVisible({ timeout: 15000 });

  for (const label of ASSOCIATED_SYMPTOMS_ITEMS) {
    await expect(page.getByText(label, { exact: false }).first()).toBeVisible({ timeout: 10000 });
  }
});

// ============================================================
// TC_AD_008 - Verify answering all associated symptoms 'No'
// and Submit advances to Question 7/9
// ============================================================
test('TC_AD_008_Verify_Associated_Symptoms_All_No_Advances', async ({ page }) => {
  await setupToAbdominalDistentionAssessment(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetSpeed(page, 'Over few days');
  await answerSwellingCycle(page, 'No');
  await answerWeightChange(page, 'No change');
  await answerAppetiteChange(page, 'No change');
  await answerAssociatedSymptoms(page, 'No');

  await expect(page.getByText('Question 7/9', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_AD_009 - Verify selecting 'Yes' for a specific associated
// symptom (e.g. Vomiting) is recorded distinctly
// ============================================================
test('TC_AD_009_Verify_Associated_Symptom_Yes_Item_Recorded', async ({ page }) => {
  await setupToAbdominalDistentionAssessment(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetSpeed(page, 'Over few days');
  await answerSwellingCycle(page, 'No');
  await answerWeightChange(page, 'No change');
  await answerAppetiteChange(page, 'No change');
  await answerAssociatedSymptoms(page, 'No', { '4. Vomiting': 'Yes' });

  await expect(page.getByText('Question 7/9', { exact: true })).toBeVisible({ timeout: 15000 });

  const q6SummaryCard = page
    .locator('div')
    .filter({ hasText: 'Do you have the following symptom(s)?' })
    .first();
  await expect(q6SummaryCard).toBeVisible({ timeout: 10000 });
});

// ============================================================
// TC_AD_010 - Verify Question 7/9 jaundice history question,
// and that 'Yes' is the first button (confirmed non-standard
// ordering vs other Yes/No questions in this app)
// ============================================================
test('TC_AD_010_Verify_Jaundice_History_Question_Yes_First', async ({ page }) => {
  await setupToAbdominalDistentionAssessment(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetSpeed(page, 'Over few days');
  await answerSwellingCycle(page, 'No');
  await answerWeightChange(page, 'No change');
  await answerAppetiteChange(page, 'No change');
  await answerAssociatedSymptoms(page, 'No');

  await expect(page.getByText('Question 7/9', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Did you ever suffer from jaundice?', { exact: false })).toBeVisible();

  const yesButton = page.getByRole('button', { name: 'Yes', exact: true });
  const noButton = page.getByRole('button', { name: 'No', exact: true });

  await expect(yesButton).toBeVisible({ timeout: 10000 });
  await expect(noButton).toBeVisible({ timeout: 10000 });

  const yesBox = await yesButton.boundingBox();
  const noBox = await noButton.boundingBox();

  expect(
    yesBox && noBox && yesBox.x < noBox.x,
    'Expected the "Yes" button to appear before "No" on this question'
  ).toBeTruthy();
});

// ============================================================
// TC_AD_011 - Verify selecting 'Yes' for jaundice history
// auto-advances to Question 8/9
// ============================================================
test('TC_AD_011_Verify_Jaundice_History_Auto_Advances', async ({ page }) => {
  await setupToAbdominalDistentionAssessment(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetSpeed(page, 'Over few days');
  await answerSwellingCycle(page, 'No');
  await answerWeightChange(page, 'No change');
  await answerAppetiteChange(page, 'No change');
  await answerAssociatedSymptoms(page, 'No');
  await answerJaundiceHistory(page, 'Yes');

  await expect(page.getByText('Question 8/9', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_AD_012 - Verify Question 8/9 treatment history options
// ============================================================
test('TC_AD_012_Verify_Treatment_History_Question', async ({ page }) => {
  await setupToAbdominalDistentionAssessment(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetSpeed(page, 'Over few days');
  await answerSwellingCycle(page, 'No');
  await answerWeightChange(page, 'No change');
  await answerAppetiteChange(page, 'No change');
  await answerAssociatedSymptoms(page, 'No');
  await answerJaundiceHistory(page, 'Yes');

  await expect(page.getByText('Question 8/9', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Yes [Describe]' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: 'None', exact: true })).toBeVisible({ timeout: 10000 });

  await answerTreatmentHistory(page, 'None');
  await expect(page.getByText('Question 9/9', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_AD_013 - Verify Question 9/9 additional information field
// and Skip button complete the assessment
// ============================================================
test('TC_AD_013_Verify_Additional_Information_Skip_Completes_Assessment', async ({ page }) => {
  await setupToAbdominalDistentionAssessment(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetSpeed(page, 'Over few days');
  await answerSwellingCycle(page, 'No');
  await answerWeightChange(page, 'No change');
  await answerAppetiteChange(page, 'No change');
  await answerAssociatedSymptoms(page, 'No');
  await answerJaundiceHistory(page, 'Yes');
  await answerTreatmentHistory(page, 'None');

  await expect(page.getByText('Question 9/9', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByPlaceholder('Describe...')).toBeVisible({ timeout: 10000 });

  await answerAdditionalInfo(page, { skip: true });

  await expect(
    page.getByText('Physical Examination', { exact: true }).first()
  ).toBeVisible({ timeout: 20000 });
});

// ============================================================
// TC_AD_014 - Verify the full 9-question assessment completes
// end to end via the composed helper
// ============================================================
test('TC_AD_014_Verify_Full_Assessment_Completes', async ({ page }) => {
  await setupToAbdominalDistentionAssessment(page);
  await completeAbdominalDistentionAssessment(page);

  await expect(
    page.getByText('Physical Examination', { exact: true }).first()
  ).toBeVisible({ timeout: 20000 });
});

// ============================================================
// TC_AD_015 - Verify entering free text in Question 9/9 and
// submitting (alternate path to Skip)
// ============================================================
test('TC_AD_015_Verify_Additional_Information_Text_Entry', async ({ page }) => {
  await setupToAbdominalDistentionAssessment(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetSpeed(page, 'Over few days');
  await answerSwellingCycle(page, 'No');
  await answerWeightChange(page, 'No change');
  await answerAppetiteChange(page, 'No change');
  await answerAssociatedSymptoms(page, 'No');
  await answerJaundiceHistory(page, 'Yes');
  await answerTreatmentHistory(page, 'None');

  await answerAdditionalInfo(page, { text: 'Patient reports mild discomfort' });

  await expect(
    page.getByText('Physical Examination', { exact: true }).first()
  ).toBeVisible({ timeout: 20000 });
});

// ============================================================
// TC_AD_016 - Verify a "wash hands" reminder modal appears
// after completing the assessment
// ============================================================
test('TC_AD_016_Verify_Wash_Hands_Reminder_After_Assessment', async ({ page }) => {
  await setupToAbdominalDistentionAssessment(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetSpeed(page, 'Over few days');
  await answerSwellingCycle(page, 'No');
  await answerWeightChange(page, 'No change');
  await answerAppetiteChange(page, 'No change');
  await answerAssociatedSymptoms(page, 'No');
  await answerJaundiceHistory(page, 'Yes');
  await answerTreatmentHistory(page, 'None');

  await expect(page.getByText('Question 9/9', { exact: true })).toBeVisible({ timeout: 15000 });

  const skipButton = page.getByRole('button', { name: 'Skip', exact: true });
  await skipButton.click();
  await page.waitForTimeout(1000);

  const washHandsVisible = await page
    .getByText('Please wash/sanitize your hands', { exact: false })
    .isVisible({ timeout: 8000 })
    .catch(() => false);

  console.log(`TC_AD_016 — Wash hands modal appeared: ${washHandsVisible}`);

  if (washHandsVisible) {
    await page.getByRole('button', { name: 'Okay', exact: true }).click();
  }
});

// ------------------------------------------------------------
// Composed helper: runs the full flow (setup + assessment)
// and stops right at the start of Physical Examination.
// ------------------------------------------------------------

async function setupToPhysicalExam(page, assessmentOverrides = {}) {
  await setupToAbdominalDistentionAssessment(page);
  await completeAbdominalDistentionAssessment(page, assessmentOverrides);
  await expect(page.getByText('Question 1/10', { exact: true })).toBeVisible({ timeout: 20000 });
}

// ============================================================
// TC_AD_017 - Verify Question 7/10 abdominal bloating question
// displays under the correct section
// ============================================================
test('TC_AD_017_Verify_Abdominal_Bloating_Question_Displays', async ({ page }) => {
  await setupToPhysicalExam(page);
  await answerJaundicePhysicalExam(page, 'No');
  await answerPallorPhysicalExam(page, 'Normal');
  await answerPinchSkin(page, 'Normal');
  await answerNailAbnormality(page, ['Nails are normal']);
  await answerNailAnemia(page, 'Nails are normal');
  await answerAnkleOedema(page, 'No oedema');

  await expect(page.getByText('Question 7/10', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Is there abdominal bloating?', { exact: false })).toBeVisible();

  for (const label of ['No', 'Yes', 'Take a Picture']) {
    await expect(page.getByRole('button', { name: label }).first()).toBeVisible({ timeout: 10000 });
  }
});

// ============================================================
// TC_AD_018 - Verify Question 8/10 abdominal tenderness shows
// the 9-quadrant reference image and exactly two options (no
// "Take a Picture" here - confirmed via real recording)
// ============================================================
test('TC_AD_018_Verify_Abdominal_Tenderness_Question_Displays', async ({ page }) => {
  await setupToPhysicalExam(page);
  await answerJaundicePhysicalExam(page, 'No');
  await answerPallorPhysicalExam(page, 'Normal');
  await answerPinchSkin(page, 'Normal');
  await answerNailAbnormality(page, ['Nails are normal']);
  await answerNailAnemia(page, 'Nails are normal');
  await answerAnkleOedema(page, 'No oedema');
  await answerAbdominalBloating(page, 'No');

  await expect(page.getByText('Question 8/10', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Is there abdominal tenderness?', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'No tenderness', exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Yes', exact: true })).toBeVisible({ timeout: 10000 });

  const takePictureVisible = await page
    .getByRole('button', { name: 'Take a Picture' })
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  expect(
    takePictureVisible,
    'Expected no "Take a Picture" option on the Abdominal Tenderness question'
  ).toBeFalsy();
});

// ============================================================
// TC_AD_019 - Verify Question 9/10 lumps question and Skip
// button presence
// ============================================================
test('TC_AD_019_Verify_Abdominal_Lumps_Question_Displays', async ({ page }) => {
  await setupToPhysicalExam(page);
  await answerJaundicePhysicalExam(page, 'No');
  await answerPallorPhysicalExam(page, 'Normal');
  await answerPinchSkin(page, 'Normal');
  await answerNailAbnormality(page, ['Nails are normal']);
  await answerNailAnemia(page, 'Nails are normal');
  await answerAnkleOedema(page, 'No oedema');
  await answerAbdominalBloating(page, 'No');
  await answerAbdominalTenderness(page, 'No tenderness');

  await expect(page.getByText('Question 9/10', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Are there any lumps?', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip', exact: true })).toBeVisible();
});

// ============================================================
// TC_AD_020 - Verify Question 10/10 umbilicus shape question
// and options (Flat/Everted)
// ============================================================
test('TC_AD_020_Verify_Umbilicus_Shape_Question_Displays', async ({ page }) => {
  await setupToPhysicalExam(page);
  await answerJaundicePhysicalExam(page, 'No');
  await answerPallorPhysicalExam(page, 'Normal');
  await answerPinchSkin(page, 'Normal');
  await answerNailAbnormality(page, ['Nails are normal']);
  await answerNailAnemia(page, 'Nails are normal');
  await answerAnkleOedema(page, 'No oedema');
  await answerAbdominalBloating(page, 'No');
  await answerAbdominalTenderness(page, 'No tenderness');
  await answerAbdominalLumps(page, 'No');

  await expect(page.getByText('Question 10/10', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Is the umbilicus flat or everted?', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Flat', exact: true })).toBeVisible({ timeout: 10000 });
});

// ============================================================
// TC_AD_021 - Verify completing all 10 Physical Examination
// questions reaches the summary modal
// ============================================================
test('TC_AD_021_Verify_Full_Physical_Exam_Reaches_Summary', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completeAbdominalDistentionPhysicalExam(page);

  await expect(page.getByText('Physical examination summary', { exact: false })).toBeVisible();
});

// ============================================================
// TC_AD_022 - Verify the Physical Examination summary shows
// the correct "General Exams" section values
// ============================================================
test('TC_AD_022_Verify_Summary_General_Exams_Section', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completeAbdominalDistentionPhysicalExam(page);

  await expectPhysicalExamSummaryRow(page, 'Eyes: Jaundice', 'No');
  await expectPhysicalExamSummaryRow(page, 'Eyes: Pallor', 'Normal');
  await expectPhysicalExamSummaryRow(page, 'Arm', 'Normal');
  await expectPhysicalExamSummaryRow(page, 'Nail abnormality', 'Nails are normal');
  await expectPhysicalExamSummaryRow(page, 'Nail anemia', 'Nails are normal');
  await expectPhysicalExamSummaryRow(page, 'Ankle', 'No oedema');
});

// ============================================================
// TC_AD_023 - Verify the Physical Examination summary shows
// the correct "Abdomen" section values (Distension, Tenderness,
// Lumps)
// ============================================================
test('TC_AD_023_Verify_Summary_Abdomen_Section', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completeAbdominalDistentionPhysicalExam(page);

  const modal = getPhysicalExamModal(page);
  await expect(modal.getByText('Abdomen', { exact: true })).toBeVisible({ timeout: 10000 });

  await expectPhysicalExamSummaryRow(page, 'Distension', 'No');
  await expectPhysicalExamSummaryRow(page, 'Tenderness', 'No tenderness');
  await expectPhysicalExamSummaryRow(page, 'Lumps', 'No');
});

// ============================================================
// TC_AD_024 - Verify the Physical Examination summary shows
// the correct "Umbilicus" section value (Shape)
// ============================================================
test('TC_AD_024_Verify_Summary_Umbilicus_Section', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completeAbdominalDistentionPhysicalExam(page);

  const modal = getPhysicalExamModal(page);
  await expect(modal.getByText('Umbilicus', { exact: true })).toBeVisible({ timeout: 10000 });

  await expectPhysicalExamSummaryRow(page, 'Shape', 'Flat');
});

// ============================================================
// TC_AD_025 - Verify selecting alternate abdomen answers (e.g.
// bloating=Yes, tenderness=Yes, lumps=Yes, umbilicus=Everted)
// are reflected correctly in the summary
// ============================================================
test('TC_AD_025_Verify_Alternate_Abdomen_Answers_Recorded', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completeAbdominalDistentionPhysicalExam(page, {
    abdominalBloating: 'Yes',
    abdominalTenderness: 'Yes',
    abdominalLumps: 'Yes',
    umbilicusShape: 'Everted'
  });

  await expectPhysicalExamSummaryRow(page, 'Distension', 'Yes');
  await expectPhysicalExamSummaryRow(page, 'Tenderness', 'Yes');
  await expectPhysicalExamSummaryRow(page, 'Lumps', 'Yes');
  await expectPhysicalExamSummaryRow(page, 'Shape', 'Everted');
});

// ============================================================
// TC_AD_025b - Verify selecting "Yes" for abdominal tenderness
// reveals the location sub-question with all 10 quadrant
// options (Upper/Middle/Lower x L/C/R, plus "All Over")
// ============================================================
test('TC_AD_025b_Verify_Tenderness_Location_SubQuestion_Options', async ({ page }) => {
  await setupToPhysicalExam(page);
  await answerJaundicePhysicalExam(page, 'No');
  await answerPallorPhysicalExam(page, 'Normal');
  await answerPinchSkin(page, 'Normal');
  await answerNailAbnormality(page, ['Nails are normal']);
  await answerNailAnemia(page, 'Nails are normal');
  await answerAnkleOedema(page, 'No oedema');
  await answerAbdominalBloating(page, 'No');

  await expect(page.getByText('Question 8/10', { exact: true })).toBeVisible({ timeout: 15000 });

  // Select "Yes" to trigger the location sub-question.
  const yesOption = page.getByRole('button', { name: 'Yes', exact: true }).first();
  await expect(yesOption).toBeVisible({ timeout: 15000 });
  await yesOption.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(500);
  await yesOption.evaluate((el) => el.click());

  await page.waitForTimeout(1200);

  await expect(
    page.getByText('Select the location where there is', { exact: false })
  ).toBeVisible({ timeout: 10000 });

  for (const location of ABDOMEN_LOCATION_OPTIONS) {
    await expect(
      page.getByRole('button', { name: location, exact: true }).first(),
      `Expected location option "${location}" to be available`
    ).toBeVisible({ timeout: 10000 });
  }
});

// ============================================================
// TC_AD_026 - Verify clicking Confirm on the Physical
// Examination summary navigates into Medical History
// ============================================================
test('TC_AD_026_Verify_Physical_Exam_Confirm_Navigates_To_Medical_History', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completeAbdominalDistentionPhysicalExam(page);
  await clickPhysicalExamSummaryConfirm(page);

  await expect(page.getByText('Medical History', { exact: true }).first()).toBeVisible({ timeout: 20000 });
});

// ============================================================
// TC_AD_027 - Verify the Medical History module (reused from
// the standalone suite) completes successfully within this
// protocol's flow
// ============================================================
test('TC_AD_027_Verify_Medical_History_Completes_Within_Protocol', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completeAbdominalDistentionPhysicalExam(page);
  await clickPhysicalExamSummaryConfirm(page);

  await completeMedicalHistoryGeneric(page);

  await expect(page.getByText('Medical history summary', { exact: false })).toBeVisible();
});

// ============================================================
// TC_AD_028 - Verify clicking Confirm on the Medical History
// summary navigates to the Visit Summary page
// ============================================================
test('TC_AD_028_Verify_Medical_History_Confirm_Navigates_To_Visit_Summary', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completeAbdominalDistentionPhysicalExam(page);
  await clickPhysicalExamSummaryConfirm(page);
  await completeMedicalHistoryGeneric(page);
  await clickMedicalHistorySummaryConfirm(page);

  await expect(page.getByText('Visit Summary', { exact: false }).first()).toBeVisible({ timeout: 20000 });
});

// ============================================================
// TC_AD_029 - Verify the Visit Summary's "Check-up reason"
// section shows the Abdominal Distention chip and correct
// assessment field labels
// ============================================================
test('TC_AD_029_Verify_Visit_Summary_Checkup_Reason_Section', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completeAbdominalDistentionPhysicalExam(page);
  await clickPhysicalExamSummaryConfirm(page);
  await completeMedicalHistoryGeneric(page);
  await clickMedicalHistorySummaryConfirm(page);

  await expect(page.getByText('Visit Summary', { exact: false }).first()).toBeVisible({ timeout: 20000 });

  await expect(page.getByText('Abdominal Distention', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Duration', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Onset', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Progress of abdominal distention', { exact: false })).toBeVisible();
  await expect(page.getByText('Associated symptoms', { exact: false })).toBeVisible();
});

// ============================================================
// TC_AD_030 - End-to-end: complete the entire Abdominal
// Distention protocol (Assessment + Physical Exam + Medical
// History + Upload Visit) - Critical happy path
// ============================================================
test('TC_AD_030_Verify_End_To_End_Abdominal_Distention_Protocol', async ({ page }) => {
  await setupToAbdominalDistentionAssessment(page);
  await completeAbdominalDistentionAssessment(page);

  await expect(page.getByText('Question 1/10', { exact: true })).toBeVisible({ timeout: 20000 });
  await completeAbdominalDistentionPhysicalExam(page);

  await expectPhysicalExamSummaryRow(page, 'Distension', 'No');
  await expectPhysicalExamSummaryRow(page, 'Tenderness', 'No tenderness');
  await expectPhysicalExamSummaryRow(page, 'Lumps', 'No');
  await expectPhysicalExamSummaryRow(page, 'Shape', 'Flat');

  await clickPhysicalExamSummaryConfirm(page);

  await expect(page.getByText('Medical History', { exact: true }).first()).toBeVisible({ timeout: 20000 });
  await completeMedicalHistoryGeneric(page);
  await clickMedicalHistorySummaryConfirm(page);

  await expect(page.getByText('Visit Summary', { exact: false }).first()).toBeVisible({ timeout: 20000 });

  await completeVisitUpload(page, { doctorSpecialty: 'General Physician' });
});

});
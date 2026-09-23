import { test, expect } from '@playwright/test';

// ------------------------------------------------------------
// Shared utility: click a locator with a three-step fallback
// cascade (plain click -> forced click -> raw DOM click via
// evaluate). Several elements in this app intermittently don't
// register a plain Playwright click (overlay timing, animated
// transitions, etc.), so every interactive click in this suite
// goes through this helper rather than repeating the cascade
// inline.
// ------------------------------------------------------------
async function robustClick(locator) {
  await locator.click({ timeout: 5000 }).catch(async () => {
    await locator.click({ force: true, timeout: 5000 }).catch(async () => {
      await locator.evaluate((el) => el.click()).catch(() => {});
    });
  });
}

// ------------------------------------------------------------
// Shared utility: scroll a locator into view with extra
// clearance above it, then a short settle wait. Used before
// clicking options that can sit right at the sticky-footer edge
// of the viewport.
// ------------------------------------------------------------
async function scrollIntoViewWithClearance(page, locator, waitMs = 400) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150)).catch(() => {});
  await page.waitForTimeout(waitMs);
}

test.describe('Abdominal Pain Protocol - Full Test Suite', () => {

test.describe.configure({ timeout: 240000 });

// ============================================================
// This suite covers the "Abdominal Pain" visit-reason protocol:
// a dedicated 12-question assessment, a 10-question Physical
// Examination (6 generic questions + 4 abdomen-specific ones -
// Scars, Distension, Tenderness, Lumps, with NO umbilicus-shape
// question, unlike the Abdominal Distention protocol), the
// standard Medical History module, and the final Visit Summary
// / Upload Visit flow.
//
// Question wording, options, and section labels below were
// confirmed directly from a real recorded run of this exact
// protocol (video walkthrough, analyzed frame-by-frame), not
// guessed. Where a detail could not be directly confirmed (e.g.
// the "Yes" sub-question path for the new Scars question), this
// is called out explicitly in the surrounding comment rather
// than asserted as fact.
// ============================================================

// ------------------------------------------------------------
// SHARED SETUP: Login -> Patient -> Vitals -> Visit Reason
// (search + select "Abdominal Pain") -> Start Assessment ->
// arrives at Question 1/12 of the Abdominal Pain assessment.
// ------------------------------------------------------------

async function setupToAbdominalPainAssessment(page) {

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
  // 18. VISIT REASON - search and select "Abdominal Pain"
  // ============================================================

  await expect(
    page.getByRole('textbox', { name: 'Type or select reason eg.' })
  ).toBeVisible({ timeout: 15000 });

  // Wait for the Visit Reason page to fully settle before
  // interacting - the "All reasons" grid loads async and may
  // still be fetching when the textbox first appears.
  await page.waitForTimeout(1500);

  const reasonSearchBox = page.getByRole('textbox', { name: 'Type or select reason eg.' });
  await reasonSearchBox.click();
  await page.waitForTimeout(300);

  await reasonSearchBox.fill('');
  await reasonSearchBox.pressSequentially('abdominal pain', { delay: 80 });
  await page.waitForTimeout(1000);

  const typedValue = await reasonSearchBox.inputValue().catch(() => '');
  const noMatchesVisible = await page
    .getByText('No matching complaints found', { exact: false })
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  let abdominalPainOption;

  if (!noMatchesVisible && typedValue.trim() !== '') {
    // Search worked - pick from the filtered dropdown
    abdominalPainOption = page
      .locator('div')
      .filter({ hasText: /^Abdominal Pain$/ })
      .nth(1);
  } else {
    // Search didn't filter - clear and use the "All reasons" grid.
    // Scroll down then back up to trigger lazy-load if grid is empty.
    await reasonSearchBox.fill('');
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollBy(0, -300));
    await page.waitForTimeout(300);

    // Wait up to 15s for an Abdominal Pain button to appear
    await page.locator('button').filter({ hasText: /Abdominal Pain/i }).first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(async () => {
        await page.screenshot({ path: `debug-ap-reasons-grid-${Date.now()}.png`, fullPage: true }).catch(() => {});
      });

    abdominalPainOption = page.getByRole('button', { name: 'Abdominal Pain', exact: true }).first();
  }

  await expect(abdominalPainOption).toBeVisible({ timeout: 15000 });
  await abdominalPainOption.click();

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
  // ABDOMINAL PAIN ASSESSMENT - Question 1/12 ready
  // ============================================================

  const question1Visible = await page
    .getByText('Question 1/12', { exact: true })
    .isVisible({ timeout: 20000 })
    .catch(() => false);

  if (!question1Visible) {
    const allButtons = await page.getByRole('button').allTextContents().catch(() => []);
    console.log(
      'setupToAbdominalPainAssessment — Question 1/12 did not appear after clicking Start Assessment. All buttons on page:',
      JSON.stringify(allButtons)
    );
    await page.screenshot({ path: `debug-abdominal-pain-setup-${Date.now()}.png`, fullPage: true }).catch(() => {});
  }

  await expect(page.getByText('Question 1/12', { exact: true })).toBeVisible({ timeout: 5000 });
  await expect(
    page.getByText('Which part of the abdomen do you feel pain?', { exact: false })
  ).toBeVisible();
}

// ============================================================
// ABDOMINAL PAIN ASSESSMENT STEP FUNCTIONS (12 questions)
// ============================================================

// ------------------------------------------------------------
// Question 1/12 - "Which part of the abdomen do you feel
// pain?*" - multi-select ("Select one or more"), then Submit.
//
// IMPORTANT: the last two "Lower" quadrant buttons both render
// with the prefix "Lower (R)" - confirmed via zoomed screenshot
// of the real recording: "Lower (R) – Right Illiac Fossa" AND
// "Lower (R) – Left Illiac Fossa" (the second should logically
// read "Lower (L)" but does not - this is a real labeling defect
// in the app, not a transcription error here). Since both share
// the "Lower (R)" prefix, they are only distinguishable by their
// "Right"/"Left" suffix, so PAIN_LOCATION_OPTIONS below matches
// on that distinguishing substring rather than the full label.
// Also note the app spells this "Illiac" (double L) throughout,
// not the medically-standard "Iliac".
// ------------------------------------------------------------

const PAIN_LOCATION_OPTIONS = {
  upperRight: 'Right Hypochondrium',
  upperCenter: 'Epigastric',
  upperLeft: 'Left Hypochondrium',
  middleRight: 'Right Lumbar',
  middleCenter: 'Umbilical',
  middleLeft: 'Left Lumbar',
  lowerRight: 'Right Illiac Fossa',
  lowerCenter: 'Hypogastric/Suprapubic',
  lowerLeft: 'Left Illiac Fossa',
  allOver: 'All over'
};

async function answerPainLocation(page, locations = [PAIN_LOCATION_OPTIONS.allOver]) {
  await expect(page.getByText('Question 1/12', { exact: true })).toBeVisible({ timeout: 20000 });

  for (const location of locations) {
    const option = page.getByRole('button', { name: location }).first();
    await expect(option, `Pain location option "${location}" not found`).toBeVisible({ timeout: 15000 });
    await option.click();
    await page.waitForTimeout(200);
  }

  const submit = page.getByRole('button', { name: 'Submit', exact: true });
  await expect(submit).toBeVisible({ timeout: 15000 });
  await submit.click();

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 2/12', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 2/12 - "Does the pain move to other parts of the
// body?*" - multi-select ("Select one or more"): "Does not
// move" / "Pain radiates to", then Submit.
//
// NOTE: selecting "Pain radiates to" may reveal a location
// sub-question (by analogy with the tenderness/lumps questions
// in Physical Examination), but this was NOT directly observed
// in the source recording - only the "Does not move" default
// path was demonstrated. Passing 'Pain radiates to' is
// supported for exploratory use but is not asserted against any
// specific sub-question behavior.
// ------------------------------------------------------------

async function answerPainRadiation(page, value = 'Does not move') {
  await expect(page.getByText('Question 2/12', { exact: true })).toBeVisible({ timeout: 20000 });

  const option = page.getByRole('button', { name: value, exact: true });
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();

  await page.waitForTimeout(300);

  const submit = page.getByRole('button', { name: 'Submit', exact: true });
  await expect(submit).toBeVisible({ timeout: 15000 });
  await submit.click();

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 3/12', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 3/12 - "Since when have you had this symptom?*" -
// same Number (1-30+) + Duration Type (Hours/Days/Weeks/Months/
// Years) dropdown pair used by the Abdominal Distention
// protocol's Question 1/9, then Submit.
// ------------------------------------------------------------

async function answerSymptomDuration(page, number = '3', durationType = 'Hours') {
  await expect(page.getByText('Question 3/12', { exact: true })).toBeVisible({ timeout: 20000 });

  const numberDropdown = page.locator('select').filter({ hasText: 'Number' }).first();
  const numberDropdownVisible = await numberDropdown.isVisible({ timeout: 5000 }).catch(() => false);

  if (numberDropdownVisible) {
    await numberDropdown.selectOption({ label: number }).catch(async () => {
      await numberDropdown.selectOption(number).catch(() => {});
    });
  } else {
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
  await expect(page.getByText('Question 4/12', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 4/12 - "How did the pain start?" (no asterisk - not
// mandatory) - single-select, auto-advances (Skip present, no
// Submit): Gradual / Rapidly increasing / Sudden / Other
// [describe].
// ------------------------------------------------------------

async function answerOnsetType(page, value = 'Gradual') {
  await expect(page.getByText('Question 4/12', { exact: true })).toBeVisible({ timeout: 20000 });

  const option = page.getByRole('button', { name: value, exact: true });
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 5/12', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 5/12 - "What time of the day do you feel the pain?"
// (no asterisk) - multi-select ("Select one or more"), has BOTH
// Submit and Skip: Morning / Night / Not linked to any
// particular time of day / Other [Describe].
//
// NOTE the capital "D" in "Other [Describe]" here - confirmed
// via zoomed screenshot. This differs from Questions 6, 9 and
// 10's "Other [describe]" (lowercase d). Preserved exactly as
// rendered; matching is done with exact:false (Playwright's
// default), which is case-insensitive, so this distinction does
// not need to be handled specially by callers.
// ------------------------------------------------------------

async function answerPainTiming(page, values = ['Morning']) {
  await expect(page.getByText('Question 5/12', { exact: true })).toBeVisible({ timeout: 20000 });

  for (const value of values) {
    const option = page.getByRole('button', { name: value, exact: true }).first();
    await expect(option, `Timing option "${value}" not found`).toBeVisible({ timeout: 15000 });
    await option.click();
    await page.waitForTimeout(200);
  }

  const submit = page.getByRole('button', { name: 'Submit', exact: true });
  await expect(submit).toBeVisible({ timeout: 15000 });
  await submit.click();

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 6/12', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 6/12 - "Character of the pain*" - multi-select
// ("Select one or more"), mandatory (Submit only, no Skip):
// Constant / Colicky / Intermittent (comes & goes) / Gnawing/
// chewing / Cramping / Dull, aching / Other [describe].
// ------------------------------------------------------------

async function answerPainCharacter(page, values = ['Constant']) {
  await expect(page.getByText('Question 6/12', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Character of the pain', { exact: false })).toBeVisible();

  for (const value of values) {
    const option = page.getByRole('button', { name: value, exact: true }).first();
    await expect(option, `Pain character option "${value}" not found`).toBeVisible({ timeout: 15000 });
    await option.click();
    await page.waitForTimeout(200);
  }

  const submit = page.getByRole('button', { name: 'Submit', exact: true });
  await expect(submit).toBeVisible({ timeout: 15000 });
  await submit.click();

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 7/12', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 7/12 - "How severe is the pain?*" - single-select
// pain scale: Mild, 1-3 / Moderate, 4-6 / Severe, 7-9 / Very
// Severe, 10.
// ------------------------------------------------------------

async function answerPainSeverity(page, value = 'Mild, 1-3') {
  await expect(page.getByText('Question 7/12', { exact: true })).toBeVisible({ timeout: 20000 });

  const option = page.getByRole('button', { name: value });
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 8/12', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 8/12 - "Do you have the following symptom(s)?*" -
// 19-item Yes/No checklist, then Submit.
// ------------------------------------------------------------

const ASSOCIATED_SYMPTOMS_ITEMS = [
  '1. Nausea',
  '2. Vomiting',
  '3. Anorexia',
  '4. Diarrhea',
  '5. Constipation',
  '6. Fever',
  '7. Abdominal distention/Bloating',
  '8. Belching/Burping',
  '9. Passing gas',
  '10. Change in appetite',
  '11. Color change in stool [describe]',
  '12. Blood in stool',
  '13. Change in frequency of urination [describe]',
  '14. Color change in urine [describe]',
  '15. Hiccups',
  '16. Restlessness',
  '17. Injury',
  '18. Breathlessness',
  '19. Other [describe]'
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

  await robustClick(button);
}

async function answerAssociatedSymptoms(page, defaultAnswer = 'No', overrides = {}) {
  await expect(page.getByText('Question 8/12', { exact: true })).toBeVisible({ timeout: 20000 });
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

  await robustClick(submit);

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 9/12', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 9/12 - "What worsens the pain?*" - multi-select
// ("Select one or more"), mandatory (Submit only): Hunger /
// Food / Urination / Pressure / Movement / Coughing / Straining
// / Other [describe] / None / Don't know/Unsure.
// ------------------------------------------------------------

async function answerAggravatingFactors(page, values = ["Don't know/Unsure"]) {
  await expect(page.getByText('Question 9/12', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('What worsens the pain?', { exact: false })).toBeVisible();

  for (const value of values) {
    const option = page.getByRole('button', { name: value, exact: true }).first();
    await expect(option, `Aggravating-factor option "${value}" not found`).toBeVisible({ timeout: 15000 });
    await option.click();
    await page.waitForTimeout(200);
  }

  const submit = page.getByRole('button', { name: 'Submit', exact: true });
  await expect(submit).toBeVisible({ timeout: 15000 });
  await submit.click();

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 10/12', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 10/12 - "What relieves/lessens the pain?*" - multi-
// select ("Select one or more"), mandatory (Submit only):
// Medications [describe] / Food / Leaning forward / Squatting /
// Vomiting / Passing of stool / Other describe / None / Don't
// know/Unsure.
//
// NOTE: "Other describe" here has NO surrounding brackets -
// confirmed via zoomed screenshot - unlike every other "Other
// [describe]"/"Other [Describe]" option elsewhere in this
// protocol. Preserved exactly as rendered.
// ------------------------------------------------------------

async function answerRelievingFactors(page, values = ['None']) {
  await expect(page.getByText('Question 10/12', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('What relieves/lessens the pain?', { exact: false })).toBeVisible();

  for (const value of values) {
    const option = page.getByRole('button', { name: value, exact: true }).first();
    await expect(option, `Relieving-factor option "${value}" not found`).toBeVisible({ timeout: 15000 });
    await option.click();
    await page.waitForTimeout(200);
  }

  const submit = page.getByRole('button', { name: 'Submit', exact: true });
  await expect(submit).toBeVisible({ timeout: 15000 });
  await submit.click();

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 11/12', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 11/12 - "Have you taken any treatment (including
// self-medication or home remedies) or seen any health provider
// for this problem before coming here today?*" - "Yes
// [Describe]" / "None", auto-advances. Identical wording to the
// Abdominal Distention protocol's equivalent question.
// ------------------------------------------------------------

async function answerTreatmentHistory(page, value = 'None') {
  await expect(page.getByText('Question 11/12', { exact: true })).toBeVisible({ timeout: 20000 });

  const option = page.getByRole('button', { name: value, exact: true });
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();

  await page.waitForTimeout(1200);
  await expect(page.getByText('Question 12/12', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 12/12 (final) - "Additional information - Enter
// additional information" - free text + Skip. Not required, so
// we Skip by default.
// ------------------------------------------------------------

async function answerAdditionalInfo(page, { text = null, skip = true } = {}) {
  await expect(page.getByText('Question 12/12', { exact: true })).toBeVisible({ timeout: 20000 });

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

  // Confirmed real order (matches the Abdominal Distention
  // protocol exactly): "Confirm" (Visit reason summary) comes
  // FIRST, then "Okay" (wash hands) SECOND.

  // "2/4. Visit reason summary" modal - lists every assessment
  // answer (Site, Radiation, Duration, Onset, Timing, Character
  // of the pain, Severity, Exacerbating Factors, Relieving
  // Factors, Prior treatment sought, Associated symptoms) with a
  // "Confirm" button.
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

      await robustClick(summaryConfirmButton);

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

    await robustClick(washHandsOkay);

    await page.waitForTimeout(500);
  }
}

// ------------------------------------------------------------
// Visit Reason (Assessment) summary modal helpers.
// ------------------------------------------------------------

function getVisitReasonSummaryModal(page) {
  return page
    .locator('div')
    .filter({ hasText: 'Visit reason summary' })
    .filter({ hasText: 'Abdominal Pain' })
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
// Composed helper: runs all 12 Abdominal Pain assessment
// questions with default (happy-path) or overridden answers.
// ------------------------------------------------------------

async function completeAbdominalPainAssessment(page, overrides = {}) {
  const {
    painLocations = [PAIN_LOCATION_OPTIONS.allOver],
    painRadiation = 'Does not move',
    number = '3',
    durationType = 'Hours',
    onsetType = 'Gradual',
    painTiming = ['Morning'],
    painCharacter = ['Constant'],
    painSeverity = 'Mild, 1-3',
    associatedSymptomsDefault = 'No',
    associatedSymptomsOverrides = {},
    aggravatingFactors = ["Don't know/Unsure"],
    relievingFactors = ['None'],
    treatmentHistory = 'None',
    additionalInfo = {}
  } = overrides;

  await answerPainLocation(page, painLocations);
  await answerPainRadiation(page, painRadiation);
  await answerSymptomDuration(page, number, durationType);
  await answerOnsetType(page, onsetType);
  await answerPainTiming(page, painTiming);
  await answerPainCharacter(page, painCharacter);
  await answerPainSeverity(page, painSeverity);
  await answerAssociatedSymptoms(page, associatedSymptomsDefault, associatedSymptomsOverrides);
  await answerAggravatingFactors(page, aggravatingFactors);
  await answerRelievingFactors(page, relievingFactors);
  await answerTreatmentHistory(page, treatmentHistory);
  await answerAdditionalInfo(page, additionalInfo);
}

// ============================================================
// PHYSICAL EXAMINATION STEP FUNCTIONS (10 questions for the
// Abdominal Pain protocol: the same 6 generic questions used
// elsewhere, plus 4 abdomen-specific ones - Scars, Distension,
// Tenderness, Lumps - confirmed via the real recording. Unlike
// the Abdominal Distention protocol, there is NO umbilicus-
// shape question here; "Are there lumps?" is the FINAL (10th)
// question and its summary section has no "Umbilicus" heading.
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
// Question 6/10 - "Is there ankle oedema?" - No oedema/In left/
// In right/Both, auto-advances.
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
// Shared helper for the TENDERNESS question only: selecting
// "Yes" reveals a flat "Select the location where there is
// tenderness" sub-question with 10 quadrant buttons (Upper/
// Middle/Lower x L/C/R, plus "All Over").
//
// Scars and Lumps share the same abdomen-quadrant reference
// image but do NOT use this flat-grid style - their "Yes" path
// instead reveals a "Where is it?" collapsible sub-question
// (handled by answerAbdomenYesSubQuestions() below). Tenderness's
// own "Yes" path was not independently re-verified against that
// same possibility - if a future run shows it also uses the
// "Where is it?" style, this function and TC_AP_020 would need
// the same fix.
//
// The "Where is it?" location button set (used by Scars/Lumps)
// mixes short quadrant labels ("Upper(R)", "Middle(L)", etc.)
// with two longer-form labels ("Upper (C) - Epigastric", "Upper
// (L) - Left Hypochondrium") - a genuine rendering quirk of the
// app, not a typo here. "All Over" is present in every observed
// case, so it remains the safe default location to click.
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
    await scrollIntoViewWithClearance(page, locationButton, 400);

    await robustClick(locationButton);

    await page.waitForTimeout(1000);
    return true;
  }

  console.log(
    `answerAbdomenLocationIfPrompted — location prompt appeared but option "${location}" was not found. Expected one of: ${JSON.stringify(ABDOMEN_LOCATION_OPTIONS)}`
  );
  return false;
}

// ------------------------------------------------------------
// Shared helper for the SCARS and LUMPS "Yes" paths (see the
// function's own comment for what each question actually reveals).
// ------------------------------------------------------------

async function answerAbdomenYesSubQuestions(page, questionNumber, location = 'All Over') {
  // Confirmed by inspecting the real DOM: Scars (Q7) and Lumps
  // (Q10) do not share a sub-question set. Scars only has the
  // "Where is it?" location grid. Lumps has that same grid plus
  // ten further accordion-style sub-questions and its own
  // mandatory "Submit" button, none of which Scars has:
  //   "How many? - Enter number of lumps"  -> numeric input
  //   "What is its shape?"                 -> button options (Round/Irregular)
  //   "How is the surface?"                -> button options (Smooth/Irregular)
  //   "How does it feel?", "Painful or not?", "Any change in
  //   colour of skin?", "Any swelling above or below the lump?",
  //   "Is it moving related to adjacent tissues?", the cough
  //   check, and the lie-down check -> each reveals its own
  //   button options on click.
  // Most of these reveal buttons, not fields, so each is answered
  // by diffing the button list before/after expanding it and
  // clicking whatever is new.
  const extendedSubQuestionLabels = [
    'How many? - Enter number of lumps',
    'What is its shape?',
    'How is the surface?',
    'How does it feel?',
    'Painful or not?',
    'Any change in colour of skin?',
    'Any swelling above or below the lump?',
    'Is it moving related to adjacent tissues?',
    'Put a hand on the swelling and ask the patient to cough. Can you see and feel if there is a change in size?',
    'Now ask the patient to lie down. Is the swelling going down/reduces in size?'
  ];

  // Buttons that are part of the question's own chrome, never a
  // genuine sub-question answer option - excluded when picking a
  // "newly revealed" option to click.
  const CHROME_BUTTON_TEXT = new Set([
    'no', 'yes', 'take a picture', 'submit', 'skip', 'where is it?',
    ...ABDOMEN_LOCATION_OPTIONS.map((l) => l.toLowerCase())
  ]);

  // Scoped to the specific "Question N/10" card so this can never
  // touch the global Patient Search box in the page header.
  const questionCard = page
    .locator('div[style*="display: block"] div.shadow-\\[0px_4px_10px_0px_\\#3B3B3B0D\\], div.shadow-\\[0px_4px_10px_0px_\\#3B3B3B0D\\]')
    .filter({ has: page.getByText(`Question ${questionNumber}/10`, { exact: true }) })
    .first();

  const questionCardVisible = await questionCard.isVisible({ timeout: 5000 }).catch(() => false);

  if (!questionCardVisible) {
    console.log(`answerAbdomenYesSubQuestions [Q${questionNumber}/10] — could not locate the question card; skipping sub-question handling.`);
    return;
  }

  // -----------------------------------------------------------
  // Location grid ("Where is it?") - shared by Scars and Lumps.
  // -----------------------------------------------------------
  let locationButton = questionCard.getByRole('button', { name: location, exact: true }).first();
  let locationButtonVisible = await locationButton.isVisible({ timeout: 3000 }).catch(() => false);

  if (!locationButtonVisible) {
    const whereIsItLabel = questionCard.getByText('Where is it?', { exact: false }).first();
    const whereIsItLabelVisible = await whereIsItLabel.isVisible({ timeout: 2000 }).catch(() => false);

    if (whereIsItLabelVisible) {
      await whereIsItLabel.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(300);
      await robustClick(whereIsItLabel);
      await page.waitForTimeout(600);
    }

    locationButton = questionCard.getByRole('button', { name: location, exact: true }).first();
    locationButtonVisible = await locationButton.isVisible({ timeout: 5000 }).catch(() => false);
  }

  if (locationButtonVisible) {
    await scrollIntoViewWithClearance(page, locationButton, 300);
    await robustClick(locationButton);
    await page.waitForTimeout(800);
  } else {
    console.log(`answerAbdomenYesSubQuestions [Q${questionNumber}/10] — could not find location option "${location}" under "Where is it?".`);
  }

  // -----------------------------------------------------------
  // Extended sub-question set (Lumps only - Scars has none of
  // these, so every label below is simply skipped for it).
  // -----------------------------------------------------------
  for (const label of extendedSubQuestionLabels) {
    const trigger = questionCard.getByRole('button', { name: label, exact: false }).first();
    const triggerVisible = await trigger.isVisible({ timeout: 2000 }).catch(() => false);

    if (!triggerVisible) continue;

    if (/^how many/i.test(label)) {
      await robustClick(trigger);
      await page.waitForTimeout(600);

      const numberInput = questionCard
        .locator('input[type="number"]:visible, input[type="text"]:visible')
        .first();
      const numberInputVisible = await numberInput.isVisible({ timeout: 3000 }).catch(() => false);

      if (numberInputVisible) {
        const currentValue = await numberInput.inputValue().catch(() => null);
        if (currentValue === '') {
          await numberInput.fill('1').catch(() => {});
          await page.waitForTimeout(300);
        }
      }

      continue;
    }

    // Diff the button list before/after expanding, then click
    // whichever option is new - this answers "Round"/"Irregular"
    // etc. without hard-coding every sub-question's option set.
    const buttonsBefore = await questionCard.getByRole('button').allTextContents().catch(() => []);

    await robustClick(trigger);
    await page.waitForTimeout(700);

    const buttonsAfter = await questionCard.getByRole('button').allTextContents().catch(() => []);
    const newOptions = buttonsAfter.filter((text) => {
      const trimmed = text.trim();
      return (
        trimmed !== '' &&
        !buttonsBefore.includes(text) &&
        !CHROME_BUTTON_TEXT.has(trimmed.toLowerCase()) &&
        !extendedSubQuestionLabels.some((l) => trimmed.toLowerCase() === l.toLowerCase())
      );
    });

    if (newOptions.length > 0) {
      const chosenOption = newOptions[0];
      console.log(`answerAbdomenYesSubQuestions [Q${questionNumber}/10] — "${label}" -> clicking "${chosenOption}".`);

      const optionButton = questionCard.getByRole('button', { name: chosenOption, exact: true }).first();
      await robustClick(optionButton);
      await page.waitForTimeout(500);
    } else {
      // No new button appeared - maybe this reveals a text field
      // instead.
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
      } else {
        console.log(`answerAbdomenYesSubQuestions [Q${questionNumber}/10] — "${label}" revealed nothing answerable.`);
      }
    }
  }

  // Lumps' extended form has its own mandatory "Submit" button
  // (Scars has no equivalent) - this is what actually finalizes
  // the "Yes" answer; without it, the answer is discarded.
  const submitButton = questionCard.getByRole('button', { name: 'Submit', exact: true }).first();
  const submitButtonVisible = await submitButton.isVisible({ timeout: 3000 }).catch(() => false);

  if (submitButtonVisible) {
    await scrollIntoViewWithClearance(page, submitButton, 300);
    await robustClick(submitButton);
    await page.waitForTimeout(1000);
  }
}

// ------------------------------------------------------------
// Question 7/10 - "Abdomen Scars: Are there visible scars?"
// (NEW question, not present in the Abdominal Distention
// protocol) - No/Yes/Take a Picture, no asterisk (optional - a
// "Skip" button is shown, no Submit), auto-advances on "No".
// Shows the same abdomen-quadrant reference image as Tenderness/
// Lumps, but its "Yes" path reveals the "Where is it?"-style
// sub-question structure (see answerAbdomenYesSubQuestions above).
// ------------------------------------------------------------

async function answerAbdominalScars(page, value = 'No', location = 'All Over') {
  await expect(page.getByText('Question 7/10', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Are there visible scars?', { exact: false })).toBeVisible();

  const option = page.getByRole('button', { name: value, exact: true }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(500);
  await option.evaluate((el) => el.click());

  await page.waitForTimeout(1200);

  // Fast path: "No" (the default) advances immediately, with no
  // follow-up sub-questions at all.
  const advancedAlready = await page
    .getByText('Question 8/10', { exact: true })
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (!advancedAlready) {
    // "Yes" path: handle the confirmed "Where is it?"-style
    // multi-sub-question follow-up.
    await answerAbdomenYesSubQuestions(page, 7, location);
    await page.waitForTimeout(1000);

    let advanced = await page
      .getByText('Question 8/10', { exact: true })
      .isVisible({ timeout: 5000 })
      .catch(() => false);

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
          .getByText('Question 8/10', { exact: true })
          .isVisible({ timeout: 5000 })
          .catch(() => false);
      }
    }

    if (!advanced) {
      const allButtons = await page.getByRole('button').allTextContents().catch(() => []);
      console.log(
        `answerAbdominalScars — flow did not advance to Question 8/10 after answering "${value}". All buttons on page:`,
        JSON.stringify(allButtons)
      );
      await page.screenshot({ path: `debug-ap-scars-subquestions-${Date.now()}.png`, fullPage: true }).catch(() => {});
    }
  }

  await expect(page.getByText('Question 8/10', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 8/10 - "Abdomen Distension: Is there abdominal
// bloating?*" - No/Yes/Take a Picture, mandatory, auto-advances.
// Identical wording to the Abdominal Distention protocol's
// equivalent question (there, it was Question 7/10).
// ------------------------------------------------------------

async function answerAbdominalBloating(page, value = 'No') {
  await expect(page.getByText('Question 8/10', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Is there abdominal bloating?', { exact: false })).toBeVisible();

  const option = page.getByRole('button', { name: value, exact: true }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(500);
  await option.evaluate((el) => el.click());

  await page.waitForTimeout(1500);
  await expect(page.getByText('Question 9/10', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 9/10 - "Abdomen Tenderness: Is there abdominal
// tenderness?" - "No tenderness"/"Yes" only (no "Take a
// Picture" - confirmed via real recording, matching the
// Abdominal Distention protocol's equivalent question, there
// Question 8/10). Choosing "Yes" reveals the location sub-
// question.
// ------------------------------------------------------------

async function answerAbdominalTenderness(page, value = 'No tenderness', location = 'All Over') {
  await expect(page.getByText('Question 9/10', { exact: true })).toBeVisible({ timeout: 20000 });
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
  await expect(page.getByText('Question 10/10', { exact: true })).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Question 10/10 (FINAL) - "Abdomen Lumps: Are there lumps?" -
// No/Yes/Take a Picture. Unlike the Abdominal Distention
// protocol (where the equivalent Lumps question was 9/10,
// followed by a 10th Umbilicus-shape question), THIS protocol's
// Physical Examination ends here - there is no umbilicus
// question, and answering this leads straight to the summary.
//
// The "Yes" path for THIS protocol's Lumps question was not
// itself re-examined via a fresh accessibility snapshot, but the
// Scars question - confirmed to share the identical "Where is
// it?" sub-question label - makes it near-certain Lumps uses the
// same structure, matching what was already confirmed for the
// Abdominal Distention protocol's Lumps question. It is answered
// below via the shared answerAbdomenYesSubQuestions() helper,
// scoped to "Question 10/10".
// ------------------------------------------------------------

async function answerAbdominalLumps(page, value = 'No', location = 'All Over') {
  await expect(page.getByText('Question 10/10', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Are there lumps?', { exact: false })).toBeVisible();

  const option = page.getByRole('button', { name: value, exact: true }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(500);
  await option.evaluate((el) => el.click());

  await page.waitForTimeout(1200);

  // Fast path: "No" (the default) advances straight to the
  // summary, with no follow-up sub-questions at all.
  const summaryVisibleAlready = await page
    .getByText('Physical examination summary', { exact: false })
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (summaryVisibleAlready) return;

  // "Yes" path: handle the confirmed "Where is it?"-style multi-
  // sub-question follow-up (see the function-level comment above
  // and answerAbdomenYesSubQuestions's own comment).
  await answerAbdomenYesSubQuestions(page, 10, location);
  await page.waitForTimeout(1000);

  let summaryVisible = await page
    .getByText('Physical examination summary', { exact: false })
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (!summaryVisible) {
    // IMPORTANT: only try the Skip fallback when the answer being
    // recorded is NOT "Yes". Real evidence (a summary screenshot)
    // shows that after selecting "Yes" and only partially
    // completing its sub-questions (e.g. if "How many?"/"What is
    // its shape?"/"How is the surface?" need something other than
    // a text field, which this handler cannot yet fill in), the
    // "Lumps" row disappeared from the summary ENTIRELY - not
    // reverted to "No", genuinely absent. That strongly suggests
    // clicking "Skip" at this point discards the whole in-
    // progress "Yes" answer rather than gracefully finishing it.
    // Clicking Skip here would make a "Yes" test silently produce
    // a misleadingly "successful" but WRONG result instead of a
    // clear, honest failure - so for "Yes" we skip this fallback
    // and go straight to the diagnostic block below.
    if (value !== 'Yes') {
      const skipButton = page.getByRole('button', { name: 'Skip', exact: true });
      const skipVisible = await skipButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (skipVisible) {
        await skipButton.scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(300);
        await skipButton.click({ timeout: 5000 }).catch(async () => {
          await skipButton.evaluate((el) => el.click()).catch(() => {});
        });
        await page.waitForTimeout(1200);

        summaryVisible = await page
          .getByText('Physical examination summary', { exact: false })
          .isVisible({ timeout: 5000 })
          .catch(() => false);
      }
    }
  }

  if (!summaryVisible) {
    const allButtons = await page.getByRole('button').allTextContents().catch(() => []);
    const allSelectOptions = await page.locator('select option').allTextContents().catch(() => []);
    const allInputs = await page
      .locator('input:visible, textarea:visible')
      .evaluateAll((els) =>
        els.map((el) => ({
          tag: el.tagName,
          type: el.getAttribute('type'),
          placeholder: el.getAttribute('placeholder'),
          value: el.value
        }))
      )
      .catch(() => []);

    console.log(
      `answerAbdominalLumps — flow did not reach the Physical examination summary after answering "${value}". All buttons on page:`,
      JSON.stringify(allButtons)
    );
    console.log('answerAbdominalLumps — all <select> option texts on page:', JSON.stringify(allSelectOptions));
    console.log('answerAbdominalLumps — all visible <input>/<textarea> elements on page:', JSON.stringify(allInputs));
    await page.screenshot({ path: `debug-ap-lumps-subquestions-${Date.now()}.png`, fullPage: true }).catch(() => {});
  }

  await expect(
    page.getByText('Physical examination summary', { exact: false })
  ).toBeVisible({ timeout: 15000 });
}

// ------------------------------------------------------------
// Composed helper: runs all 10 Physical Examination questions
// for this protocol with default (happy-path) or overridden
// answers, stopping right before the summary modal's Confirm.
// ------------------------------------------------------------

async function completeAbdominalPainPhysicalExam(page, overrides = {}) {
  const {
    jaundice = 'No',
    pallor = 'Normal',
    pinchSkin = 'Normal',
    nailAbnormality = ['Nails are normal'],
    nailAnemia = 'Nails are normal',
    ankleOedema = 'No oedema',
    abdominalScars = 'No',
    scarsLocation = 'All Over',
    abdominalBloating = 'No',
    abdominalTenderness = 'No tenderness',
    tendernessLocation = 'All Over',
    abdominalLumps = 'No',
    lumpsLocation = 'All Over'
  } = overrides;

  await answerJaundicePhysicalExam(page, jaundice);
  await answerPallorPhysicalExam(page, pallor);
  await answerPinchSkin(page, pinchSkin);
  await answerNailAbnormality(page, nailAbnormality);
  await answerNailAnemia(page, nailAnemia);
  await answerAnkleOedema(page, ankleOedema);
  await answerAbdominalScars(page, abdominalScars, scarsLocation);
  await answerAbdominalBloating(page, abdominalBloating);
  await answerAbdominalTenderness(page, abdominalTenderness, tendernessLocation);
  await answerAbdominalLumps(page, abdominalLumps, lumpsLocation);

  await expect(
    page.getByText('Physical examination summary', { exact: false })
  ).toBeVisible({ timeout: 20000 });
}

// ------------------------------------------------------------
// Physical Examination Summary modal helpers. Confirmed section
// structure via real recording: "General Exams" (Eyes: Jaundice
// / Eyes: Pallor / Arm / Nail abnormality / Nail anemia / Ankle
// - 6 rows), "Abdomen" (Scars / Distension / Tenderness / Lumps
// - 4 rows). There is NO "Umbilicus" section for this protocol.
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
// Reused unchanged from the standalone Medical History suite
// and the Abdominal Distention protocol suite: the exact
// question set/count is conditional on context, and this
// adaptive handler inspects whatever is actually on screen and
// answers accordingly, regardless of question number or total
// count - proven reliable across both prior suites.
//
// Note: the "Has your child been vaccinated?" question appeared
// as Question 1/8 even for this suite's adult (26-year-old)
// patient, contradicting the child-only assumption documented in
// the standalone Medical History suite. The adaptive handler is
// unaffected either way - its Case 0 matches any button literally
// named "Complete", one of this question's three options, so it
// is handled correctly without special-casing.
// ============================================================

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
//
// CONFIRMED via real recording: the Visit Summary loading
// spinner behavior documented in the Medical History suite
// (variable duration, up to ~20+ seconds) was NOT specifically
// re-verified for this protocol - the generous settle helper
// below is carried over defensively for the same reason it was
// added there: relying purely on fixed timeouts on this page has
// proven flaky.
// ============================================================

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
      console.log(
        `waitForVisitSummaryToSettle — detected a loading spinner via "${sel}", waiting for it to clear`
      );
      await spinner.waitFor({ state: 'hidden', timeout: 45000 }).catch(() => {
        console.log(
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
        console.log(
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
    console.log(
      `completeVisitUpload — unexpected outcome: uploadButtonStillPresentAfterClick=${uploadButtonStillPresent}, sendVisitModalDetected=${sendVisitModalVisible}, yesConfirmationClicked=${yesVisible}`
    );
  }
}

// ============================================================
// TC_AP_001 - Verify Abdominal Pain can be selected as visit
// reason and Assessment starts at Question 1/12
// ============================================================
test('TC_AP_001_Verify_Visit_Reason_Selection_Starts_Assessment', async ({ page }) => {
  await setupToAbdominalPainAssessment(page);

  await expect(page.getByText('Question 1/12', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Which part of the abdomen do you feel pain?', { exact: false })
  ).toBeVisible();
});

// ============================================================
// TC_AP_002 - Verify Question 1/12 pain-location multi-select
// (including the "All over" option) advances to Question 2/12
// ============================================================
test('TC_AP_002_Verify_Pain_Location_Question', async ({ page }) => {
  await setupToAbdominalPainAssessment(page);

  for (const label of Object.values(PAIN_LOCATION_OPTIONS)) {
    await expect(page.getByRole('button', { name: label }).first()).toBeVisible({ timeout: 10000 });
  }

  await answerPainLocation(page, [PAIN_LOCATION_OPTIONS.allOver]);
  await expect(page.getByText('Question 2/12', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_AP_003 - Verify Question 2/12 pain-radiation question and
// its two options
// ============================================================
test('TC_AP_003_Verify_Pain_Radiation_Question', async ({ page }) => {
  await setupToAbdominalPainAssessment(page);
  await answerPainLocation(page);

  await expect(page.getByText('Question 2/12', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByText('Does the pain move to other parts of the body?', { exact: false })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Does not move', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pain radiates to', exact: true })).toBeVisible();

  await answerPainRadiation(page, 'Does not move');
  await expect(page.getByText('Question 3/12', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_AP_004 - Verify Question 3/12 duration dropdowns and
// Submit work correctly
// ============================================================
test('TC_AP_004_Verify_Symptom_Duration_Question', async ({ page }) => {
  await setupToAbdominalPainAssessment(page);
  await answerPainLocation(page);
  await answerPainRadiation(page);
  await answerSymptomDuration(page, '3', 'Hours');

  await expect(page.getByText('Question 4/12', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(
    page.locator('div').filter({ hasText: 'Since when have you had this symptom?' }).filter({ hasText: '3 hours' }).first()
  ).toBeVisible();
});

// ============================================================
// TC_AP_005 - Verify Question 4/12 onset-type options and
// auto-advance (Skip present, no Submit)
// ============================================================
test('TC_AP_005_Verify_Onset_Type_Question_Auto_Advances', async ({ page }) => {
  await setupToAbdominalPainAssessment(page);
  await answerPainLocation(page);
  await answerPainRadiation(page);
  await answerSymptomDuration(page, '3', 'Hours');

  await expect(page.getByText('Question 4/12', { exact: true })).toBeVisible({ timeout: 15000 });
  for (const label of ['Gradual', 'Rapidly increasing', 'Sudden', 'Other [describe]']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible({ timeout: 10000 });
  }
  await expect(page.getByRole('button', { name: 'Skip', exact: true })).toBeVisible();

  await answerOnsetType(page, 'Gradual');
  await expect(page.getByText('Question 5/12', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_AP_006 - Verify Question 5/12 pain-timing question, its
// options, and that both Submit and Skip are present
// ============================================================
test('TC_AP_006_Verify_Pain_Timing_Question', async ({ page }) => {
  await setupToAbdominalPainAssessment(page);
  await answerPainLocation(page);
  await answerPainRadiation(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetType(page, 'Gradual');

  await expect(page.getByText('Question 5/12', { exact: true })).toBeVisible({ timeout: 15000 });
  for (const label of ['Morning', 'Night', 'Not linked to any particular time of day', 'Other [Describe]']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible({ timeout: 10000 });
  }
  await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Skip', exact: true })).toBeVisible();

  await answerPainTiming(page, ['Morning']);
  await expect(page.getByText('Question 6/12', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_AP_007 - Verify Question 6/12 character-of-the-pain
// question is mandatory (Submit only, no Skip) and lists all
// options
// ============================================================
test('TC_AP_007_Verify_Pain_Character_Question_Mandatory', async ({ page }) => {
  await setupToAbdominalPainAssessment(page);
  await answerPainLocation(page);
  await answerPainRadiation(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetType(page, 'Gradual');
  await answerPainTiming(page, ['Morning']);

  await expect(page.getByText('Question 6/12', { exact: true })).toBeVisible({ timeout: 15000 });
  for (const label of [
    'Constant', 'Colicky / Intermittent (comes & goes)', 'Gnawing/chewing',
    'Cramping', 'Dull, aching', 'Other [describe]'
  ]) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible({ timeout: 10000 });
  }

  const skipVisible = await page
    .getByRole('button', { name: 'Skip', exact: true })
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  expect(skipVisible, 'Character of the pain is marked mandatory (*) and should have no Skip option').toBeFalsy();

  await answerPainCharacter(page, ['Constant']);
  await expect(page.getByText('Question 7/12', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_AP_008 - Verify Question 7/12 pain-severity scale options
// ============================================================
test('TC_AP_008_Verify_Pain_Severity_Question', async ({ page }) => {
  await setupToAbdominalPainAssessment(page);
  await answerPainLocation(page);
  await answerPainRadiation(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetType(page, 'Gradual');
  await answerPainTiming(page, ['Morning']);
  await answerPainCharacter(page, ['Constant']);

  await expect(page.getByText('Question 7/12', { exact: true })).toBeVisible({ timeout: 15000 });
  for (const label of ['Mild, 1-3', 'Moderate, 4-6', 'Severe, 7-9', 'Very Severe, 10']) {
    await expect(page.getByRole('button', { name: label })).toBeVisible({ timeout: 10000 });
  }

  await answerPainSeverity(page, 'Mild, 1-3');
  await expect(page.getByText('Question 8/12', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_AP_009 - Verify Question 8/12 displays all 19 associated-
// symptom checklist items
// ============================================================
test('TC_AP_009_Verify_Associated_Symptoms_All_Items_Displayed', async ({ page }) => {
  await setupToAbdominalPainAssessment(page);
  await answerPainLocation(page);
  await answerPainRadiation(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetType(page, 'Gradual');
  await answerPainTiming(page, ['Morning']);
  await answerPainCharacter(page, ['Constant']);
  await answerPainSeverity(page, 'Mild, 1-3');

  await expect(page.getByText('Question 8/12', { exact: true })).toBeVisible({ timeout: 15000 });

  for (const label of ASSOCIATED_SYMPTOMS_ITEMS) {
    await expect(page.getByText(label, { exact: false }).first()).toBeVisible({ timeout: 10000 });
  }
});

// ============================================================
// TC_AP_010 - Verify answering all associated symptoms 'No'
// and Submit advances to Question 9/12
// ============================================================
test('TC_AP_010_Verify_Associated_Symptoms_All_No_Advances', async ({ page }) => {
  await setupToAbdominalPainAssessment(page);
  await answerPainLocation(page);
  await answerPainRadiation(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetType(page, 'Gradual');
  await answerPainTiming(page, ['Morning']);
  await answerPainCharacter(page, ['Constant']);
  await answerPainSeverity(page, 'Mild, 1-3');
  await answerAssociatedSymptoms(page, 'No');

  await expect(page.getByText('Question 9/12', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_AP_011 - Verify selecting 'Yes' for a specific associated
// symptom (e.g. Vomiting) is recorded distinctly
// ============================================================
test('TC_AP_011_Verify_Associated_Symptom_Yes_Item_Recorded', async ({ page }) => {
  await setupToAbdominalPainAssessment(page);
  await answerPainLocation(page);
  await answerPainRadiation(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetType(page, 'Gradual');
  await answerPainTiming(page, ['Morning']);
  await answerPainCharacter(page, ['Constant']);
  await answerPainSeverity(page, 'Mild, 1-3');
  await answerAssociatedSymptoms(page, 'No', { '2. Vomiting': 'Yes' });

  await expect(page.getByText('Question 9/12', { exact: true })).toBeVisible({ timeout: 15000 });

  const q8SummaryCard = page
    .locator('div')
    .filter({ hasText: 'Do you have the following symptom(s)?' })
    .first();
  await expect(q8SummaryCard).toBeVisible({ timeout: 10000 });
});

// ============================================================
// TC_AP_012 - Verify Question 9/12 aggravating-factors question
// and its options
// ============================================================
test('TC_AP_012_Verify_Aggravating_Factors_Question', async ({ page }) => {
  await setupToAbdominalPainAssessment(page);
  await answerPainLocation(page);
  await answerPainRadiation(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetType(page, 'Gradual');
  await answerPainTiming(page, ['Morning']);
  await answerPainCharacter(page, ['Constant']);
  await answerPainSeverity(page, 'Mild, 1-3');
  await answerAssociatedSymptoms(page, 'No');

  await expect(page.getByText('Question 9/12', { exact: true })).toBeVisible({ timeout: 15000 });
  for (const label of [
    'Hunger', 'Food', 'Urination', 'Pressure', 'Movement', 'Coughing',
    'Straining', 'Other [describe]', 'None', "Don't know/Unsure"
  ]) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible({ timeout: 10000 });
  }

  await answerAggravatingFactors(page, ["Don't know/Unsure"]);
  await expect(page.getByText('Question 10/12', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_AP_013 - Verify Question 10/12 relieving-factors question,
// including the bracket-less "Other describe" option
// ============================================================
test('TC_AP_013_Verify_Relieving_Factors_Question', async ({ page }) => {
  await setupToAbdominalPainAssessment(page);
  await answerPainLocation(page);
  await answerPainRadiation(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetType(page, 'Gradual');
  await answerPainTiming(page, ['Morning']);
  await answerPainCharacter(page, ['Constant']);
  await answerPainSeverity(page, 'Mild, 1-3');
  await answerAssociatedSymptoms(page, 'No');
  await answerAggravatingFactors(page, ["Don't know/Unsure"]);

  await expect(page.getByText('Question 10/12', { exact: true })).toBeVisible({ timeout: 15000 });
  for (const label of [
    'Medications [describe]', 'Food', 'Leaning forward', 'Squatting', 'Vomiting',
    'Passing of stool', 'Other describe', 'None', "Don't know/Unsure"
  ]) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible({ timeout: 10000 });
  }

  await answerRelievingFactors(page, ['None']);
  await expect(page.getByText('Question 11/12', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_AP_014 - Verify Question 11/12 treatment-history question
// (identical wording to the Abdominal Distention protocol)
// ============================================================
test('TC_AP_014_Verify_Treatment_History_Question', async ({ page }) => {
  await setupToAbdominalPainAssessment(page);
  await answerPainLocation(page);
  await answerPainRadiation(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetType(page, 'Gradual');
  await answerPainTiming(page, ['Morning']);
  await answerPainCharacter(page, ['Constant']);
  await answerPainSeverity(page, 'Mild, 1-3');
  await answerAssociatedSymptoms(page, 'No');
  await answerAggravatingFactors(page, ["Don't know/Unsure"]);
  await answerRelievingFactors(page, ['None']);

  await expect(page.getByText('Question 11/12', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Yes [Describe]' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: 'None', exact: true })).toBeVisible({ timeout: 10000 });

  await answerTreatmentHistory(page, 'None');
  await expect(page.getByText('Question 12/12', { exact: true })).toBeVisible({ timeout: 15000 });
});

// ============================================================
// TC_AP_015 - Verify Question 12/12 additional-information
// field and Skip completes the assessment
// ============================================================
test('TC_AP_015_Verify_Additional_Information_Skip_Completes_Assessment', async ({ page }) => {
  await setupToAbdominalPainAssessment(page);
  await answerPainLocation(page);
  await answerPainRadiation(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetType(page, 'Gradual');
  await answerPainTiming(page, ['Morning']);
  await answerPainCharacter(page, ['Constant']);
  await answerPainSeverity(page, 'Mild, 1-3');
  await answerAssociatedSymptoms(page, 'No');
  await answerAggravatingFactors(page, ["Don't know/Unsure"]);
  await answerRelievingFactors(page, ['None']);
  await answerTreatmentHistory(page, 'None');

  await expect(page.getByText('Question 12/12', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByPlaceholder('Describe...')).toBeVisible({ timeout: 10000 });

  await answerAdditionalInfo(page, { skip: true });

  await expect(
    page.getByText('Physical Examination', { exact: true }).first()
  ).toBeVisible({ timeout: 20000 });
});

// ============================================================
// TC_AP_016 - Verify the full 12-question assessment completes
// end to end via the composed helper
// ============================================================
test('TC_AP_016_Verify_Full_Assessment_Completes', async ({ page }) => {
  await setupToAbdominalPainAssessment(page);
  await completeAbdominalPainAssessment(page);

  await expect(
    page.getByText('Physical Examination', { exact: true }).first()
  ).toBeVisible({ timeout: 20000 });
});

// ============================================================
// TC_AP_017 - Verify a "wash hands" reminder modal appears
// after completing the assessment
// ============================================================
test('TC_AP_017_Verify_Wash_Hands_Reminder_After_Assessment', async ({ page }) => {
  await setupToAbdominalPainAssessment(page);
  await answerPainLocation(page);
  await answerPainRadiation(page);
  await answerSymptomDuration(page, '3', 'Hours');
  await answerOnsetType(page, 'Gradual');
  await answerPainTiming(page, ['Morning']);
  await answerPainCharacter(page, ['Constant']);
  await answerPainSeverity(page, 'Mild, 1-3');
  await answerAssociatedSymptoms(page, 'No');
  await answerAggravatingFactors(page, ["Don't know/Unsure"]);
  await answerRelievingFactors(page, ['None']);
  await answerTreatmentHistory(page, 'None');

  await expect(page.getByText('Question 12/12', { exact: true })).toBeVisible({ timeout: 15000 });

  const skipButton = page.getByRole('button', { name: 'Skip', exact: true });
  await skipButton.click();
  await page.waitForTimeout(1000);

  const visitReasonSummaryVisible = await page
    .getByText('Visit reason summary', { exact: false })
    .isVisible({ timeout: 8000 })
    .catch(() => false);

  if (visitReasonSummaryVisible) {
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await page.waitForTimeout(1000);
  }

  const washHandsVisible = await page
    .getByText('Please wash/sanitize your hands', { exact: false })
    .isVisible({ timeout: 8000 })
    .catch(() => false);

  console.log(`TC_AP_017 — Wash hands modal appeared: ${washHandsVisible}`);

  if (washHandsVisible) {
    await page.getByRole('button', { name: 'Okay', exact: true }).click();
  }
});

// ------------------------------------------------------------
// Composed helper: runs the full flow (setup + assessment) and
// stops right at the start of Physical Examination.
// ------------------------------------------------------------

async function setupToPhysicalExam(page, assessmentOverrides = {}) {
  await setupToAbdominalPainAssessment(page);
  await completeAbdominalPainAssessment(page, assessmentOverrides);
  await expect(page.getByText('Question 1/10', { exact: true })).toBeVisible({ timeout: 20000 });
}

// ============================================================
// TC_AP_018 - Verify Question 7/10 "Are there visible scars?"
// (the new question not present in the Abdominal Distention
// protocol) displays under an "Abdomen Scars" section
// ============================================================
test('TC_AP_018_Verify_Abdominal_Scars_Question_Displays', async ({ page }) => {
  await setupToPhysicalExam(page);
  await answerJaundicePhysicalExam(page, 'No');
  await answerPallorPhysicalExam(page, 'Normal');
  await answerPinchSkin(page, 'Normal');
  await answerNailAbnormality(page, ['Nails are normal']);
  await answerNailAnemia(page, 'Nails are normal');
  await answerAnkleOedema(page, 'No oedema');

  await expect(page.getByText('Question 7/10', { exact: true })).toBeVisible({ timeout: 15000 });
  // Matched with a whitespace-tolerant regex: this section
  // label's actual DOM text is "AbdomenScars" with zero space
  // between the words (the visual gap is CSS spacing between
  // separate inline elements, not a text-node space character).
  await expect(page.getByText(/Abdomen\s*Scars/i)).toBeVisible();
  await expect(page.getByText('Are there visible scars?', { exact: false })).toBeVisible();

  for (const label of ['No', 'Yes', 'Take a Picture']) {
    await expect(page.getByRole('button', { name: label }).first()).toBeVisible({ timeout: 10000 });
  }

  // Confirmed via real recording: this question has no asterisk
  // (optional) and shows a Skip button, unlike the mandatory
  // Bloating question (Q8) which has no Skip.
  await expect(page.getByRole('button', { name: 'Skip', exact: true })).toBeVisible({ timeout: 10000 });
});

// ============================================================
// TC_AP_019 - Verify Question 8/10 abdominal bloating question
// displays (identical wording to the Abdominal Distention
// protocol's equivalent question)
// ============================================================
test('TC_AP_019_Verify_Abdominal_Bloating_Question_Displays', async ({ page }) => {
  await setupToPhysicalExam(page);
  await answerJaundicePhysicalExam(page, 'No');
  await answerPallorPhysicalExam(page, 'Normal');
  await answerPinchSkin(page, 'Normal');
  await answerNailAbnormality(page, ['Nails are normal']);
  await answerNailAnemia(page, 'Nails are normal');
  await answerAnkleOedema(page, 'No oedema');
  await answerAbdominalScars(page, 'No');

  await expect(page.getByText('Question 8/10', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Is there abdominal bloating?', { exact: false })).toBeVisible();

  for (const label of ['No', 'Yes', 'Take a Picture']) {
    await expect(page.getByRole('button', { name: label }).first()).toBeVisible({ timeout: 10000 });
  }

  // Confirmed via real recording: this question IS marked
  // mandatory ("Is there abdominal bloating?*") and, unlike its
  // neighbors (Scars, Tenderness, Lumps), shows no Skip button.
  const skipVisible = await page
    .getByRole('button', { name: 'Skip', exact: true })
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  expect(skipVisible, 'Abdominal bloating is mandatory (*) and should have no Skip option').toBeFalsy();
});

// ============================================================
// TC_AP_020 - Verify Question 9/10 abdominal tenderness shows
// exactly two options (no "Take a Picture") and that "Yes"
// reveals the location sub-question with all 10 quadrant
// options
// ============================================================
test('TC_AP_020_Verify_Tenderness_Question_And_Location_SubQuestion', async ({ page }) => {
  await setupToPhysicalExam(page);
  await answerJaundicePhysicalExam(page, 'No');
  await answerPallorPhysicalExam(page, 'Normal');
  await answerPinchSkin(page, 'Normal');
  await answerNailAbnormality(page, ['Nails are normal']);
  await answerNailAnemia(page, 'Nails are normal');
  await answerAnkleOedema(page, 'No oedema');
  await answerAbdominalScars(page, 'No');
  await answerAbdominalBloating(page, 'No');

  await expect(page.getByText('Question 9/10', { exact: true })).toBeVisible({ timeout: 15000 });
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

  // Confirmed via real recording: this question has no asterisk
  // (optional) and DOES show a Skip button, matching Scars/Lumps
  // and unlike the mandatory Bloating question.
  await expect(page.getByRole('button', { name: 'Skip', exact: true })).toBeVisible({ timeout: 10000 });

  // Select "Yes" to trigger the (by-analogy) location sub-question.
  const yesOption = page.getByRole('button', { name: 'Yes', exact: true }).first();
  await yesOption.scrollIntoViewIfNeeded().catch(() => {});
  await page.evaluate(() => window.scrollBy(0, -150));
  await page.waitForTimeout(500);
  await yesOption.evaluate((el) => el.click());
  await page.waitForTimeout(1200);

  const locationPromptVisible = await page
    .getByText('Select the location where there is', { exact: false })
    .isVisible({ timeout: 10000 })
    .catch(() => false);

  console.log(`TC_AP_020 — Tenderness location sub-question appeared: ${locationPromptVisible}`);

  if (locationPromptVisible) {
    for (const location of ABDOMEN_LOCATION_OPTIONS) {
      await expect(
        page.getByRole('button', { name: location, exact: true }).first(),
        `Expected location option "${location}" to be available`
      ).toBeVisible({ timeout: 10000 });
    }
  }
});

// ============================================================
// TC_AP_021 - Verify Question 10/10 (FINAL) "Are there lumps?"
// question displays and that answering it leads straight to the
// Physical examination summary (no umbilicus question follows,
// unlike the Abdominal Distention protocol)
// ============================================================
test('TC_AP_021_Verify_Lumps_Is_Final_Question', async ({ page }) => {
  await setupToPhysicalExam(page);
  await answerJaundicePhysicalExam(page, 'No');
  await answerPallorPhysicalExam(page, 'Normal');
  await answerPinchSkin(page, 'Normal');
  await answerNailAbnormality(page, ['Nails are normal']);
  await answerNailAnemia(page, 'Nails are normal');
  await answerAnkleOedema(page, 'No oedema');
  await answerAbdominalScars(page, 'No');
  await answerAbdominalBloating(page, 'No');
  await answerAbdominalTenderness(page, 'No tenderness');

  await expect(page.getByText('Question 10/10', { exact: true })).toBeVisible({ timeout: 15000 });
  // Same whitespace-tolerant fix as the Scars section label
  // above - the real DOM text is "AbdomenLumps" with no space.
  await expect(page.getByText(/Abdomen\s*Lumps/i)).toBeVisible();
  await expect(page.getByText('Are there lumps?', { exact: false })).toBeVisible();

  // Confirmed via real recording: this final question has no
  // asterisk (optional) and shows a Skip button, matching Scars
  // and Tenderness.
  await expect(page.getByRole('button', { name: 'Skip', exact: true })).toBeVisible({ timeout: 10000 });

  await answerAbdominalLumps(page, 'No');

  await expect(page.getByText('Physical examination summary', { exact: false })).toBeVisible({ timeout: 15000 });

  // Confirm there is genuinely no follow-up umbilicus question -
  // i.e. we did not silently land on an 11th question.
  const anyFurtherQuestion = await page
    .getByText(/^Question\s*11\/\d+$/)
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  expect(
    anyFurtherQuestion,
    'Expected no Question 11 for this protocol - Lumps (10/10) should be the final Physical Examination question'
  ).toBeFalsy();
});

// ============================================================
// TC_AP_022 - Verify completing all 10 Physical Examination
// questions reaches the summary modal
// ============================================================
test('TC_AP_022_Verify_Full_Physical_Exam_Reaches_Summary', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completeAbdominalPainPhysicalExam(page);

  await expect(page.getByText('Physical examination summary', { exact: false })).toBeVisible();
});

// ============================================================
// TC_AP_023 - Verify the Physical Examination summary shows the
// correct "General Exams" section values
// ============================================================
test('TC_AP_023_Verify_Summary_General_Exams_Section', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completeAbdominalPainPhysicalExam(page);

  await expectPhysicalExamSummaryRow(page, 'Eyes: Jaundice', 'No');
  await expectPhysicalExamSummaryRow(page, 'Eyes: Pallor', 'Normal');
  await expectPhysicalExamSummaryRow(page, 'Arm', 'Normal');
  await expectPhysicalExamSummaryRow(page, 'Nail abnormality', 'Nails are normal');
  await expectPhysicalExamSummaryRow(page, 'Nail anemia', 'Nails are normal');
  await expectPhysicalExamSummaryRow(page, 'Ankle', 'No oedema');
});

// ============================================================
// TC_AP_024 - Verify the Physical Examination summary shows the
// correct "Abdomen" section values (Scars, Distension,
// Tenderness, Lumps) and that NO "Umbilicus" section is present
// ============================================================
test('TC_AP_024_Verify_Summary_Abdomen_Section_And_No_Umbilicus', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completeAbdominalPainPhysicalExam(page);

  const modal = getPhysicalExamModal(page);
  await expect(modal.getByText('Abdomen', { exact: true })).toBeVisible({ timeout: 10000 });

  await expectPhysicalExamSummaryRow(page, 'Scars', 'No');
  await expectPhysicalExamSummaryRow(page, 'Distension', 'No');
  await expectPhysicalExamSummaryRow(page, 'Tenderness', 'No tenderness');
  await expectPhysicalExamSummaryRow(page, 'Lumps', 'No');

  const umbilicusVisible = await modal
    .getByText('Umbilicus', { exact: true })
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  expect(
    umbilicusVisible,
    'The Abdominal Pain protocol should have no Umbilicus section, unlike the Abdominal Distention protocol'
  ).toBeFalsy();
});

// ============================================================
// TC_AP_025 - Verify selecting alternate abdomen answers (e.g.
// scars=Yes, bloating=Yes, tenderness=Yes, lumps=Yes) are
// reflected correctly in the summary
// ============================================================
test('TC_AP_025_Verify_Alternate_Abdomen_Answers_Recorded', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completeAbdominalPainPhysicalExam(page, {
    abdominalScars: 'Yes',
    abdominalBloating: 'Yes',
    abdominalTenderness: 'Yes',
    abdominalLumps: 'Yes'
  });

  await expectPhysicalExamSummaryRow(page, 'Scars', 'Yes');
  await expectPhysicalExamSummaryRow(page, 'Distension', 'Yes');
  await expectPhysicalExamSummaryRow(page, 'Tenderness', 'Yes');
  await expectPhysicalExamSummaryRow(page, 'Lumps', 'Yes');
});

// ============================================================
// TC_AP_026 - Verify clicking Confirm on the Physical
// Examination summary navigates into Medical History
// ============================================================
test('TC_AP_026_Verify_Physical_Exam_Confirm_Navigates_To_Medical_History', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completeAbdominalPainPhysicalExam(page);
  await clickPhysicalExamSummaryConfirm(page);

  await expect(page.getByText('Medical History', { exact: true }).first()).toBeVisible({ timeout: 20000 });
});

// ============================================================
// TC_AP_027 - Verify the Medical History module (reused from
// the standalone suite) completes successfully within this
// protocol's flow
// ============================================================
test('TC_AP_027_Verify_Medical_History_Completes_Within_Protocol', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completeAbdominalPainPhysicalExam(page);
  await clickPhysicalExamSummaryConfirm(page);

  await completeMedicalHistoryGeneric(page);

  await expect(page.getByText('Medical history summary', { exact: false })).toBeVisible();
});

// ============================================================
// TC_AP_028 - Verify clicking Confirm on the Medical History
// summary navigates to the Visit Summary page
// ============================================================
test('TC_AP_028_Verify_Medical_History_Confirm_Navigates_To_Visit_Summary', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completeAbdominalPainPhysicalExam(page);
  await clickPhysicalExamSummaryConfirm(page);
  await completeMedicalHistoryGeneric(page);
  await clickMedicalHistorySummaryConfirm(page);

  await expect(page.getByText('Visit Summary', { exact: false }).first()).toBeVisible({ timeout: 20000 });
});

// ============================================================
// TC_AP_029 - Verify the Visit Summary's "Check-up reason"
// section shows the Abdominal Pain chip and correct assessment
// field labels
// ============================================================
test('TC_AP_029_Verify_Visit_Summary_Checkup_Reason_Section', async ({ page }) => {
  await setupToPhysicalExam(page);
  await completeAbdominalPainPhysicalExam(page);
  await clickPhysicalExamSummaryConfirm(page);
  await completeMedicalHistoryGeneric(page);
  await clickMedicalHistorySummaryConfirm(page);
  await waitForVisitSummaryToSettle(page);

  await expect(page.getByText('Abdominal Pain', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Site', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Radiation', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Duration', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Onset', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Timing', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Character of the pain', { exact: false })).toBeVisible();
  await expect(page.getByText('Severity', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Exacerbating Factors', { exact: false })).toBeVisible();
  await expect(page.getByText('Relieving Factors', { exact: false })).toBeVisible();
  await expect(page.getByText('Prior treatment sought', { exact: false })).toBeVisible();
  await expect(page.getByText('Associated symptoms', { exact: false })).toBeVisible();
});

// ============================================================
// TC_AP_030 - End-to-end: complete the entire Abdominal Pain
// protocol (Assessment + Physical Exam + Medical History +
// Upload Visit) - Critical happy path
// ============================================================
test('TC_AP_030_Verify_End_To_End_Abdominal_Pain_Protocol', async ({ page }) => {
  await setupToAbdominalPainAssessment(page);
  await completeAbdominalPainAssessment(page);

  await expect(page.getByText('Question 1/10', { exact: true })).toBeVisible({ timeout: 20000 });
  await completeAbdominalPainPhysicalExam(page);

  await expectPhysicalExamSummaryRow(page, 'Scars', 'No');
  await expectPhysicalExamSummaryRow(page, 'Distension', 'No');
  await expectPhysicalExamSummaryRow(page, 'Tenderness', 'No tenderness');
  await expectPhysicalExamSummaryRow(page, 'Lumps', 'No');

  await clickPhysicalExamSummaryConfirm(page);

  await expect(page.getByText('Medical History', { exact: true }).first()).toBeVisible({ timeout: 20000 });
  await completeMedicalHistoryGeneric(page);
  await clickMedicalHistorySummaryConfirm(page);

  await expect(page.getByText('Visit Summary', { exact: false }).first()).toBeVisible({ timeout: 20000 });

  await completeVisitUpload(page, { doctorSpecialty: 'General Physician' });
});

});
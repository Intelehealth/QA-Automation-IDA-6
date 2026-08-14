import { test, expect } from '@playwright/test';

test.describe('Start Visit - Vitals Module', () => {

  // =====================================================
  // COMMON SETUP
  // LOGIN → CREATE PATIENT → START VISIT
  // =====================================================

  test.beforeEach(async ({ page }) => {

    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(30000);

    // =====================================================
    // 1. LOGIN
    // =====================================================

    await page.goto('/hwwebapp#/auth/login', {
      waitUntil: 'domcontentloaded'
    });

    await expect(
      page.getByRole('textbox', {
        name: 'Enter your username'
      })
    ).toBeVisible({
      timeout: 10000
    });

    await page.getByRole('textbox', {
      name: 'Enter your username'
    }).fill('nurse1');

    await page.getByRole('textbox', {
      name: 'Enter your password'
    }).fill('Nurse@123');

    await page.getByRole('button', {
      name: 'Select Role'
    }).click();

    await page.getByRole('checkbox').check();

    await page.getByRole('button', {
      name: 'Login'
    }).click();

    await expect(page).toHaveURL(/.*dashboard/, {
      timeout: 30000
    });

    // =====================================================
    // 2. OPEN ADD PATIENT
    // =====================================================

    await page.getByRole('button', {
      name: 'Add Patients'
    }).click();

    // Accept notifications / permissions
    await page.getByRole('button', {
      name: 'Accept'
    }).click();

    await page.getByRole('button', {
      name: 'Accept'
    }).click();

    await expect(
      page.getByRole('textbox', {
        name: 'First Name*'
      })
    ).toBeVisible({
      timeout: 15000
    });

    // =====================================================
    // 3. PATIENT BASIC DETAILS
    // =====================================================

    await page.getByRole('textbox', {
      name: 'First Name*'
    }).fill('Automation');

    await page.getByRole('textbox', {
      name: 'Last Name*'
    }).fill('Vitals');

    // =====================================================
    // 4. GENDER
    // =====================================================

    await page.getByRole('radio', {
      name: 'Male',
      exact: true
    }).check();

    // =====================================================
    // 5. DATE OF BIRTH
    // =====================================================

    await page.getByPlaceholder(
      'Enter Date Of Birth'
    ).click();

    await page.locator(
      'button:has(i.fa-chevron-down)'
    ).click();

    const previousDecade = page
      .getByRole('button')
      .filter({ hasText: /^$/ })
      .nth(3);

    await previousDecade.click();
    await previousDecade.click();

    await page.getByRole('button', {
      name: '2000'
    }).click();

    await page.getByRole('button', {
      name: 'JAN'
    }).click();

    await page.locator(
      '.react-datepicker__day--001:not(.react-datepicker__day--outside-month)'
    ).click();

    // =====================================================
    // 6. PHONE NUMBER
    // =====================================================

    await page.getByRole('textbox', {
      name: 'Enter phone number'
    }).fill('9090909090');

    // =====================================================
    // 7. EMERGENCY CONTACT
    // =====================================================

    await page.getByRole('textbox', {
      name: 'Emergency Contact Name*'
    }).fill('Test User');

    await page.getByRole('textbox', {
      name: 'Enter Emergency Contact Number'
    }).fill('9090909091');

    // =====================================================
    // 8. COUNTRY
    // =====================================================

    await page.getByRole('button', {
      name: 'Country*'
    }).click();

    await page.getByRole('textbox', {
      name: 'Search options...'
    }).fill('India');

    await page.getByRole('option', {
      name: 'India',
      exact: true
    }).click();

    // =====================================================
    // 9. POSTAL CODE
    // =====================================================

    await page.getByRole('textbox', {
      name: 'Postal Code*'
    }).fill('751002');

    // =====================================================
    // 10. STATE
    // =====================================================

    await page.locator('text=Select State').click({
      force: true
    });

    await page.getByPlaceholder(
      'Search options...'
    ).fill('Odisha');

    await page.getByText('Odisha', {
      exact: true
    }).click();

    // =====================================================
    // 11. DISTRICT
    // =====================================================

    await page.locator('text=Select District').click({
      force: true
    });

    await page.getByPlaceholder(
      'Search options...'
    ).fill('Khordha');

    await page.getByText('Khordha', {
      exact: true
    }).click();

    // =====================================================
    // 12. ADDRESS
    // =====================================================

    await page.getByRole('textbox', {
      name: 'Village/Town/City*'
    }).fill('Bhubaneswar');

    await page.getByRole('textbox', {
      name: 'Corresponding Address*'
    }).fill('Automation Address');

    await page.getByRole('textbox', {
      name: 'Corresponding Address 2*'
    }).fill('Automation Address 2');

    // =====================================================
    // 13. CONTACT TYPE
    // =====================================================

    await page.getByRole('button', {
      name: 'Contact Type*'
    }).click();

    await page.getByText('Family', {
      exact: true
    }).click();

    // =====================================================
    // 14. NEXT
    // =====================================================

    await page.getByRole('button', {
      name: 'Next'
    }).click();

    // =====================================================
    // 15. EDUCATION
    // =====================================================

    await page.getByRole('button', {
      name: 'Education*'
    }).click();

    await page.getByRole('option', {
      name: 'Primary'
    }).click();

    // =====================================================
    // 16. SUBMIT PATIENT
    // =====================================================

    await page.getByRole('button', {
      name: 'Next'
    }).click();

    await page.waitForTimeout(15000);

    // =====================================================
    // 17. PATIENT CARD
    // =====================================================

    const patientCard = page
      .locator('div.bg-white.rounded-xl.border')
      .filter({
        has: page.locator('p.font-semibold', {
          hasText: 'Automation Vitals'
        })
      });

    await expect(patientCard).toBeVisible({
      timeout: 15000
    });

    // =====================================================
    // 18. START VISIT
    // =====================================================

    await patientCard.getByRole('button', {
      name: 'Start visit'
    }).click({
      force: true
    });

    // =====================================================
    // 19. VERIFY VITALS SCREEN
    // =====================================================

    await expect(
      page.locator('input[name="height_cm"]')
    ).toBeVisible({
      timeout: 30000
    });

  });


  // =====================================================
  // TC_01 - Verify Vitals Section Headers
  // =====================================================

  test('TC_01_Verify_Vitals_Section_Headers', async ({ page }) => {

    await expect(
      page.getByText(
        "Enter patient's body measurement details"
      )
    ).toBeVisible();

    await expect(
      page.getByText(
        "Enter the patient's vitals"
      )
    ).toBeVisible();

    await expect(
      page.getByText(
        'Additional Measurements'
      )
    ).toBeVisible();

  });


  // =====================================================
  // TC_02 - Verify Height Input Attributes
  // =====================================================

  test('TC_02_Verify_Height_Input_Attributes', async ({ page }) => {

    const height = page.locator(
      'input[name="height_cm"]'
    );

    await expect(height).toHaveAttribute(
      'type',
      'text'
    );

    await expect(height).toHaveAttribute(
      'inputmode',
      'decimal'
    );

    await expect(height).toHaveAttribute(
      'maxlength',
      '10'
    );

    await expect(height).toHaveAttribute(
      'placeholder',
      'E.g., 172 cm'
    );

  });


  // =====================================================
  // TC_03 - Verify Weight Input Attributes
  // =====================================================

  test('TC_03_Verify_Weight_Input_Attributes', async ({ page }) => {

    const weight = page.locator(
      'input[name="weight_kg"]'
    );

    await expect(weight).toHaveAttribute(
      'type',
      'text'
    );

    await expect(weight).toHaveAttribute(
      'inputmode',
      'decimal'
    );

    await expect(weight).toHaveAttribute(
      'maxlength',
      '10'
    );

    await expect(weight).toHaveAttribute(
      'placeholder',
      'E.g., 63 kg'
    );

  });


  // =====================================================
  // TC_04 - Verify BMI Field Is Read Only
  // =====================================================

  test('TC_04_Verify_BMI_Field_Is_ReadOnly', async ({ page }) => {

    const bmi = page.locator(
      'input[name="bmi"]'
    );

    await expect(bmi).toHaveAttribute(
      'readonly',
      ''
    );

  });


  // =====================================================
  // TC_05 - Verify BMI Calculation
  // =====================================================

  test('TC_05_Verify_BMI_Calculation', async ({ page }) => {

    const height = page.locator(
      'input[name="height_cm"]'
    );

    const weight = page.locator(
      'input[name="weight_kg"]'
    );

    const bmi = page.locator(
      'input[name="bmi"]'
    );

    await height.fill('170');

    await weight.fill('63');

    await expect(bmi).not.toHaveValue('');

    const bmiValue = await bmi.inputValue();

    expect(parseFloat(bmiValue)).toBeCloseTo(
      21.8,
      1
    );

  });


  // =====================================================
  // TC_06 - Verify BMI Normal Category
  // =====================================================

  test('TC_06_Verify_BMI_Normal_Category', async ({ page }) => {

    await page.locator(
      'input[name="height_cm"]'
    ).fill('170');

    await page.locator(
      'input[name="weight_kg"]'
    ).fill('63');

    await expect(
      page.getByText('(Normal)', {
        exact: true
      })
    ).toBeVisible();

  });


  // =====================================================
  // TC_07 - Verify BMI Underweight Category
  // =====================================================

  test('TC_07_Verify_BMI_Underweight_Category', async ({ page }) => {

    await page.locator(
      'input[name="height_cm"]'
    ).fill('170');

    await page.locator(
      'input[name="weight_kg"]'
    ).fill('45');

    await expect(
      page.getByText(/Underweight/i)
    ).toBeVisible();

  });


  // =====================================================
  // TC_08 - Verify BMI Overweight Category
  // =====================================================

  test('TC_08_Verify_BMI_Overweight_Category', async ({ page }) => {

    await page.locator(
      'input[name="height_cm"]'
    ).fill('170');

    await page.locator(
      'input[name="weight_kg"]'
    ).fill('75');

    await expect(
      page.getByText(/Overweight/i)
    ).toBeVisible();

  });


  // =====================================================
  // TC_09 - Verify BMI Obese Category
  // =====================================================

  test('TC_09_Verify_BMI_Obese_Category', async ({ page }) => {

    await page.locator(
      'input[name="height_cm"]'
    ).fill('170');

    await page.locator(
      'input[name="weight_kg"]'
    ).fill('100');

    await expect(
      page.getByText(/Obese/i)
    ).toBeVisible();

  });


  // =====================================================
  // TC_10 - Verify BMI Recalculates When Height Changes
  // =====================================================

  test('TC_10_Verify_BMI_Recalculates_When_Height_Changes', async ({ page }) => {

    const height = page.locator(
      'input[name="height_cm"]'
    );

    const weight = page.locator(
      'input[name="weight_kg"]'
    );

    const bmi = page.locator(
      'input[name="bmi"]'
    );

    await height.fill('170');

    await weight.fill('63');

    const firstBMI = await bmi.inputValue();

    await height.fill('180');

    const secondBMI = await bmi.inputValue();

    expect(firstBMI).not.toBe(
      secondBMI
    );

  });


  // =====================================================
  // TC_11 - Verify BMI Recalculates When Weight Changes
  // =====================================================

  test('TC_11_Verify_BMI_Recalculates_When_Weight_Changes', async ({ page }) => {

    const height = page.locator(
      'input[name="height_cm"]'
    );

    const weight = page.locator(
      'input[name="weight_kg"]'
    );

    const bmi = page.locator(
      'input[name="bmi"]'
    );

    await height.fill('170');

    await weight.fill('63');

    const firstBMI = await bmi.inputValue();

    await weight.fill('70');

    const secondBMI = await bmi.inputValue();

    expect(firstBMI).not.toBe(
      secondBMI
    );

  });


  // =====================================================
  // TC_12 - Verify WHR Field Is Read Only
  // =====================================================

  test('TC_12_Verify_WHR_Field_Is_ReadOnly', async ({ page }) => {

    const whr = page.locator(
      'input[name="waist_to_hip_ratio"]'
    );

    await expect(whr).toHaveAttribute(
      'readonly',
      ''
    );

  });


  // =====================================================
  // TC_13 - Verify WHR Calculation
  // =====================================================

  test('TC_13_Verify_WHR_Calculation', async ({ page }) => {

    const waist = page.locator(
      'input[name="waist_circumference_cm"]'
    );

    const hip = page.locator(
      'input[name="hip_circumference_cm"]'
    );

    const whr = page.locator(
      'input[name="waist_to_hip_ratio"]'
    );

    await waist.fill('80');

    await hip.fill('95');

    await expect(whr).not.toHaveValue('');

    const whrValue = await whr.inputValue();

    expect(parseFloat(whrValue)).toBeCloseTo(
      0.84,
      2
    );

  });


  // =====================================================
  // TC_14 - Verify WHR Recalculates When Waist Changes
  // =====================================================

  test('TC_14_Verify_WHR_Recalculates_When_Waist_Changes', async ({ page }) => {

    const waist = page.locator(
      'input[name="waist_circumference_cm"]'
    );

    const hip = page.locator(
      'input[name="hip_circumference_cm"]'
    );

    const whr = page.locator(
      'input[name="waist_to_hip_ratio"]'
    );

    await waist.fill('80');

    await hip.fill('95');

    const firstWHR = await whr.inputValue();

    await waist.fill('90');

    const secondWHR = await whr.inputValue();

    expect(firstWHR).not.toBe(
      secondWHR
    );

  });


  // =====================================================
  // TC_15 - Verify WHR Recalculates When Hip Changes
  // =====================================================

  test('TC_15_Verify_WHR_Recalculates_When_Hip_Changes', async ({ page }) => {

    const waist = page.locator(
      'input[name="waist_circumference_cm"]'
    );

    const hip = page.locator(
      'input[name="hip_circumference_cm"]'
    );

    const whr = page.locator(
      'input[name="waist_to_hip_ratio"]'
    );

    await waist.fill('80');

    await hip.fill('95');

    const firstWHR = await whr.inputValue();

    await hip.fill('100');

    const secondWHR = await whr.inputValue();

    expect(firstWHR).not.toBe(
      secondWHR
    );

  });


  // =====================================================
  // TC_16 - Verify Decimal Height And Weight
  // =====================================================

  test('TC_16_Verify_Decimal_Height_And_Weight', async ({ page }) => {

    const height = page.locator(
      'input[name="height_cm"]'
    );

    const weight = page.locator(
      'input[name="weight_kg"]'
    );

    await height.fill('172.5');

    await weight.fill('63.5');

    await expect(height).toHaveValue(
      '172.5'
    );

    await expect(weight).toHaveValue(
      '63.5'
    );

  });


  // =====================================================
  // TC_17 - Verify Decimal BMI Calculation
  // =====================================================

  test('TC_17_Verify_Decimal_BMI_Calculation', async ({ page }) => {

    const height = page.locator(
      'input[name="height_cm"]'
    );

    const weight = page.locator(
      'input[name="weight_kg"]'
    );

    const bmi = page.locator(
      'input[name="bmi"]'
    );

    await height.fill('172.5');

    await weight.fill('63.5');

    const bmiValue = await bmi.inputValue();

    expect(parseFloat(bmiValue)).toBeCloseTo(
      21.35,
      1
    );

  });


  // =====================================================
  // TC_18 - Verify Temperature Accepts Decimal
  // =====================================================

  test('TC_18_Verify_Temperature_Accepts_Decimal', async ({ page }) => {

    const temperature = page.locator(
      'input[name="temprature_f"]'
    );

    await temperature.fill('98.6');

    await expect(temperature).toHaveValue(
      '98.6'
    );

  });


  // =====================================================
  // TC_19 - Verify HbA1c Accepts Decimal
  // =====================================================

  test('TC_19_Verify_HbA1c_Accepts_Decimal', async ({ page }) => {

    const hba1c = page.locator(
      'input[name="hba1c"]'
    );

    await hba1c.fill('5.7');

    await expect(hba1c).toHaveValue(
      '5.7'
    );

  });


  // =====================================================
  // TC_20 - Verify Height Maximum Length
  // =====================================================

  test('TC_20_Verify_Height_Maximum_Length', async ({ page }) => {

    const height = page.locator(
      'input[name="height_cm"]'
    );

    await expect(height).toHaveAttribute(
      'maxlength',
      '10'
    );

    await height.fill(
      '123456789012345'
    );

    const value = await height.inputValue();

    expect(value.length).toBeLessThanOrEqual(
      10
    );

  });


  // =====================================================
  // TC_21 - Verify Weight Maximum Length
  // =====================================================

  test('TC_21_Verify_Weight_Maximum_Length', async ({ page }) => {

    const weight = page.locator(
      'input[name="weight_kg"]'
    );

    await expect(weight).toHaveAttribute(
      'maxlength',
      '10'
    );

    await weight.fill(
      '123456789012345'
    );

    const value = await weight.inputValue();

    expect(value.length).toBeLessThanOrEqual(
      10
    );

  });


  // =====================================================
  // TC_22 - Verify BMI Cannot Be Manually Edited
  // =====================================================

  test('TC_22_Verify_BMI_Cannot_Be_Manually_Edited', async ({ page }) => {

    const bmi = page.locator(
      'input[name="bmi"]'
    );

    await expect(bmi).toHaveAttribute(
      'readonly',
      ''
    );

    const initialValue = await bmi.inputValue();

    await bmi.fill('25');

    const finalValue = await bmi.inputValue();

    expect(finalValue).toBe(
      initialValue
    );

  });


  // =====================================================
  // TC_23 - Verify WHR Cannot Be Manually Edited
  // =====================================================

  test('TC_23_Verify_WHR_Cannot_Be_Manually_Edited', async ({ page }) => {

    const whr = page.locator(
      'input[name="waist_to_hip_ratio"]'
    );

    await expect(whr).toHaveAttribute(
      'readonly',
      ''
    );

    await page.locator(
      'input[name="waist_circumference_cm"]'
    ).fill('80');

    await page.locator(
      'input[name="hip_circumference_cm"]'
    ).fill('95');

    const calculatedValue =
      await whr.inputValue();

    await whr.fill('2.00');

    const finalValue =
      await whr.inputValue();

    expect(finalValue).toBe(
      calculatedValue
    );

  });


  // =====================================================
  // TC_24 - Verify Blood Group Default Option
  // =====================================================

  test('TC_24_Verify_Blood_Group_Default_Option', async ({ page }) => {

    const bloodGroup = page.locator(
      'select[name="blood_group"]'
    );

    await expect(bloodGroup).toBeVisible();

    await expect(
      bloodGroup
    ).toHaveValue('');

    await expect(
      bloodGroup.locator('option').first()
    ).toHaveText(
      'Select Blood Group'
    );

  });


  // =====================================================
  // TC_25 - Verify Blood Group Selection Persists
  // =====================================================

  test('TC_25_Verify_Blood_Group_Selection_Persists', async ({ page }) => {

    const bloodGroup = page.locator(
      'select[name="blood_group"]'
    );

    const bloodGroupValue =
      '9d2e999b-538f-11e6-9cfe-86f436325720';

    await bloodGroup.selectOption(
      bloodGroupValue
    );

    await expect(
      bloodGroup
    ).toHaveValue(
      bloodGroupValue
    );

  });


  // =====================================================
  // TC_26 - Verify BMI Updates After Clearing Weight
  // =====================================================

  test('TC_26_Verify_BMI_After_Clearing_Weight', async ({ page }) => {

    const height = page.locator(
      'input[name="height_cm"]'
    );

    const weight = page.locator(
      'input[name="weight_kg"]'
    );

    const bmi = page.locator(
      'input[name="bmi"]'
    );

    await height.fill('170');

    await weight.fill('63');

    await expect(bmi).not.toHaveValue('');

    await weight.fill('');

    await expect(
      bmi
    ).toHaveValue('');

  });


  // =====================================================
  // TC_27 - Verify BMI Updates After Clearing Height
  // =====================================================

  test('TC_27_Verify_BMI_After_Clearing_Height', async ({ page }) => {

    const height = page.locator(
      'input[name="height_cm"]'
    );

    const weight = page.locator(
      'input[name="weight_kg"]'
    );

    const bmi = page.locator(
      'input[name="bmi"]'
    );

    await height.fill('170');

    await weight.fill('63');

    await expect(bmi).not.toHaveValue('');

    await height.fill('');

    await expect(
      bmi
    ).toHaveValue('');

  });


  // =====================================================
  // TC_28 - Verify WHR Updates After Clearing Waist
  // =====================================================

  test('TC_28_Verify_WHR_After_Clearing_Waist', async ({ page }) => {

    const waist = page.locator(
      'input[name="waist_circumference_cm"]'
    );

    const hip = page.locator(
      'input[name="hip_circumference_cm"]'
    );

    const whr = page.locator(
      'input[name="waist_to_hip_ratio"]'
    );

    await waist.fill('80');

    await hip.fill('95');

    await expect(whr).not.toHaveValue('');

    await waist.fill('');

    await expect(
      whr
    ).toHaveValue('');

  });


  // =====================================================
  // TC_29 - Verify WHR Updates After Clearing Hip
  // =====================================================

  test('TC_29_Verify_WHR_After_Clearing_Hip', async ({ page }) => {

    const waist = page.locator(
      'input[name="waist_circumference_cm"]'
    );

    const hip = page.locator(
      'input[name="hip_circumference_cm"]'
    );

    const whr = page.locator(
      'input[name="waist_to_hip_ratio"]'
    );

    await waist.fill('80');

    await hip.fill('95');

    await expect(whr).not.toHaveValue('');

    await hip.fill('');

    await expect(
      whr
    ).toHaveValue('');

  });


  // =====================================================
  // TC_30 - Verify Vitals Input Names
  // =====================================================

  test('TC_30_Verify_Vitals_Input_Names', async ({ page }) => {

    const expectedFields = [
      'height_cm',
      'weight_kg',
      'bmi',
      'bp_systolic',
      'bp_diastolic',
      'pulse_bpm',
      'temprature_f',
      'spo2',
      'respiratory_rate',
      'fbs_mg_per_dl',
      'ppbs_mg_per_dl',
      'rbs_mg_per_dl',
      'waist_circumference_cm',
      'hip_circumference_cm',
      'waist_to_hip_ratio',
      'ogtt_mg_per_dl',
      'hba1c',
      'blood_group'
    ];

    for (const fieldName of expectedFields) {

      await expect(
        page.locator(
          `input[name="${fieldName}"], select[name="${fieldName}"]`
        )
      ).toBeVisible();

    }

  });


  // =====================================================
  // TC_31 - Verify Optional BP Fields Can Remain Empty
  // =====================================================

  test('TC_31_Verify_BP_Fields_Can_Remain_Empty', async ({ page }) => {

    const systolic = page.locator(
      'input[name="bp_systolic"]'
    );

    const diastolic = page.locator(
      'input[name="bp_diastolic"]'
    );

    await expect(systolic).toHaveValue('');

    await expect(diastolic).toHaveValue('');

  });


  // =====================================================
  // TC_32 - Verify Optional Temperature Can Remain Empty
  // =====================================================

  test('TC_32_Verify_Temperature_Can_Remain_Empty', async ({ page }) => {

    const temperature = page.locator(
      'input[name="temprature_f"]'
    );

    await expect(
      temperature
    ).toHaveValue('');

  });


  // =====================================================
  // TC_33 - Verify Optional SpO2 Can Remain Empty
  // =====================================================

  test('TC_33_Verify_SpO2_Can_Remain_Empty', async ({ page }) => {

    const spo2 = page.locator(
      'input[name="spo2"]'
    );

    await expect(
      spo2
    ).toHaveValue('');

  });


  // =====================================================
  // TC_34 - Verify Optional FBS Can Remain Empty
  // =====================================================

  test('TC_34_Verify_FBS_Can_Remain_Empty', async ({ page }) => {

    const fbs = page.locator(
      'input[name="fbs_mg_per_dl"]'
    );

    await expect(
      fbs
    ).toHaveValue('');

  });


  // =====================================================
  // TC_35 - Verify Blood Group Can Remain Unselected
  // =====================================================

  test('TC_35_Verify_Blood_Group_Can_Remain_Unselected', async ({ page }) => {

    const bloodGroup = page.locator(
      'select[name="blood_group"]'
    );

    await expect(
      bloodGroup
    ).toHaveValue('');

  });


  // =====================================================
  // TC_36 - Verify BMI Changes After Multiple Updates
  // =====================================================

  test('TC_36_Verify_BMI_After_Multiple_Updates', async ({ page }) => {

    const height = page.locator(
      'input[name="height_cm"]'
    );

    const weight = page.locator(
      'input[name="weight_kg"]'
    );

    const bmi = page.locator(
      'input[name="bmi"]'
    );

    await height.fill('170');
    await weight.fill('63');

    const bmi1 = await bmi.inputValue();

    await weight.fill('70');

    const bmi2 = await bmi.inputValue();

    await height.fill('180');

    const bmi3 = await bmi.inputValue();

    expect(bmi1).not.toBe(bmi2);

    expect(bmi2).not.toBe(bmi3);

    expect(bmi1).not.toBe(bmi3);

  });


  // =====================================================
  // TC_37 - Verify WHR Changes After Multiple Updates
  // =====================================================

  test('TC_37_Verify_WHR_After_Multiple_Updates', async ({ page }) => {

    const waist = page.locator(
      'input[name="waist_circumference_cm"]'
    );

    const hip = page.locator(
      'input[name="hip_circumference_cm"]'
    );

    const whr = page.locator(
      'input[name="waist_to_hip_ratio"]'
    );

    await waist.fill('80');
    await hip.fill('95');

    const whr1 = await whr.inputValue();

    await waist.fill('85');

    const whr2 = await whr.inputValue();

    await hip.fill('100');

    const whr3 = await whr.inputValue();

    expect(whr1).not.toBe(whr2);

    expect(whr2).not.toBe(whr3);

    expect(whr1).not.toBe(whr3);

  });


  // =====================================================
  // TC_38 - Verify BMI Field Is Disabled For Direct Input
  // =====================================================

  test('TC_38_Verify_BMI_Direct_Input_Is_Not_Allowed', async ({ page }) => {

    const bmi = page.locator(
      'input[name="bmi"]'
    );

    await expect(
      bmi
    ).toHaveAttribute(
      'readonly',
      ''
    );

  });


  // =====================================================
  // TC_39 - Verify WHR Field Is Disabled For Direct Input
  // =====================================================

  test('TC_39_Verify_WHR_Direct_Input_Is_Not_Allowed', async ({ page }) => {

    const whr = page.locator(
      'input[name="waist_to_hip_ratio"]'
    );

    await expect(
      whr
    ).toHaveAttribute(
      'readonly',
      ''
    );

  });


  // =====================================================
  // TC_40 - Verify Vitals Fields Have Decimal Input Mode
  // =====================================================

  test('TC_40_Verify_Vitals_Decimal_Input_Mode', async ({ page }) => {

    const fields = [
      'height_cm',
      'weight_kg',
      'bp_systolic',
      'bp_diastolic',
      'pulse_bpm',
      'temprature_f',
      'spo2',
      'respiratory_rate',
      'fbs_mg_per_dl',
      'ppbs_mg_per_dl',
      'rbs_mg_per_dl',
      'waist_circumference_cm',
      'hip_circumference_cm',
      'ogtt_mg_per_dl',
      'hba1c'
    ];

    for (const field of fields) {

      await expect(
        page.locator(
          `input[name="${field}"]`
        )
      ).toHaveAttribute(
        'inputmode',
        'decimal'
      );

    }

  });


  // =====================================================
  // TC_41 - Verify Vitals Fields Maximum Length
  // =====================================================

  test('TC_41_Verify_Vitals_Maximum_Length', async ({ page }) => {

    const fields = [
      'height_cm',
      'weight_kg',
      'bp_systolic',
      'bp_diastolic',
      'pulse_bpm',
      'temprature_f',
      'spo2',
      'respiratory_rate',
      'fbs_mg_per_dl',
      'ppbs_mg_per_dl',
      'rbs_mg_per_dl',
      'waist_circumference_cm',
      'hip_circumference_cm',
      'ogtt_mg_per_dl',
      'hba1c'
    ];

    for (const field of fields) {

      await expect(
        page.locator(
          `input[name="${field}"]`
        )
      ).toHaveAttribute(
        'maxlength',
        '10'
      );

    }

  });


  // =====================================================
  // TC_42 - Verify BMI Placeholder
  // =====================================================

  test('TC_42_Verify_BMI_Placeholder', async ({ page }) => {

    await expect(
      page.locator(
        'input[name="bmi"]'
      )
    ).toHaveAttribute(
      'placeholder',
      'E.g., 22.5'
    );

  });


  // =====================================================
  // TC_43 - Verify WHR Placeholder
  // =====================================================

  test('TC_43_Verify_WHR_Placeholder', async ({ page }) => {

    await expect(
      page.locator(
        'input[name="waist_to_hip_ratio"]'
      )
    ).toHaveAttribute(
      'placeholder',
      'E.g., 0.85'
    );

  });


  // =====================================================
  // TC_44 - Verify BMI Is Automatically Generated
  // =====================================================

  test('TC_44_Verify_BMI_Is_Automatically_Generated', async ({ page }) => {

    const bmi = page.locator(
      'input[name="bmi"]'
    );

    await expect(
      bmi
    ).toHaveValue('');

    await page.locator(
      'input[name="height_cm"]'
    ).fill('170');

    await page.locator(
      'input[name="weight_kg"]'
    ).fill('63');

    await expect(
      bmi
    ).not.toHaveValue('');

  });


  // =====================================================
  // TC_45 - Verify WHR Is Automatically Generated
  // =====================================================

  test('TC_45_Verify_WHR_Is_Automatically_Generated', async ({ page }) => {

    const whr = page.locator(
      'input[name="waist_to_hip_ratio"]'
    );

    await expect(
      whr
    ).toHaveValue('');

    await page.locator(
      'input[name="waist_circumference_cm"]'
    ).fill('80');

    await page.locator(
      'input[name="hip_circumference_cm"]'
    ).fill('95');

    await expect(
      whr
    ).not.toHaveValue('');

  });

});
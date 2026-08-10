import { test, expect } from '@playwright/test';
test.describe('Start Visit Module', () => {

  // =====================================================
  // Login → Create Patient → Start Visit
  // =====================================================

  test.beforeEach(async ({ page }) => {

    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(30000);

// =====================================================
// 1. LOGIN
// =====================================================

page.setDefaultNavigationTimeout(60000);

await page.goto('/hwwebapp#/auth/login', {
  waitUntil: 'domcontentloaded'
});

// Verify Login Page
await expect(
  page.getByRole('textbox', {
    name: 'Enter your username'
  })
).toBeVisible({ timeout: 10000 });

// Username
await page.getByRole('textbox', {
  name: 'Enter your username'
}).fill('nurse1');

// Password
await page.getByRole('textbox', {
  name: 'Enter your password'
}).fill('Nurse@123');

// Select Role
await page.getByRole('button', {
  name: 'Select Role'
}).click();

await page.getByRole('checkbox').check();

// Login
await page.getByRole('button', {
  name: 'Login'
}).click();

// Verify successful login
await expect(page).toHaveURL(/.*dashboard/, {
  timeout: 30000
});


// =====================================================
// 2. OPEN ADD PATIENT
// =====================================================

await page.getByRole('button', {
  name: 'Add Patients'
}).click();

// Accept notifications / permissions if displayed
await page.getByRole('button', {
  name: 'Accept'
}).click();

await page.getByRole('button', {
  name: 'Accept'
}).click();

// Verify Patient Creation page
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

// First Name
await page.getByRole('textbox', {
  name: 'First Name*'
}).fill('Automation');

await expect(
  page.getByRole('textbox', {
    name: 'First Name*'
  })
).toHaveValue('Automation');

// Last Name
await page.getByRole('textbox', {
  name: 'Last Name*'
}).fill('Test');

await expect(
  page.getByRole('textbox', {
    name: 'Last Name*'
  })
).toHaveValue('Test');


// =====================================================
// 4. GENDER
// =====================================================

await page.getByRole('radio', {
  name: 'Male',
  exact: true
}).check();

await expect(
  page.getByRole('radio', {
    name: 'Male',
    exact: true
  })
).toBeChecked();


// =====================================================
// 5. DATE OF BIRTH
// =====================================================

await page.getByPlaceholder(
  'Enter Date Of Birth'
).click();

// Open month/year selector
await page.locator(
  'button:has(i.fa-chevron-down)'
).click();

// Move back to 2000-2009
const previousDecade = page
  .getByRole('button')
  .filter({ hasText: /^$/ })
  .nth(3);

await previousDecade.click();
await previousDecade.click();

// Select year 2000
await page.getByRole('button', {
  name: '2000'
}).click();

// Select January
await page.getByRole('button', {
  name: 'JAN'
}).click();

// Select January 1st
await page.locator(
  '.react-datepicker__day--001:not(.react-datepicker__day--outside-month)'
).click();


// =====================================================
// 6. PHONE NUMBER
// =====================================================

await page.getByRole('textbox', {
  name: 'Enter phone number'
}).fill('9090909090');

await expect(
  page.getByRole('textbox', {
    name: 'Enter phone number'
  })
).toHaveValue('9090909090');


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

await expect(
  page.getByText('India', {
    exact: true
  })
).toBeVisible();


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

await expect(
  page.getByText('Odisha', {
    exact: true
  })
).toBeVisible();


// =====================================================
// 11. DISTRICT
// =====================================================


// District
await page.locator('text=Select District')
.click({ force: true });

await page.getByPlaceholder('Search options...')
.fill('Khordha');

await page.getByText('Khordha', {
exact: true
}).click();

// =====================================================
// 12. ADDRESS DETAILS
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
// 14. NEXT - PATIENT DETAILS
// =====================================================

await expect(
  page.getByRole('button', {
    name: 'Next'
  })
).toBeEnabled();

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

await expect(
  page.getByText('Primary', {
    exact: true
  })
).toBeVisible();


// =====================================================
// 16. SUBMIT PATIENT
// =====================================================

await page.getByRole('button', {
  name: 'Next'
}).click();

await page.waitForTimeout(20000);


// =====================================================
// 17. SUCCESS VALIDATION
// =====================================================
  // Address Details Validation


  await expect(
    page.getByText('Automation TestM')
  ).toBeVisible();

  await expect(
    page.locator('text=ID:')
  ).toBeVisible();

  await expect(
    page.getByText('2000-01-01')
  ).toBeVisible();

  await expect(
    page.getByText('+91 9090909090')
  ).toBeVisible();
await expect(page.getByText('751002')).toBeVisible();
await expect(page.getByText('India')).toBeVisible();
await expect(page.getByText('Odisha')).toBeVisible();
await expect(page.getByText('Bhubaneswar')).toBeVisible();
await expect(page.getByText('Automation Address')).toBeVisible();

// =====================================================
// CAPTURE GENERATED PATIENT / MRS ID
// =====================================================

const patientCard = page.locator('div.bg-white.rounded-xl.border').filter({
has: page.locator('p.font-semibold', {
hasText: 'Automation Test'
})
});

// Get "ID: OPENMRS ID"
const patientIdText = await patientCard
.locator('p.text-xs.text-gray-400')
.textContent();

const mrsId = patientIdText
?.replace('ID:', '')
.trim();

expect(mrsId).toBeTruthy();

// Log generated ID in Playwright console
console.log('========================================');
console.log(`Generated MRS ID: ${mrsId}`);
console.log('========================================');


    // =====================================================
    // CLICK START VISIT
    // =====================================================

await patientCard.getByRole('button', {
  name: 'Start visit'
}).click({ force: true });

    // Verify Start Visit page
    await expect(
      page.getByRole('textbox', {
        name: 'E.g., 172 cm'
      })
    ).toBeVisible({
      timeout: 30000
    });

  });


  // =====================================================
  // TC_01 - Verify Start Visit Screen
  // =====================================================

  test('TC_01_Verify_Start_Visit_Screen', async ({ page }) => {

    await expect(
      page.getByRole('textbox', {
        name: 'E.g., 172 cm'
      })
    ).toBeVisible();

    await expect(
      page.getByRole('textbox', {
        name: 'E.g., 63 kg'
      })
    ).toBeVisible();

    await expect(
      page.getByRole('button', {
        name: 'Next'
      })
    ).toBeVisible();

  });


  // =====================================================
  // TC_02 - Verify Height
  // =====================================================

  test('TC_02_Verify_Height', async ({ page }) => {

    const height = page.getByRole('textbox', {
      name: 'E.g., 172 cm'
    });

    await height.fill('170');

    await expect(height).toHaveValue('170');

  });


  // =====================================================
  // TC_03 - Verify Weight
  // =====================================================

  test('TC_03_Verify_Weight', async ({ page }) => {

    const weight = page.getByRole('textbox', {
      name: 'E.g., 63 kg'
    });

    await weight.fill('63');

    await expect(weight).toHaveValue('63');

  });


  // =====================================================
  // TC_04 - Verify Blood Pressure
  // =====================================================

  test('TC_04_Verify_Blood_Pressure', async ({ page }) => {

    const systolic = page.getByRole('textbox', {
      name: 'E.g., 120 mmHg'
    });

    const diastolic = page.getByRole('textbox', {
      name: 'E.g., 80 mmHg'
    });

    await systolic.fill('120');
    await diastolic.fill('80');

    await expect(systolic).toHaveValue('120');
    await expect(diastolic).toHaveValue('80');

  });


  // =====================================================
  // TC_05 - Verify Pulse
  // =====================================================

  test('TC_05_Verify_Pulse', async ({ page }) => {

    const pulse = page.getByRole('textbox', {
      name: 'E.g., 72 bpm'
    });

    await pulse.fill('72');

    await expect(pulse).toHaveValue('72');

  });


  // =====================================================
  // TC_06 - Verify Temperature
  // =====================================================

  test('TC_06_Verify_Temperature', async ({ page }) => {

    const temperature = page.getByRole('textbox', {
      name: 'E.g., 98.6 °F'
    });

    await temperature.fill('98');

    await expect(temperature).toHaveValue('98');

  });


  // =====================================================
  // TC_07 - Verify SpO2
  // =====================================================

  test('TC_07_Verify_SpO2', async ({ page }) => {

    const spo2 = page.getByRole('textbox', {
      name: 'E.g., 98%'
    });

    await spo2.fill('98');

    await expect(spo2).toHaveValue('98');

  });


  // =====================================================
  // TC_08 - Verify Respiratory Rate
  // =====================================================

  test('TC_08_Verify_Respiratory_Rate', async ({ page }) => {

    const respiratoryRate = page.getByRole('textbox', {
      name: 'E.g., 18 breaths/min'
    });

    await respiratoryRate.fill('18');

    await expect(
      respiratoryRate
    ).toHaveValue('18');

  });


  // =====================================================
  // TC_09 - Verify FBS
  // =====================================================

  test('TC_09_Verify_FBS', async ({ page }) => {

    const fbs = page.getByRole('textbox', {
      name: 'E.g., 90 mg/dL'
    });

    await fbs.fill('90');

    await expect(fbs).toHaveValue('90');

  });


  // =====================================================
  // TC_10 - Verify PPBS
  // =====================================================

  test('TC_10_Verify_PPBS', async ({ page }) => {

    const ppbs = page.locator(
      'input[name="ppbs_mg_per_dl"]'
    );

    await ppbs.fill('140');

    await expect(ppbs).toHaveValue('140');

  });


  // =====================================================
  // TC_11 - Verify Waist Circumference
  // =====================================================

  test('TC_11_Verify_Waist_Circumference', async ({ page }) => {

    const waist = page.getByRole('textbox', {
      name: 'E.g., 80 cm'
    });

    await waist.fill('80');

    await expect(waist).toHaveValue('80');

  });


  // =====================================================
  // TC_12 - Verify Hip Circumference
  // =====================================================

  test('TC_12_Verify_Hip_Circumference', async ({ page }) => {

    const hip = page.getByRole('textbox', {
      name: 'E.g., 95 cm'
    });

    await hip.fill('95');

    await expect(hip).toHaveValue('95');

  });


  // =====================================================
  // TC_13 - Verify OGTT
  // =====================================================

  test('TC_13_Verify_OGTT', async ({ page }) => {

    const ogtt = page.locator(
      'input[name="ogtt_mg_per_dl"]'
    );

    await ogtt.fill('140');

    await expect(ogtt).toHaveValue('140');

  });


  // =====================================================
  // TC_14 - Verify HbA1c
  // =====================================================

  test('TC_14_Verify_HbA1c', async ({ page }) => {

    const hba1c = page.getByRole('textbox', {
      name: 'E.g., 5.7%'
    });

    await hba1c.fill('5.7');

    await expect(hba1c).toHaveValue('5.7');

  });


  // =====================================================
  // TC_15 - Verify Blood Group
  // =====================================================

  test('TC_15_Verify_Blood_Group', async ({ page }) => {

    const bloodGroup = page.locator(
      'select[name="blood_group"]'
    );

    await expect(bloodGroup).toBeVisible();

    await bloodGroup.selectOption(
      '9d2e999b-538f-11e6-9cfe-86f436325720'
    );

    await expect(bloodGroup).toHaveValue(
      '9d2e999b-538f-11e6-9cfe-86f436325720'
    );

  });


  // =====================================================
  // TC_16 - Verify Next Button
  // =====================================================

  test('TC_16_Verify_Vitals_Next_Button', async ({ page }) => {

    const nextButton = page.getByRole('button', {
      name: 'Next'
    });

    await expect(nextButton).toBeVisible();
    await expect(nextButton).toBeEnabled();

  });


  // =====================================================
  // TC_17 - Complete Vitals Flow
  // =====================================================

  test('TC_17_Verify_Complete_Vitals_Flow', async ({ page }) => {

    await page.getByRole('textbox', {
      name: 'E.g., 172 cm'
    }).fill('170');

    await page.getByRole('textbox', {
      name: 'E.g., 63 kg'
    }).fill('63');

    await page.getByRole('textbox', {
      name: 'E.g., 120 mmHg'
    }).fill('120');

    await page.getByRole('textbox', {
      name: 'E.g., 80 mmHg'
    }).fill('80');

    await page.getByRole('textbox', {
      name: 'E.g., 72 bpm'
    }).fill('72');

    await page.getByRole('textbox', {
      name: 'E.g., 98.6 °F'
    }).fill('98');

    await page.getByRole('textbox', {
      name: 'E.g., 98%'
    }).fill('98');

    await page.getByRole('textbox', {
      name: 'E.g., 18 breaths/min'
    }).fill('18');

    await page.getByRole('textbox', {
      name: 'E.g., 90 mg/dL'
    }).fill('90');

    await page.locator(
      'input[name="ppbs_mg_per_dl"]'
    ).fill('140');

    await page.getByRole('textbox', {
      name: 'E.g., 110 mg/dL'
    }).fill('110');

    await page.getByRole('textbox', {
      name: 'E.g., 80 cm'
    }).fill('80');

    await page.getByRole('textbox', {
      name: 'E.g., 95 cm'
    }).fill('95');

    await page.locator(
      'input[name="ogtt_mg_per_dl"]'
    ).fill('140');

    await page.getByRole('textbox', {
      name: 'E.g., 5.7%'
    }).fill('5.7');

    await page.locator(
      'select[name="blood_group"]'
    ).selectOption(
      '9d2e999b-538f-11e6-9cfe-86f436325720'
    );

    await page.getByRole('button', {
      name: 'Next'
    }).click();

    await expect(
      page.getByRole('button', {
        name: 'Confirm'
      })
    ).toBeVisible({
      timeout: 15000
    });

  });


  // =====================================================
  // TC_18 - Verify Visit Reason
  // =====================================================

  test('TC_18_Verify_Visit_Reason', async ({ page }) => {

    // Complete required vitals
    await page.getByRole('textbox', {
      name: 'E.g., 172 cm'
    }).fill('170');

    await page.getByRole('textbox', {
      name: 'E.g., 63 kg'
    }).fill('63');

    await page.getByRole('textbox', {
      name: 'E.g., 120 mmHg'
    }).fill('120');

    await page.getByRole('textbox', {
      name: 'E.g., 80 mmHg'
    }).fill('80');

    await page.getByRole('textbox', {
      name: 'E.g., 72 bpm'
    }).fill('72');

    await page.getByRole('textbox', {
      name: 'E.g., 98.6 °F'
    }).fill('98');

    await page.getByRole('textbox', {
      name: 'E.g., 98%'
    }).fill('98');

    await page.getByRole('textbox', {
      name: 'E.g., 18 breaths/min'
    }).fill('18');

    await page.getByRole('textbox', {
      name: 'E.g., 90 mg/dL'
    }).fill('90');

    await page.locator(
      'input[name="ppbs_mg_per_dl"]'
    ).fill('140');

    await page.getByRole('textbox', {
      name: 'E.g., 110 mg/dL'
    }).fill('110');

    await page.getByRole('textbox', {
      name: 'E.g., 80 cm'
    }).fill('80');

    await page.getByRole('textbox', {
      name: 'E.g., 95 cm'
    }).fill('95');

    await page.locator(
      'input[name="ogtt_mg_per_dl"]'
    ).fill('140');

    await page.getByRole('textbox', {
      name: 'E.g., 5.7%'
    }).fill('5.7');

    await page.locator(
      'select[name="blood_group"]'
    ).selectOption(
      '9d2e999b-538f-11e6-9cfe-86f436325720'
    );

    await page.getByRole('button', {
      name: 'Next'
    }).click();

    await page.getByRole('button', {
      name: 'Confirm'
    }).click();

    await expect(
      page.getByRole('textbox', {
        name: 'Type or select reason eg.'
      })
    ).toBeVisible({
      timeout: 15000
    });

  });


  // =====================================================
  // TC_19 - Verify Other Visit Reason
  // =====================================================

  test('TC_19_Verify_Other_Visit_Reason', async ({ page }) => {

    // Complete vitals
    await page.getByRole('textbox', {
      name: 'E.g., 172 cm'
    }).fill('170');

    await page.getByRole('textbox', {
      name: 'E.g., 63 kg'
    }).fill('63');

    await page.getByRole('textbox', {
      name: 'E.g., 120 mmHg'
    }).fill('120');

    await page.getByRole('textbox', {
      name: 'E.g., 80 mmHg'
    }).fill('80');

    await page.getByRole('textbox', {
      name: 'E.g., 72 bpm'
    }).fill('72');

    await page.getByRole('textbox', {
      name: 'E.g., 98.6 °F'
    }).fill('98');

    await page.getByRole('textbox', {
      name: 'E.g., 98%'
    }).fill('98');

    await page.getByRole('textbox', {
      name: 'E.g., 18 breaths/min'
    }).fill('18');

    await page.getByRole('textbox', {
      name: 'E.g., 90 mg/dL'
    }).fill('90');

    await page.locator(
      'input[name="ppbs_mg_per_dl"]'
    ).fill('140');

    await page.getByRole('textbox', {
      name: 'E.g., 110 mg/dL'
    }).fill('110');

    await page.getByRole('textbox', {
      name: 'E.g., 80 cm'
    }).fill('80');

    await page.getByRole('textbox', {
      name: 'E.g., 95 cm'
    }).fill('95');

    await page.locator(
      'input[name="ogtt_mg_per_dl"]'
    ).fill('140');

    await page.getByRole('textbox', {
      name: 'E.g., 5.7%'
    }).fill('5.7');

    await page.locator(
      'select[name="blood_group"]'
    ).selectOption(
      '9d2e999b-538f-11e6-9cfe-86f436325720'
    );

    await page.getByRole('button', {
      name: 'Next'
    }).click();

    await page.getByRole('button', {
      name: 'Confirm'
    }).click();

    const reason = page.getByRole('textbox', {
      name: 'Type or select reason eg.'
    });

    await reason.fill('other');

    await page.locator('div')
      .filter({
        hasText: /^Other$/
      })
      .nth(1)
      .click();

    await expect(
      page.getByRole('button', {
        name: 'Start Assessment'
      })
    ).toBeVisible();

  });


  // =====================================================
  // TC_20 - Verify Start Assessment Button
  // =====================================================

  test('TC_20_Verify_Start_Assessment', async ({ page }) => {

    await expect(
      page.getByRole('button', {
        name: 'Start Assessment'
      })
    ).toBeVisible();

  });

});

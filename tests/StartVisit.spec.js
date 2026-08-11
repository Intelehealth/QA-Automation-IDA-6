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

  // =====================================================
  // COMPLETE REQUIRED VITALS
  // =====================================================

  await page.getByRole('textbox', {
    name: 'E.g., 172 cm'
  }).fill('170');

  await page.getByRole('textbox', {
    name: 'E.g., 63 kg'
  }).fill('63');

  await page.getByRole('textbox', {
    name: 'E.g., 72 bpm'
  }).fill('72');

  await page.getByRole('textbox', {
    name: 'E.g., 18 breaths/min'
  }).fill('18');

  await page.getByRole('textbox', {
    name: 'E.g., 140 mg/dL'
  }).nth(0).fill('140');

  await page.getByRole('textbox', {
    name: 'E.g., 110 mg/dL'
  }).fill('110');

  await page.getByRole('textbox', {
    name: 'E.g., 80 cm'
  }).fill('80');

  await page.getByRole('textbox', {
    name: 'E.g., 95 cm'
  }).fill('95');

  await page.getByRole('textbox', {
    name: 'E.g., 140 mg/dL'
  }).nth(1).fill('140');

  await page.getByRole('textbox', {
    name: 'E.g., 5.7%'
  }).fill('5.7');

  // =====================================================
  // VERIFY BMI CALCULATION
  // =====================================================

  const bmi = page.locator(
    'input[name="bmi"]'
  );

  await expect(bmi).not.toHaveValue('');

  // =====================================================
  // VERIFY WHR CALCULATION
  // =====================================================

  const whr = page.locator(
    'input[name="waist_to_hip_ratio"]'
  );

  await expect(whr).not.toHaveValue('');

  // =====================================================
  // NEXT - VITALS
  // =====================================================

  await page.getByRole('button', {
    name: 'Next'
  }).click();

  // =====================================================
  // CONFIRM
  // =====================================================

  await expect(
    page.getByRole('button', {
      name: 'Confirm'
    })
  ).toBeVisible({
    timeout: 15000
  });

  await page.getByRole('button', {
    name: 'Confirm'
  }).click();

  // =====================================================
  // VISIT REASON
  // =====================================================

  const reason = page.getByRole('textbox', {
    name: 'Type or select reason eg.'
  });

  await expect(reason).toBeVisible({
    timeout: 15000
  });

  await reason.fill('Other');

  // Select Other
  await page.locator('div')
    .filter({
      hasText: /^Other$/
    })
    .nth(1)
    .click();

  // =====================================================
  // VERIFY START ASSESSMENT
  // =====================================================

  await expect(
    page.getByRole('button', {
      name: 'Start Assessment'
    })
  ).toBeVisible({
    timeout: 15000
  });

  await expect(
    page.getByRole('button', {
      name: 'Start Assessment'
    })
  ).toBeEnabled();

});


// =====================================================
// TC_21 - Verify Required Field Validation
// =====================================================

test('TC_21_Verify_Required_Field_Validation', async ({ page }) => {

  // Click Next without entering any required fields
  await page.getByRole('button', {
    name: 'Next'
  }).click();

  // Height validation
  await expect(
    page.getByText('Height (cm) is required', {
      exact: true
    })
  ).toBeVisible();

  // Weight validation
  await expect(
    page.getByText('Weight (kg) is required', {
      exact: true
    })
  ).toBeVisible();

  // Pulse validation
  await expect(
    page.getByText('Pulse (bpm) is required', {
      exact: true
    })
  ).toBeVisible();

  // Respiratory Rate validation
  await expect(
    page.getByText('Respiratory Rate is required', {
      exact: true
    })
  ).toBeVisible();

  // PPBS validation
  await expect(
    page.getByText(
      'Post Prandial Blood Sugar (PPBS) (mg/dl) is required',
      {
        exact: true
      }
    )
  ).toBeVisible();

  // RBS validation
  await expect(
    page.getByText('RBS (mg/dl) is required', {
      exact: true
    })
  ).toBeVisible();

  // Waist Circumference validation
  await expect(
    page.getByText('Waist Circumference (cm) is required', {
      exact: true
    })
  ).toBeVisible();

  // Hip Circumference validation
  await expect(
    page.getByText('Hip Circumference (cm) is required', {
      exact: true
    })
  ).toBeVisible();

  // OGTT validation
  await expect(
    page.getByText(
      '2 Hour Post Load Glucose Test (OGTT) (mg/dl) is required',
      {
        exact: true
      }
    )
  ).toBeVisible();

  // HbA1c validation
  await expect(
    page.getByText('HbA1c is required', {
      exact: true
    })
  ).toBeVisible();

});


// =====================================================
// TC_22 - Verify Required Field Error Messages
// =====================================================

test('TC_22_Verify_Each_Required_Field_Error_Message', async ({ page }) => {

  await page.getByRole('button', {
    name: 'Next'
  }).click();

  const requiredErrors = [
    'Height (cm) is required',
    'Weight (kg) is required',
    'Pulse (bpm) is required',
    'Respiratory Rate is required',
    'Post Prandial Blood Sugar (PPBS) (mg/dl) is required',
    'RBS (mg/dl) is required',
    'Waist Circumference (cm) is required',
    'Hip Circumference (cm) is required',
    '2 Hour Post Load Glucose Test (OGTT) (mg/dl) is required',
    'HbA1c is required'
  ];

  for (const errorMessage of requiredErrors) {
    await expect(
      page.locator('p.form-error-message', {
        hasText: errorMessage
      })
    ).toBeVisible();
  }

});


// =====================================================
// TC_23 - Verify Height Field Is Required
// =====================================================

test('TC_23_Verify_Height_Required_Validation', async ({ page }) => {

  const height = page.locator(
    'input[name="height_cm"]'
  );

  await expect(height).toBeVisible();

  await expect(
    height
  ).toHaveValue('');

  await page.getByRole('button', {
    name: 'Next'
  }).click();

  await expect(
    page.locator('p.form-error-message', {
      hasText: 'Height (cm) is required'
    })
  ).toBeVisible();

});


// =====================================================
// TC_24 - Verify Weight Field Is Required
// =====================================================

test('TC_24_Verify_Weight_Required_Validation', async ({ page }) => {

  const weight = page.locator(
    'input[name="weight_kg"]'
  );

  await expect(weight).toBeVisible();

  await expect(
    weight
  ).toHaveValue('');

  await page.getByRole('button', {
    name: 'Next'
  }).click();

  await expect(
    page.locator('p.form-error-message', {
      hasText: 'Weight (kg) is required'
    })
  ).toBeVisible();

});


// =====================================================
// TC_25 - Verify Pulse Required Validation
// =====================================================

test('TC_25_Verify_Pulse_Required_Validation', async ({ page }) => {

  const pulse = page.locator(
    'input[name="pulse_bpm"]'
  );

  await expect(pulse).toBeVisible();

  await page.getByRole('button', {
    name: 'Next'
  }).click();

  await expect(
    page.locator('p.form-error-message', {
      hasText: 'Pulse (bpm) is required'
    })
  ).toBeVisible();

});


// =====================================================
// TC_26 - Verify Respiratory Rate Required Validation
// =====================================================

test('TC_26_Verify_Respiratory_Rate_Required_Validation', async ({ page }) => {

  const respiratoryRate = page.locator(
    'input[name="respiratory_rate"]'
  );

  await expect(respiratoryRate).toBeVisible();

  await page.getByRole('button', {
    name: 'Next'
  }).click();

  await expect(
    page.locator('p.form-error-message', {
      hasText: 'Respiratory Rate is required'
    })
  ).toBeVisible();

});


// =====================================================
// TC_27 - Verify PPBS Required Validation
// =====================================================

test('TC_27_Verify_PPBS_Required_Validation', async ({ page }) => {

  const ppbs = page.locator(
    'input[name="ppbs_mg_per_dl"]'
  );

  await expect(ppbs).toBeVisible();

  await page.getByRole('button', {
    name: 'Next'
  }).click();

  await expect(
    page.locator('p.form-error-message', {
      hasText:
        'Post Prandial Blood Sugar (PPBS) (mg/dl) is required'
    })
  ).toBeVisible();

});


// =====================================================
// TC_28 - Verify RBS Required Validation
// =====================================================

test('TC_28_Verify_RBS_Required_Validation', async ({ page }) => {

  const rbs = page.locator(
    'input[name="rbs_mg_per_dl"]'
  );

  await expect(rbs).toBeVisible();

  await page.getByRole('button', {
    name: 'Next'
  }).click();

  await expect(
    page.locator('p.form-error-message', {
      hasText: 'RBS (mg/dl) is required'
    })
  ).toBeVisible();

});


// =====================================================
// TC_29 - Verify Waist Circumference Required Validation
// =====================================================

test('TC_29_Verify_Waist_Circumference_Required_Validation', async ({ page }) => {

  const waist = page.locator(
    'input[name="waist_circumference_cm"]'
  );

  await expect(waist).toBeVisible();

  await page.getByRole('button', {
    name: 'Next'
  }).click();

  await expect(
    page.locator('p.form-error-message', {
      hasText: 'Waist Circumference (cm) is required'
    })
  ).toBeVisible();

});


// =====================================================
// TC_30 - Verify Hip Circumference Required Validation
// =====================================================

test('TC_30_Verify_Hip_Circumference_Required_Validation', async ({ page }) => {

  const hip = page.locator(
    'input[name="hip_circumference_cm"]'
  );

  await expect(hip).toBeVisible();

  await page.getByRole('button', {
    name: 'Next'
  }).click();

  await expect(
    page.locator('p.form-error-message', {
      hasText: 'Hip Circumference (cm) is required'
    })
  ).toBeVisible();

});


// =====================================================
// TC_31 - Verify OGTT Required Validation
// =====================================================

test('TC_31_Verify_OGTT_Required_Validation', async ({ page }) => {

  const ogtt = page.locator(
    'input[name="ogtt_mg_per_dl"]'
  );

  await expect(ogtt).toBeVisible();

  await page.getByRole('button', {
    name: 'Next'
  }).click();

  await expect(
    page.locator('p.form-error-message', {
      hasText:
        '2 Hour Post Load Glucose Test (OGTT) (mg/dl) is required'
    })
  ).toBeVisible();

});


// =====================================================
// TC_32 - Verify HbA1c Required Validation
// =====================================================

test('TC_32_Verify_HbA1c_Required_Validation', async ({ page }) => {

  const hba1c = page.locator(
    'input[name="hba1c"]'
  );

  await expect(hba1c).toBeVisible();

  await page.getByRole('button', {
    name: 'Next'
  }).click();

  await expect(
    page.locator('p.form-error-message', {
      hasText: 'HbA1c is required'
    })
  ).toBeVisible();

});


// =====================================================
// TC_33 - Verify BMI Is Readonly
// =====================================================

test('TC_33_Verify_BMI_Is_Readonly', async ({ page }) => {

  const bmi = page.locator(
    'input[name="bmi"]'
  );

  await expect(bmi).toBeVisible();

  await expect(bmi).toHaveAttribute(
    'readonly',
    ''
  );

});


// =====================================================
// TC_34 - Verify BMI Calculation
// =====================================================

test('TC_34_Verify_BMI_Calculation', async ({ page }) => {

  const height = page.locator(
    'input[name="height_cm"]'
  );

  const weight = page.locator(
    'input[name="weight_kg"]'
  );

  const bmi = page.locator(
    'input[name="bmi"]'
  );

  // Height = 170 cm
  await height.fill('170');

  // Weight = 63 kg
  await weight.fill('63');

  // BMI = 63 / (1.70 * 1.70)
  const expectedBMI = 63 / (1.70 * 1.70);

  await expect(bmi).not.toHaveValue('');

  const bmiValue = await bmi.inputValue();

  expect(
    Number(bmiValue)
  ).toBeCloseTo(expectedBMI, 1);

});


// =====================================================
// TC_35 - Verify BMI Calculation When Height Changes
// =====================================================

test('TC_35_Verify_BMI_Updates_When_Height_Changes', async ({ page }) => {

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

  const firstBMI = Number(
    await bmi.inputValue()
  );

  // Change height
  await height.fill('180');

  await expect.poll(
    async () => Number(await bmi.inputValue())
  ).not.toBe(firstBMI);

  const updatedBMI = Number(
    await bmi.inputValue()
  );

  const expectedBMI = 63 / (1.80 * 1.80);

  expect(updatedBMI).toBeCloseTo(
    expectedBMI,
    1
  );

});


// =====================================================
// TC_36 - Verify BMI Calculation When Weight Changes
// =====================================================

test('TC_36_Verify_BMI_Updates_When_Weight_Changes', async ({ page }) => {

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

  const firstBMI = Number(
    await bmi.inputValue()
  );

  // Change weight
  await weight.fill('70');

  await expect.poll(
    async () => Number(await bmi.inputValue())
  ).not.toBe(firstBMI);

  const updatedBMI = Number(
    await bmi.inputValue()
  );

  const expectedBMI = 70 / (1.70 * 1.70);

  expect(updatedBMI).toBeCloseTo(
    expectedBMI,
    1
  );

});


// =====================================================
// TC_37 - Verify WHR Is Readonly
// =====================================================

test('TC_37_Verify_WHR_Is_Readonly', async ({ page }) => {

  const whr = page.locator(
    'input[name="waist_to_hip_ratio"]'
  );

  await expect(whr).toBeVisible();

  await expect(whr).toHaveAttribute(
    'readonly',
    ''
  );

});


// =====================================================
// TC_38 - Verify Waist To Hip Ratio Calculation
// =====================================================

test('TC_38_Verify_WHR_Calculation', async ({ page }) => {

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

  const expectedWHR = 80 / 95;

  await expect(whr).not.toHaveValue('');

  const whrValue = await whr.inputValue();

  expect(
    Number(whrValue)
  ).toBeCloseTo(expectedWHR, 2);

});


// =====================================================
// TC_39 - Verify WHR Updates When Waist Changes
// =====================================================

test('TC_39_Verify_WHR_Updates_When_Waist_Changes', async ({ page }) => {

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

  const firstWHR = Number(
    await whr.inputValue()
  );

  // Change waist
  await waist.fill('90');

  await expect.poll(
    async () => Number(await whr.inputValue())
  ).not.toBe(firstWHR);

  const updatedWHR = Number(
    await whr.inputValue()
  );

  const expectedWHR = 90 / 95;

  expect(updatedWHR).toBeCloseTo(
    expectedWHR,
    2
  );

});


// =====================================================
// TC_40 - Verify WHR Updates When Hip Changes
// =====================================================

test('TC_40_Verify_WHR_Updates_When_Hip_Changes', async ({ page }) => {

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

  const firstWHR = Number(
    await whr.inputValue()
  );

  // Change hip
  await hip.fill('100');

  await expect.poll(
    async () => Number(await whr.inputValue())
  ).not.toBe(firstWHR);

  const updatedWHR = Number(
    await whr.inputValue()
  );

  const expectedWHR = 80 / 100;

  expect(updatedWHR).toBeCloseTo(
    expectedWHR,
    2
  );

});


// =====================================================
// TC_41 - Verify Optional Vital Fields
// =====================================================

test('TC_41_Verify_Optional_Vital_Fields', async ({ page }) => {

  // Required fields
  await page.locator(
    'input[name="height_cm"]'
  ).fill('170');

  await page.locator(
    'input[name="weight_kg"]'
  ).fill('63');

  await page.locator(
    'input[name="pulse_bpm"]'
  ).fill('72');

  await page.locator(
    'input[name="respiratory_rate"]'
  ).fill('18');

  await page.locator(
    'input[name="ppbs_mg_per_dl"]'
  ).fill('140');

  await page.locator(
    'input[name="rbs_mg_per_dl"]'
  ).fill('110');

  await page.locator(
    'input[name="waist_circumference_cm"]'
  ).fill('80');

  await page.locator(
    'input[name="hip_circumference_cm"]'
  ).fill('95');

  await page.locator(
    'input[name="ogtt_mg_per_dl"]'
  ).fill('140');

  await page.locator(
    'input[name="hba1c"]'
  ).fill('5.7');

  // Optional fields intentionally left blank:
  // BP Systolic
  // BP Diastolic
  // Temperature
  // SpO2
  // FBS

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
// TC_42 - Verify Blood Group Is Optional
// =====================================================

test('TC_42_Verify_Blood_Group_Is_Optional', async ({ page }) => {

  // Required fields
  await page.locator(
    'input[name="height_cm"]'
  ).fill('170');

  await page.locator(
    'input[name="weight_kg"]'
  ).fill('63');

  await page.locator(
    'input[name="pulse_bpm"]'
  ).fill('72');

  await page.locator(
    'input[name="respiratory_rate"]'
  ).fill('18');

  await page.locator(
    'input[name="ppbs_mg_per_dl"]'
  ).fill('140');

  await page.locator(
    'input[name="rbs_mg_per_dl"]'
  ).fill('110');

  await page.locator(
    'input[name="waist_circumference_cm"]'
  ).fill('80');

  await page.locator(
    'input[name="hip_circumference_cm"]'
  ).fill('95');

  await page.locator(
    'input[name="ogtt_mg_per_dl"]'
  ).fill('140');

  await page.locator(
    'input[name="hba1c"]'
  ).fill('5.7');

  const bloodGroup = page.locator(
    'select[name="blood_group"]'
  );

  // Verify default value
  await expect(
    bloodGroup
  ).toHaveValue('');

  // Leave Blood Group blank
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
// TC_43 - Verify Blood Group Options
// =====================================================

test('TC_43_Verify_Blood_Group_Options', async ({ page }) => {

  const bloodGroup = page.locator(
    'select[name="blood_group"]'
  );

  // Verify Blood Group dropdown is visible
  await expect(bloodGroup).toBeVisible();

  // Verify default value
  await expect(bloodGroup).toHaveValue('');

  // Verify all Blood Group options exist
  await expect(
    bloodGroup.locator('option')
  ).toHaveCount(9);

  // Verify option text
  await expect(
    bloodGroup.locator('option').nth(0)
  ).toHaveText('Select Blood Group');

  await expect(
    bloodGroup.locator('option').nth(1)
  ).toHaveText('AB NEGATIVE');

  await expect(
    bloodGroup.locator('option').nth(2)
  ).toHaveText('A NEGATIVE');

  await expect(
    bloodGroup.locator('option').nth(3)
  ).toHaveText('O NEGATIVE');

  await expect(
    bloodGroup.locator('option').nth(4)
  ).toHaveText('B POSITIVE');

  await expect(
    bloodGroup.locator('option').nth(5)
  ).toHaveText('B NEGATIVE');

  await expect(
    bloodGroup.locator('option').nth(6)
  ).toHaveText('AB POSITIVE');

  await expect(
    bloodGroup.locator('option').nth(7)
  ).toHaveText('A POSITIVE');

  await expect(
    bloodGroup.locator('option').nth(8)
  ).toHaveText('O POSITIVE');
});
// =====================================================
// TC_44 - Verify Decimal Values In Height And Weight
// =====================================================

test('TC_44_Verify_Decimal_Height_And_Weight', async ({ page }) => {

  const height = page.locator(
    'input[name="height_cm"]'
  );

  const weight = page.locator(
    'input[name="weight_kg"]'
  );

  await height.fill('172.5');
  await weight.fill('63.5');

  await expect(height).toHaveValue('172.5');
  await expect(weight).toHaveValue('63.5');

  const bmi = page.locator(
    'input[name="bmi"]'
  );

  await expect(bmi).not.toHaveValue('');

});


// =====================================================
// TC_45 - Verify Decimal Values In Measurements
// =====================================================

test('TC_45_Verify_Decimal_Measurement_Values', async ({ page }) => {

  const waist = page.locator(
    'input[name="waist_circumference_cm"]'
  );

  const hip = page.locator(
    'input[name="hip_circumference_cm"]'
  );

  await waist.fill('80.5');
  await hip.fill('95.5');

  await expect(waist).toHaveValue('80.5');
  await expect(hip).toHaveValue('95.5');

  const whr = page.locator(
    'input[name="waist_to_hip_ratio"]'
  );

  await expect(whr).not.toHaveValue('');

});


// =====================================================
// TC_46 - Verify BMI Status Is Displayed
// =====================================================

test('TC_46_Verify_BMI_Status', async ({ page }) => {

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

  // Verify BMI category/status is displayed
  await expect(
    page.getByText('(Normal)', {
      exact: true
    })
  ).toBeVisible();

});


// =====================================================
// TC_47 - Verify BMI Cannot Be Manually Edited
// =====================================================

test('TC_47_Verify_BMI_Cannot_Be_Manually_Edited', async ({ page }) => {

  const bmi = page.locator(
    'input[name="bmi"]'
  );

  await expect(
    bmi
  ).toHaveAttribute('readonly', '');

  const originalValue = await bmi.inputValue();

  // Try to fill readonly field
  await bmi.fill('30').catch(() => {});

  await expect(
    bmi
  ).toHaveValue(originalValue);

});


// =====================================================
// TC_48 - Verify WHR Cannot Be Manually Edited
// =====================================================

test('TC_48_Verify_WHR_Cannot_Be_Manually_Edited', async ({ page }) => {

  const whr = page.locator(
    'input[name="waist_to_hip_ratio"]'
  );

  await expect(
    whr
  ).toHaveAttribute('readonly', '');

  const originalValue = await whr.inputValue();

  await whr.fill('1.5').catch(() => {});

  await expect(
    whr
  ).toHaveValue(originalValue);

});


// =====================================================
// TC_49 - Verify Max Length Of Height Field
// =====================================================

test('TC_49_Verify_Height_Max_Length', async ({ page }) => {

  const height = page.locator(
    'input[name="height_cm"]'
  );

  await expect(
    height
  ).toHaveAttribute('maxlength', '10');

});


// =====================================================
// TC_50 - Verify Max Length Of Weight Field
// =====================================================

test('TC_50_Verify_Weight_Max_Length', async ({ page }) => {

  const weight = page.locator(
    'input[name="weight_kg"]'
  );

  await expect(
    weight
  ).toHaveAttribute('maxlength', '10');

});


// =====================================================
// TC_51 - Verify Max Length Of Pulse Field
// =====================================================

test('TC_51_Verify_Pulse_Max_Length', async ({ page }) => {

  const pulse = page.locator(
    'input[name="pulse_bpm"]'
  );

  await expect(
    pulse
  ).toHaveAttribute('maxlength', '10');

});


// =====================================================
// TC_52 - Verify Max Length Of Respiratory Rate
// =====================================================

test('TC_52_Verify_Respiratory_Rate_Max_Length', async ({ page }) => {

  const respiratoryRate = page.locator(
    'input[name="respiratory_rate"]'
  );

  await expect(
    respiratoryRate
  ).toHaveAttribute('maxlength', '10');

});


// =====================================================
// TC_53 - Verify All Required Fields Can Be Completed
// =====================================================

test('TC_53_Verify_All_Required_Fields_Can_Be_Completed', async ({ page }) => {

  await page.locator(
    'input[name="height_cm"]'
  ).fill('170');

  await page.locator(
    'input[name="weight_kg"]'
  ).fill('63');

  await page.locator(
    'input[name="pulse_bpm"]'
  ).fill('72');

  await page.locator(
    'input[name="respiratory_rate"]'
  ).fill('18');

  await page.locator(
    'input[name="ppbs_mg_per_dl"]'
  ).fill('140');

  await page.locator(
    'input[name="rbs_mg_per_dl"]'
  ).fill('110');

  await page.locator(
    'input[name="waist_circumference_cm"]'
  ).fill('80');

  await page.locator(
    'input[name="hip_circumference_cm"]'
  ).fill('95');

  await page.locator(
    'input[name="ogtt_mg_per_dl"]'
  ).fill('140');

  await page.locator(
    'input[name="hba1c"]'
  ).fill('5.7');

  // Verify calculated fields
  await expect(
    page.locator('input[name="bmi"]')
  ).not.toHaveValue('');

  await expect(
    page.locator('input[name="waist_to_hip_ratio"]')
  ).not.toHaveValue('');

  // Verify Next button
  const nextButton = page.getByRole('button', {
    name: 'Next'
  });

  await expect(nextButton).toBeEnabled();

});


// =====================================================
// TC_54 - Verify Error Message Clears After Entering Value
// =====================================================

test('TC_54_Verify_Error_Message_Clears_After_Entering_Value', async ({ page }) => {

  const height = page.locator(
    'input[name="height_cm"]'
  );

  // Trigger validation
  await page.getByRole('button', {
    name: 'Next'
  }).click();

  await expect(
    page.getByText('Height (cm) is required', {
      exact: true
    })
  ).toBeVisible();

  // Enter valid value
  await height.fill('170');

  // Error should disappear
  await expect(
    page.getByText('Height (cm) is required', {
      exact: true
    })
  ).not.toBeVisible();

});


// =====================================================
// TC_55 - Verify Required Fields Error Clears After
// Entering All Required Values
// =====================================================

test('TC_55_Verify_All_Required_Errors_Clear_After_Entering_Values', async ({ page }) => {

  // Trigger validation
  await page.getByRole('button', {
    name: 'Next'
  }).click();

  // Enter all required values
  await page.locator(
    'input[name="height_cm"]'
  ).fill('170');

  await page.locator(
    'input[name="weight_kg"]'
  ).fill('63');

  await page.locator(
    'input[name="pulse_bpm"]'
  ).fill('72');

  await page.locator(
    'input[name="respiratory_rate"]'
  ).fill('18');

  await page.locator(
    'input[name="ppbs_mg_per_dl"]'
  ).fill('140');

  await page.locator(
    'input[name="rbs_mg_per_dl"]'
  ).fill('110');

  await page.locator(
    'input[name="waist_circumference_cm"]'
  ).fill('80');

  await page.locator(
    'input[name="hip_circumference_cm"]'
  ).fill('95');

  await page.locator(
    'input[name="ogtt_mg_per_dl"]'
  ).fill('140');

  await page.locator(
    'input[name="hba1c"]'
  ).fill('5.7');

  // Verify required error messages are gone
  await expect(
    page.getByText('Height (cm) is required', {
      exact: true
    })
  ).not.toBeVisible();

  await expect(
    page.getByText('Weight (kg) is required', {
      exact: true
    })
  ).not.toBeVisible();

  await expect(
    page.getByText('Pulse (bpm) is required', {
      exact: true
    })
  ).not.toBeVisible();

  await expect(
    page.getByText('Respiratory Rate is required', {
      exact: true
    })
  ).not.toBeVisible();

  await expect(
    page.getByText(
      'Post Prandial Blood Sugar (PPBS) (mg/dl) is required',
      {
        exact: true
      }
    )
  ).not.toBeVisible();

  await expect(
    page.getByText('RBS (mg/dl) is required', {
      exact: true
    })
  ).not.toBeVisible();

  await expect(
    page.getByText(
      'Waist Circumference (cm) is required',
      {
        exact: true
      }
    )
  ).not.toBeVisible();

  await expect(
    page.getByText(
      'Hip Circumference (cm) is required',
      {
        exact: true
      }
    )
  ).not.toBeVisible();

  await expect(
    page.getByText(
      '2 Hour Post Load Glucose Test (OGTT) (mg/dl) is required',
      {
        exact: true
      }
    )
  ).not.toBeVisible();

  await expect(
    page.getByText('HbA1c is required', {
      exact: true
    })
  ).not.toBeVisible();

});
// =====================================================
// TC_56 - Verify BMI Status For Underweight
// =====================================================

test('TC_56_Verify_BMI_Status_Underweight', async ({ page }) => {

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
  await weight.fill('45');

  await expect(bmi).not.toHaveValue('');

  await expect(
    page.getByText('(Underweight)', {
      exact: true
    })
  ).toBeVisible();

});


// =====================================================
// TC_57 - Verify BMI Status For Overweight
// =====================================================

test('TC_57_Verify_BMI_Status_Overweight', async ({ page }) => {

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
  await weight.fill('75');

  await expect(bmi).not.toHaveValue('');

  await expect(
    page.getByText('(Overweight)', {
      exact: true
    })
  ).toBeVisible();

});


// =====================================================
// TC_58 - Verify BMI Status For Obese
// =====================================================

test('TC_58_Verify_BMI_Status_Obese', async ({ page }) => {

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
  await weight.fill('90');

  await expect(bmi).not.toHaveValue('');

  await expect(
    page.getByText('(Obese)', {
      exact: true
    })
  ).toBeVisible();

});


// =====================================================
// TC_59 - Verify BMI Clears When Height Is Cleared
// =====================================================

test('TC_59_Verify_BMI_Clears_When_Height_Is_Cleared', async ({ page }) => {

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

  await expect(bmi).toHaveValue('');

});


// =====================================================
// TC_60 - Verify BMI Clears When Weight Is Cleared
// =====================================================

test('TC_60_Verify_BMI_Clears_When_Weight_Is_Cleared', async ({ page }) => {

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

  await expect(bmi).toHaveValue('');

});


// =====================================================
// TC_61 - Verify WHR Clears When Waist Is Cleared
// =====================================================

test('TC_61_Verify_WHR_Clears_When_Waist_Is_Cleared', async ({ page }) => {

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

  await expect(whr).toHaveValue('');

});


// =====================================================
// TC_62 - Verify WHR Clears When Hip Is Cleared
// =====================================================

test('TC_62_Verify_WHR_Clears_When_Hip_Is_Cleared', async ({ page }) => {

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

  await expect(whr).toHaveValue('');

});


// =====================================================
// TC_63 - Verify BMI Recalculation With Multiple Changes
// =====================================================

test('TC_63_Verify_BMI_Recalculation_With_Multiple_Changes', async ({ page }) => {

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

  const firstBMI = Number(
    await bmi.inputValue()
  );

  await height.fill('180');

  const secondBMI = Number(
    await bmi.inputValue()
  );

  expect(secondBMI).not.toBe(firstBMI);

  await weight.fill('80');

  const thirdBMI = Number(
    await bmi.inputValue()
  );

  expect(thirdBMI).not.toBe(secondBMI);

  expect(thirdBMI).toBeCloseTo(
    80 / (1.80 * 1.80),
    1
  );

});


// =====================================================
// TC_64 - Verify WHR Recalculation With Multiple Changes
// =====================================================

test('TC_64_Verify_WHR_Recalculation_With_Multiple_Changes', async ({ page }) => {

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

  const firstWHR = Number(
    await whr.inputValue()
  );

  await waist.fill('90');

  const secondWHR = Number(
    await whr.inputValue()
  );

  expect(secondWHR).not.toBe(firstWHR);

  await hip.fill('100');

  const thirdWHR = Number(
    await whr.inputValue()
  );

  expect(thirdWHR).not.toBe(secondWHR);

  expect(thirdWHR).toBeCloseTo(
    90 / 100,
    2
  );

});


// =====================================================
// TC_65 - Verify Optional BP Systolic Can Be Entered And Cleared
// =====================================================

test('TC_65_Verify_BP_Systolic_Can_Be_Entered_And_Cleared', async ({ page }) => {

  const systolic = page.locator(
    'input[name="bp_systolic"]'
  );

  await systolic.fill('120');

  await expect(systolic).toHaveValue('120');

  await systolic.fill('');

  await expect(systolic).toHaveValue('');

});


// =====================================================
// TC_66 - Verify Optional BP Diastolic Can Be Entered And Cleared
// =====================================================

test('TC_66_Verify_BP_Diastolic_Can_Be_Entered_And_Cleared', async ({ page }) => {

  const diastolic = page.locator(
    'input[name="bp_diastolic"]'
  );

  await diastolic.fill('80');

  await expect(diastolic).toHaveValue('80');

  await diastolic.fill('');

  await expect(diastolic).toHaveValue('');

});


// =====================================================
// TC_67 - Verify Optional Temperature Can Be Entered And Cleared
// =====================================================

test('TC_67_Verify_Temperature_Can_Be_Entered_And_Cleared', async ({ page }) => {

  const temperature = page.locator(
    'input[name="temprature_f"]'
  );

  await temperature.fill('98.6');

  await expect(temperature).toHaveValue('98.6');

  await temperature.fill('');

  await expect(temperature).toHaveValue('');

});


// =====================================================
// TC_68 - Verify Optional SpO2 Can Be Entered And Cleared
// =====================================================

test('TC_68_Verify_SpO2_Can_Be_Entered_And_Cleared', async ({ page }) => {

  const spo2 = page.locator(
    'input[name="spo2"]'
  );

  await spo2.fill('98');

  await expect(spo2).toHaveValue('98');

  await spo2.fill('');

  await expect(spo2).toHaveValue('');

});


// =====================================================
// TC_69 - Verify Optional FBS Can Be Entered And Cleared
// =====================================================

test('TC_69_Verify_FBS_Can_Be_Entered_And_Cleared', async ({ page }) => {

  const fbs = page.locator(
    'input[name="fbs_mg_per_dl"]'
  );

  await fbs.fill('90');

  await expect(fbs).toHaveValue('90');

  await fbs.fill('');

  await expect(fbs).toHaveValue('');

});


// =====================================================
// TC_70 - Verify Blood Group Selection Can Be Changed
// =====================================================

test('TC_70_Verify_Blood_Group_Selection_Can_Be_Changed', async ({ page }) => {

  const bloodGroup = page.locator(
    'select[name="blood_group"]'
  );

  await bloodGroup.selectOption(
    '9d2e999b-538f-11e6-9cfe-86f436325720'
  );

  await expect(bloodGroup).toHaveValue(
    '9d2e999b-538f-11e6-9cfe-86f436325720'
  );

  await bloodGroup.selectOption(
    '9d2e98dc-538f-11e6-9cfe-86f436325720'
  );

  await expect(bloodGroup).toHaveValue(
    '9d2e98dc-538f-11e6-9cfe-86f436325720'
  );

});


// =====================================================
// TC_71 - Verify Blood Group Can Be Reset To Default
// =====================================================

test('TC_71_Verify_Blood_Group_Can_Be_Reset_To_Default', async ({ page }) => {

  const bloodGroup = page.locator(
    'select[name="blood_group"]'
  );

  await bloodGroup.selectOption(
    '9d2e999b-538f-11e6-9cfe-86f436325720'
  );

  await expect(bloodGroup).not.toHaveValue('');

  await bloodGroup.selectOption('');

  await expect(bloodGroup).toHaveValue('');

});


// =====================================================
// TC_72 - Verify Height Input Accepts Decimal Precision
// =====================================================

test('TC_72_Verify_Height_Decimal_Precision', async ({ page }) => {

  const height = page.locator(
    'input[name="height_cm"]'
  );

  await height.fill('172.55');

  await expect(height).toHaveValue('172.55');

});


// =====================================================
// TC_73 - Verify Weight Input Accepts Decimal Precision
// =====================================================

test('TC_73_Verify_Weight_Decimal_Precision', async ({ page }) => {

  const weight = page.locator(
    'input[name="weight_kg"]'
  );

  await weight.fill('63.75');

  await expect(weight).toHaveValue('63.75');

});


// =====================================================
// TC_74 - Verify Next Does Not Proceed With Invalid Required Fields
// =====================================================

test('TC_74_Verify_Next_Does_Not_Proceed_With_Invalid_Required_Fields', async ({ page }) => {

  const height = page.locator(
    'input[name="height_cm"]'
  );

  await height.fill('170');

  await page.getByRole('button', {
    name: 'Next'
  }).click();

  await expect(
    page.getByText('Weight (kg) is required', {
      exact: true
    })
  ).toBeVisible();

  await expect(
    page.getByRole('button', {
      name: 'Confirm'
    })
  ).not.toBeVisible();

});


// =====================================================
// TC_75 - Verify Next Proceeds After All Required Fields Are Valid
// =====================================================

test('TC_75_Verify_Next_Proceeds_After_Required_Fields_Are_Valid', async ({ page }) => {

  await page.locator(
    'input[name="height_cm"]'
  ).fill('170');

  await page.locator(
    'input[name="weight_kg"]'
  ).fill('63');

  await page.locator(
    'input[name="pulse_bpm"]'
  ).fill('72');

  await page.locator(
    'input[name="respiratory_rate"]'
  ).fill('18');

  await page.locator(
    'input[name="ppbs_mg_per_dl"]'
  ).fill('140');

  await page.locator(
    'input[name="rbs_mg_per_dl"]'
  ).fill('110');

  await page.locator(
    'input[name="waist_circumference_cm"]'
  ).fill('80');

  await page.locator(
    'input[name="hip_circumference_cm"]'
  ).fill('95');

  await page.locator(
    'input[name="ogtt_mg_per_dl"]'
  ).fill('140');

  await page.locator(
    'input[name="hba1c"]'
  ).fill('5.7');

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

});
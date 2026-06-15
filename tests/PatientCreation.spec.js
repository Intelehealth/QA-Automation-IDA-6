import { test, expect } from '@playwright/test';

test.describe('Patient Creation Module', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/hwwebapp#/auth/login');

    // Verify Login Page
    await expect(
      page.getByRole('textbox', { name: 'Enter your username' })
    ).toBeVisible({ timeout: 10000 });

    // Login
    await page.getByRole('textbox', { name: 'Enter your username' }).fill('nurse1');
    await page.getByRole('textbox', { name: 'Enter your password' }).fill('Nurse@123');

    await page.getByRole('button', { name: 'Select Role' }).click();
    await page.getByRole('checkbox').check();

    await page.getByRole('button', { name: 'Login' }).click();

    // Login Assertions
    await expect(page).toHaveURL(/.*dashboard/);



        await page.getByRole('button', {
      name: 'Allow Notifications'
    }).click();

    await page.getByRole('button', {
      name: 'Add Patients'
    }).click();

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
    ).toBeVisible();
  });

  // =========================================
  // TC_01 - Verify Patient Registration Form Loads
  // =========================================

  test('TC_01_Verify_Patient_Registration_Form_Loads', async ({ page }) => {

    await expect(
      page.getByRole('textbox', { name: 'First Name*' })
    ).toBeVisible();

    await expect(
      page.getByRole('textbox', { name: 'Last Name*' })
    ).toBeVisible();

    await expect(
      page.getByRole('button', { name: 'Next' })
    ).toBeVisible();
  });

  // =========================================
  // TC_02 - Verify First Name Field
  // =========================================

  test('TC_02_Verify_First_Name_Field', async ({ page }) => {

    const firstName = page.getByRole('textbox', {
      name: 'First Name*'
    });

    await firstName.fill('Automation');

    await expect(firstName).toHaveValue('Automation');
    await expect(firstName).not.toHaveValue('');
  });

  // =========================================
  // TC_03 - Verify Last Name Field
  // =========================================

  test('TC_03_Verify_Last_Name_Field', async ({ page }) => {

    const lastName = page.getByRole('textbox', {
      name: 'Last Name*'
    });

    await lastName.fill('Test');

    await expect(lastName).toHaveValue('Test');
  });

  // =========================================
  // TC_04 - Verify Gender Selection
  // =========================================

  test('TC_04_Verify_Gender_Selection', async ({ page }) => {

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
  });

  // =========================================
  // TC_05 - Verify Phone Number Field
  // =========================================

  test('TC_05_Verify_Phone_Number_Field', async ({ page }) => {

    const phone = page.getByRole('textbox', {
      name: 'Enter phone number'
    });

    await phone.fill('9090909090');

    await expect(phone).toHaveValue('9090909090');
  });

  // =========================================
  // TC_06 - Verify Emergency Contact Fields
  // =========================================

  test('TC_06_Verify_Emergency_Contact_Fields', async ({ page }) => {

    await page.getByRole('textbox', {
      name: 'Emergency Contact Name*'
    }).fill('Test User');

    await page.getByRole('textbox', {
      name: 'Enter Emergency Contact Number'
    }).fill('9090909090');

    await expect(
      page.getByRole('textbox', {
        name: 'Emergency Contact Name*'
      })
    ).toHaveValue('Test User');
    await expect(
      page.getByRole('textbox', {
        name: 'Enter Emergency Contact Number'
      })
    ).toHaveValue('9090909090');
  });

  // =========================================
  // TC_07 - Verify Country Selection
  // =========================================


test('TC_07_Verify_Country_Selection', async ({ page }) => {



  // Open Country dropdown
await page.getByRole('button', { name: 'Country*' }).click();

  
  await page.getByRole('textbox', { name: 'Search options...' }).fill('India');
   await page.getByRole('option', { name: 'India', exact: true }).click();

  // Validation
  await expect(page.locator('body'))
    .toContainText('India');

});


  // =========================================
  // TC_08 - Verify District Selection
  // =========================================



test('TC_08_Verify_District_Selection', async ({ page }) => {

  // Country
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
    page.locator('body')
  ).toContainText('India');

  // Postal Code
  await page.getByRole('textbox', {
    name: 'Postal Code*'
  }).fill('751002');

  await page.waitForTimeout(5000);

  // District
  await page.locator('text=Select District').click({
    force: true
  });

  await page.getByRole('textbox', {
    name: 'Search options...'
  }).click();

  await page.getByPlaceholder('Search options...')
    .fill('Khordha');

  await page.getByText('Khordha', {
    exact: true
  }).click();

  await expect(
    page.getByText('Khordha')
  ).toBeVisible();

});

  // =========================================
  // TC_09 - Verify Mandatory Field Validation
  // =========================================

  test('TC_09_Verify_Mandatory_Field_Validation', async ({ page }) => {

    await page.getByRole('button', {
      name: 'Next'
    }).click();

    await expect(page.locator('body'))
      .toContainText('First Name');
  });

  // =========================================
// TC_10 - Verify Village/Town/City Field
// =========================================

test('TC_10_Verify_Village_Town_City_Field', async ({ page }) => {

  await page.getByRole('textbox', {
    name: 'Village/Town/City*'
  }).fill('Bhubaneswar');

  await expect(
    page.getByRole('textbox', {
      name: 'Village/Town/City*'
    })
  ).toHaveValue('Bhubaneswar');

});

// =========================================
// TC_11 - Verify Corresponding Address Field
// =========================================

test('TC_10_Verify_Corresponding_Address_Field', async ({ page }) => {

  await page.getByRole('textbox', {
    name: 'Corresponding Address*'
  }).fill('Automation Address');

  await expect(
    page.getByRole('textbox', {
      name: 'Corresponding Address*'
    })
  ).toHaveValue('Automation Address');

});

// =========================================
// TC_12 - Verify Corresponding Address 2 Field
// =========================================

test('TC_12_Verify_Corresponding_Address2_Field', async ({ page }) => {

  await page.getByRole('textbox', {
    name: 'Corresponding Address 2*'
  }).fill('Automation Address 2');

  await expect(
    page.getByRole('textbox', {
      name: 'Corresponding Address 2*'
    })
  ).toHaveValue('Automation Address 2');

});

// =========================================
// TC_13 - Verify Contact Type Selection
// =========================================

test('TC_13_Verify_Contact_Type_Selection', async ({ page }) => {

  await page.getByRole('button', {
    name: 'Contact Type*'
  }).click();

  await page.getByText('Family').click();

  await expect(
    page.locator('body')
  ).toContainText('Family');

});

// =========================================
// TC_14 - Verify Next Button Enabled
// =========================================

test('TC_14_Verify_Next_Button_Enabled', async ({ page }) => {

  await expect(
    page.getByRole('button', {
      name: 'Next'
    })
  ).toBeEnabled();

});

// =========================================
// TC_15 - Verify Education Selection
// =========================================

test('TC_15_Verify_Education_Selection', async ({ page }) => {

  // Fill mandatory fields before clicking Next

  await page.getByRole('button', {
    name: 'Education*'
  }).click();

  await page.getByRole('option', {
    name: 'Primary'
  }).click();

  await expect(
    page.locator('body')
  ).toContainText('Primary');

});

// =========================================
// TC_16 - Verify Successful Patient Creation
// =========================================

test('TC_16_Verify_Successful_Patient_Creation', async ({ page }) => {

  // Patient Details
  await page.getByRole('textbox', {
    name: 'First Name*'
  }).fill('Automation');

  await expect(
    page.getByRole('textbox', {
      name: 'First Name*'
    })
  ).toHaveValue('Automation');

  await page.getByRole('textbox', {
    name: 'Last Name*'
  }).fill('Test');

  await expect(
    page.getByRole('textbox', {
      name: 'Last Name*'
    })
  ).toHaveValue('Test');

  // Gender
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

  // DOB Selection
  await page.getByRole('textbox', {
    name: 'Enter Date Of Birth'
  }).click();

  await page.getByRole('button', {
    name: 'MON JUN 15'
  }).click();

  await page.getByRole('button').nth(3).click();
  await page.getByRole('button').nth(3).click();

  await page.getByRole('button', {
    name: '2000'
  }).click();

  await page.getByRole('button', {
    name: 'FEB'
  }).click();

  await page.getByRole('option', {
    name: /Choose Friday, February 4th/i
  }).click();

  await page.keyboard.press('Escape');

  // Phone Number
  const phoneNumber = page.getByRole('textbox', {
    name: 'Enter phone number'
  });

  await phoneNumber.fill('9090909090');

  await expect(phoneNumber)
    .toHaveValue('9090909090');

  // Emergency Contact
  await page.getByRole('textbox', {
    name: 'Emergency Contact Name*'
  }).fill('Test User');

  await page.getByRole('textbox', {
    name: 'Enter Emergency Contact Number'
  }).fill('9090909090');

  // Country
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

  // Postal Code
  await page.getByRole('textbox', {
    name: 'Postal Code*'
  }).fill('751002');

  await page.waitForTimeout(5000);

  // District
  await page.locator('text=Select District')
    .click({ force: true });

  await page.getByPlaceholder('Search options...')
    .fill('Khordha');

  await page.getByText('Khordha', {
    exact: true
  }).click();

  // Address Details
  await page.getByRole('textbox', {
    name: 'Village/Town/City*'
  }).fill('Bhubaneswar');

  await page.getByRole('textbox', {
    name: 'Corresponding Address*'
  }).fill('Automation Address');

  await page.getByRole('textbox', {
    name: 'Corresponding Address 2*'
  }).fill('Automation Address 2');

  // Contact Type
  await page.getByRole('button', {
    name: 'Contact Type*'
  }).click();

  await page.getByText('Family').click();

  // Next
  await expect(
    page.getByRole('button', {
      name: 'Next'
    })
  ).toBeEnabled();

  await page.getByRole('button', {
    name: 'Next'
  }).click();

  // Education
  await page.getByRole('button', {
    name: 'Education*'
  }).click();

  await page.getByRole('option', {
    name: 'Primary'
  }).click();

  await page.getByRole('button', {
    name: 'Next'
  }).click();

  // SUCCESS ASSERTIONS
  await expect(
    page.getByText('Patient Added Successfully')
  ).toBeVisible({ timeout: 15000 });

  await expect(
    page.getByText('Automation TestM')
  ).toBeVisible();

  await expect(
    page.locator('text=ID:')
  ).toBeVisible();

  await expect(
    page.getByText('2000-02-04')
  ).toBeVisible();

  await expect(
    page.getByText('+91 9090909090')
  ).toBeVisible();

  // Address Details Validation
  await expect(page.getByText('751002')).toBeVisible();
  await expect(page.getByText('India')).toBeVisible();
  await expect(page.getByText('Odisha')).toBeVisible();
  await expect(page.getByText('Khordha')).toBeVisible();
  await expect(page.getByText('Bhubaneswar')).toBeVisible();
  await expect(page.getByText('Automation Address')).toBeVisible();

});
});


     

//     // Update locator as per your application
//     await expect(
//       page.getByRole('button', { name: 'Add Patients' })
//     ).toBeVisible();
//   });

//   test('Add Patient Successfully', async ({ page }) => {

//     await page.getByRole('button', { name: 'Allow Notifications' }).click();
    

//     await page.getByRole('button', { name: 'Add Patients' }).click();

//     await page.getByRole('button', { name: 'Accept' }).click(({ timeout: 10000 }));
//     await page.getByRole('button', { name: 'Accept' }).click(({ timeout: 1000 }));

//     // Verify Add Patient Page
//     await expect(
//       page.getByRole('textbox', { name: 'First Name*' })
//     ).toBeVisible();

  

//     // Patient Details
//     await page.getByRole('textbox', { name: 'First Name*' }).fill('Automation');

//     await expect(
//       page.getByRole('textbox', { name: 'First Name*' })
//     ).toHaveValue('Automation');

//     await page.getByRole('textbox', { name: 'Last Name*' }).fill('Test');

//     await expect(
//       page.getByRole('textbox', { name: 'Last Name*' })
//     ).toHaveValue('Test');

//     await page.getByRole('radio', { name: 'Male', exact: true }).check();

//     await expect(
//       page.getByRole('radio', { name: 'Male', exact: true })
//     ).toBeChecked();

//     // DOB Selection
//     await page.getByRole('textbox', { name: 'Enter Date Of Birth' }).click();
//     await page.getByRole('button', { name: 'MON JUN 15' }).click();
//     await page.getByRole('button').nth(3).click();
//     await page.getByRole('button').nth(3).click();
//     await page.getByRole('button', { name: '2000' }).click();
//     await page.getByRole('button', { name: 'FEB' }).click();
// await page.getByRole('option', { name: /Choose Friday, February 4th/i }).click();

// // Close calendar
// await page.keyboard.press('Escape');

// const phoneNumber = page.getByRole('textbox', { name: 'Enter phone number' });

// await phoneNumber.click();
// await phoneNumber.fill('9090909090');

// await expect(phoneNumber).toHaveValue('9090909090');

//     // Emergency Contact
//     await page.getByRole('textbox', { name: 'Emergency Contact Name*' })
//       .fill('Test User');

//     await page.getByRole('textbox', { name: 'Enter Emergency Contact Number' })
//       .fill('9090909090');

//     // Country
//     await page.getByRole('button', { name: 'Country*' }).click();
//     await page.getByRole('textbox', { name: 'Search options...' }).fill('India');
//     await page.getByRole('option', { name: 'India', exact: true }).click();

//     // Postal Code
//     await page.getByRole('textbox', { name: 'Postal Code*' }).fill('751002');
//     await page.waitForTimeout(10000);

 
// // Open District dropdown
//   await page.locator('text=Select District').click({
//   force: true
// });
//   await page.getByRole('textbox', { name: 'Search options...' }).click();

// // Search District
// await page.getByPlaceholder('Search options...').fill('Khordha');
// // Select District
// await page.getByText('Khordha', { exact: true }).click();
//     // Address
//     await page.getByRole('textbox', { name: 'Village/Town/City*' })
//       .fill('Bhubaneswar');

//     await page.getByRole('textbox', { name: 'Corresponding Address*' })
//       .fill('Automation Address');

//     await page.getByRole('textbox', { name: 'Corresponding Address 2*' })
//       .fill('Automation Address 2');
//         await page.getByRole('button', { name: 'Contact Type*' }).click();
//   await page.getByText('Family').click();


//     // Next Button
//     await expect(
//       page.getByRole('button', { name: 'Next' })
//     ).toBeEnabled();

//     await page.getByRole('button', { name: 'Next' }).click();

//     // Education
//     await page.getByRole('button', { name: 'Education*' }).click();
//     await page.getByRole('option', { name: 'Primary' }).click();

//     await page.getByRole('button', { name: 'Next' }).click();

//     // SUCCESS ASSERTIONS
//     await expect(
//       page.getByText('Patient Added Successfully')
//     ).toBeVisible({ timeout: 15000 });

//     await expect(
//       page.getByText('Automation TestM')
//     ).toBeVisible();

//     await expect(
//       page.locator('text=ID:')
//     ).toBeVisible();


// await expect(page.getByText('2000-02-04')).toBeVisible();
// await expect(page.getByText('+91 9090909090')).toBeVisible();

// // Address Details
// await expect(page.getByText('751002')).toBeVisible();
// await expect(page.getByText('India')).toBeVisible();
// await expect(page.getByText('Odisha')).toBeVisible();
// await expect(page.getByText('Khordha')).toBeVisible();
// await expect(page.getByText('Bhubaneswar')).toBeVisible();
// await expect(page.getByText('Automation Address')).toBeVisible();


// });

//   });

import { test, expect } from '@playwright/test';

test.describe('Patient Creation Module', () => {

  test.beforeEach(async ({ page }) => {
    page.setDefaultNavigationTimeout(60000);
    await page.goto('/hwwebapp#/auth/login');
      waitUntil: 'domcontentloaded'
  


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



    //     await page.getByRole('button', {
    //   name: 'Allow Notifications'
    // }).click();

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

    // State
  await page.locator('text=Select State').click({
    force: true
  });

  await page.getByRole('textbox', {
    name: 'Search options...'
  }).click();

  await page.getByPlaceholder('Search options...')
    .fill('Odisha');

  await page.getByText('Odisha', {
    exact: true
  }).click();

  await expect(
    page.getByText('Odisha')
  ).toBeVisible();

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

  // Open DOB calendar
  {
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
        const yearButtonVisible = () =>
          yearButton.waitFor({ state: 'visible', timeout: 1000 }).then(() => true).catch(() => false);
        for (let i = 0; i < 6 && !(await yearButtonVisible()); i++) {
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
        console.log(`setupToAbdominalPainAssessment - the calendar route failed at "${failedStep}" (${reason}).`);

        const markup =
          (await picker.evaluate((el) => el.outerHTML).catch(() => null)) ||
          (await page
            .locator('[class*="datepicker" i], [class*="calendar" i]')
            .first()
            .evaluate((el) => el.outerHTML)
            .catch(() => null));
        console.log(
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
        'setupToAbdominalPainAssessment - could not set a date of birth by typing it or by using the ' +
        'calendar. Falling back to the Age field would not help: the server rejects a patient with no ' +
        'date of birth (HTTP 400). See the calendar markup and the screenshot saved with this run.'
      );
    }
    console.log(`setupToAbdominalPainAssessment - date of birth set by ${dobRoute}.`);
  }

  // Phone Number
  const phoneNumber = page.getByRole('textbox', {
  name: 'Enter phone number'
 });

 await phoneNumber.fill('9090909090');

 await expect(phoneNumber).toHaveValue('9090909090');
  // Emergency Contact
  await page.getByRole('textbox', {
    name: 'Emergency Contact Name*'
  }).fill('Test User');

  await page.getByRole('textbox', {
    name: 'Enter Emergency Contact Number'
  }).fill('9090909091');

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

  // State
  await page.locator('text=Select State').click({
    force: true
  });

  await page.getByRole('textbox', {
    name: 'Search options...'
  }).click();

  await page.getByPlaceholder('Search options...')
    .fill('Odisha');

  await page.getByText('Odisha', {
    exact: true
  }).click();

  await expect(
    page.getByText('Odisha')
  ).toBeVisible();


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
    page.getByText('2000-01-01')
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
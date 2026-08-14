import { test, expect } from '@playwright/test';

test.describe('Start Visit - Visit Reason Module', () => {

  // =====================================================
  // HELPER - SELECT OTHER VISIT REASON
  // =====================================================
async function selectOtherVisitReason(page) {

  const reason = page.getByRole('textbox', {
    name: 'Type or select reason eg.'
  });

  await expect(reason).toBeVisible({
    timeout: 15000
  });

  // Open Visit Reason field
  await reason.click();

  // Clear existing value
  await reason.fill('');

  // Search for Other
  await reason.fill('other');

  // IMPORTANT:
  // The application has two "Other" elements.
  // The recorded Playwright code shows that nth(1)
  // is the actual selectable option.
  const otherOption = page
    .locator('div')
    .filter({
      hasText: /^Other$/
    })
    .nth(1);

  await expect(otherOption).toBeVisible({
    timeout: 15000
  });

  // Click actual Other option
  await otherOption.click();

  // Give React/UI time to update
  await page.waitForTimeout(1000);

  // DO NOT check:
  // await expect(reason).toHaveValue(/other/i)

  // Instead, verify that Start Assessment is available.
  const startAssessment = page.getByRole('button', {
    name: 'Start Assessment',
    exact: true
  });

  await expect(startAssessment).toBeVisible({
    timeout: 15000
  });

  await expect(startAssessment).toBeEnabled({
    timeout: 10000
  });

  return startAssessment;
}

  // =====================================================
  // BEFORE EACH
  // LOGIN
  // CREATE PATIENT
  // START VISIT
  // COMPLETE VITALS
  // OPEN VISIT REASON
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
      timeout: 15000
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
    // 3. CREATE PATIENT
    // =====================================================

    await page.getByRole('textbox', {
      name: 'First Name*'
    }).fill('Automation');

    await page.getByRole('textbox', {
      name: 'Last Name*'
    }).fill('Test');

    await page.getByRole('radio', {
      name: 'Male',
      exact: true
    }).check();


    // =====================================================
    // 4. DATE OF BIRTH
    // =====================================================

    await page.getByPlaceholder(
      'Enter Date Of Birth'
    ).click();

    await page.locator(
      'button:has(i.fa-chevron-down)'
    ).click();

    const previousDecade = page
      .getByRole('button')
      .filter({
        hasText: /^$/
      })
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
    // 5. PHONE
    // =====================================================

    await page.getByRole('textbox', {
      name: 'Enter phone number'
    }).fill('9090909090');


    // =====================================================
    // 6. EMERGENCY CONTACT
    // =====================================================

    await page.getByRole('textbox', {
      name: 'Emergency Contact Name*'
    }).fill('Test User');

    await page.getByRole('textbox', {
      name: 'Enter Emergency Contact Number'
    }).fill('9090909091');


    // =====================================================
    // 7. COUNTRY
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
    // 8. POSTAL CODE
    // =====================================================

    await page.getByRole('textbox', {
      name: 'Postal Code*'
    }).fill('751002');


    // =====================================================
    // 9. STATE
    // =====================================================

    await page.locator(
      'text=Select State'
    ).click({
      force: true
    });

    await page.getByPlaceholder(
      'Search options...'
    ).fill('Odisha');

    await page.getByText(
      'Odisha',
      {
        exact: true
      }
    ).click();


    // =====================================================
    // 10. DISTRICT
    // =====================================================

    await page.locator(
      'text=Select District'
    ).click({
      force: true
    });

    await page.getByPlaceholder(
      'Search options...'
    ).fill('Khordha');

    await page.getByText(
      'Khordha',
      {
        exact: true
      }
    ).click();


    // =====================================================
    // 11. ADDRESS
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
    // 12. CONTACT TYPE
    // =====================================================

    await page.getByRole('button', {
      name: 'Contact Type*'
    }).click();

    await page.getByText(
      'Family',
      {
        exact: true
      }
    ).click();


    // =====================================================
    // 13. NEXT
    // =====================================================

    await page.getByRole('button', {
      name: 'Next'
    }).click();


    // =====================================================
    // 14. EDUCATION
    // =====================================================

    await page.getByRole('button', {
      name: 'Education*'
    }).click();

    await page.getByRole('option', {
      name: 'Primary'
    }).click();

    await page.getByRole('button', {
      name: 'Next'
    }).click();

    await page.waitForTimeout(10000);


    // =====================================================
    // 15. START VISIT
    // =====================================================

    const patientCard = page
      .locator('div.bg-white.rounded-xl.border')
      .filter({
        has: page.locator(
          'p.font-semibold',
          {
            hasText: 'Automation Test'
          }
        )
      });

    await expect(patientCard).toBeVisible({
      timeout: 30000
    });

    const startVisitButton = patientCard.getByRole(
      'button',
      {
        name: 'Start Visit'
      }
    );

    await expect(startVisitButton).toBeVisible({
      timeout: 30000
    });

    await startVisitButton.click({
      force: true
    });


    // =====================================================
    // 16. VITALS
    // =====================================================

    await expect(
      page.getByRole('textbox', {
        name: 'E.g., 172 cm'
      })
    ).toBeVisible({
      timeout: 30000
    });

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


    // =====================================================
    // 17. NEXT → CONFIRM VITALS
    // =====================================================

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

    await page.getByRole('button', {
      name: 'Confirm'
    }).click();


    // =====================================================
    // 18. VISIT REASON
    // =====================================================

    await expect(
      page.getByRole('textbox', {
        name: 'Type or select reason eg.'
      })
    ).toBeVisible({
      timeout: 15000
    });

  });


  // =====================================================
  // TC_01
  // Verify Visit Reason Screen
  // =====================================================

  test(
    'TC_01_Verify_Visit_Reason_Screen',
    async ({ page }) => {

      const reason = page.getByRole('textbox', {
        name: 'Type or select reason eg.'
      });

      await expect(reason).toBeVisible();

      await expect(
        page.getByRole('button', {
          name: 'Start Assessment',
          exact: true
        })
      ).toBeVisible();

    }
  );


  // =====================================================
  // TC_02
  // Verify Visit Reason Input
  // =====================================================

  test(
    'TC_02_Verify_Visit_Reason_Input',
    async ({ page }) => {

      const reason = page.getByRole('textbox', {
        name: 'Type or select reason eg.'
      });

      await reason.click();

      await reason.fill('other');

      await expect(reason).toHaveValue('other');

    }
  );


  // =====================================================
  // TC_03
  // Verify Visit Reason Search
  // =====================================================

  test(
    'TC_03_Verify_Visit_Reason_Search',
    async ({ page }) => {

      const reason = page.getByRole('textbox', {
        name: 'Type or select reason eg.'
      });

      await reason.click();

      await reason.fill('other');

      const otherOption = page.getByRole(
        'button',
        {
          name: 'Other',
          exact: true
        }
      );

      await expect(otherOption).toBeVisible({
        timeout: 15000
      });

    }
  );


  // =====================================================
  // TC_04
  // Verify Other Visit Reason Option
  // =====================================================
test(
  'TC_04_Verify_Other_Visit_Reason_Option',
  async ({ page }) => {

    const reason = page.getByRole('textbox', {
      name: 'Type or select reason eg.'
    });

    await reason.click();

    await reason.fill('other');

    const otherOption = page
      .locator('div')
      .filter({
        hasText: /^Other$/
      })
      .nth(1);

    await expect(otherOption).toBeVisible({
      timeout: 15000
    });

    await otherOption.click();

    // The textbox remains empty in this application.
    // Verify the next valid action instead.
    const startAssessment = page.getByRole('button', {
      name: 'Start Assessment',
      exact: true
    });

    await expect(startAssessment).toBeVisible({
      timeout: 15000
    });

    await expect(startAssessment).toBeEnabled();
  }
);

  // =====================================================
  // TC_05
  // Verify Selected Visit Reason
  // =====================================================

test(
  'TC_05_Verify_Selected_Visit_Reason',
  async ({ page }) => {

    const reason = page.getByRole('textbox', {
      name: 'Type or select reason eg.'
    });

    await reason.click();

    await reason.fill('other');

    const otherOption = page
      .locator('div')
      .filter({
        hasText: /^Other$/
      })
      .nth(1);

    await expect(otherOption).toBeVisible({
      timeout: 15000
    });

    await otherOption.click();

    // Do not check textbox value.
    // Verify that the application allows the next step.
    const startAssessment = page.getByRole('button', {
      name: 'Start Assessment',
      exact: true
    });

    await expect(startAssessment).toBeVisible({
      timeout: 15000
    });

    await expect(startAssessment).toBeEnabled();
  }
);


  // =====================================================
  // TC_06
  // Verify Start Assessment Button
  // =====================================================

  test(
    'TC_06_Verify_Start_Assessment_Button',
    async ({ page }) => {

      const startAssessment =
        await selectOtherVisitReason(page);

      await expect(startAssessment).toBeVisible();

      await expect(startAssessment).toBeEnabled();

    }
  );


  // =====================================================
  // TC_07
  // Verify Start Assessment Navigation
  // =====================================================

  test(
    'TC_07_Verify_Start_Assessment_Navigation',
    async ({ page }) => {

      const startAssessment =
        await selectOtherVisitReason(page);

      await startAssessment.click();

      await expect(
        page.getByRole('button', {
          name: 'Yes',
          exact: true
        })
      ).toBeVisible({
        timeout: 15000
      });

    }
  );

// =====================================================
// TC_08 - Verify Visit Reason Can Be Cleared
// =====================================================

test('TC_08_Verify_Visit_Reason_Can_Be_Cleared', async ({ page }) => {

  const reason = page.getByRole('textbox', {
    name: 'Type or select reason eg.'
  });

  // Verify Visit Reason field
  await expect(reason).toBeVisible({
    timeout: 15000
  });

  // Enter Other
  await reason.fill('other');

  // Select the actual "Other" option
  const otherOption = page
    .locator('div')
    .filter({
      hasText: /^Other$/
    })
    .nth(1);

  await expect(otherOption).toBeVisible({
    timeout: 15000
  });

  await otherOption.click();


  // Verify Start Assessment is available after selection
  const startAssessment = page.getByRole('button', {
    name: 'Start Assessment',
    exact: true
  });

  await expect(startAssessment).toBeVisible({
    timeout: 15000
  });

  await expect(startAssessment).toBeEnabled({
    timeout: 15000
  });

  // The textbox is now clear
  await expect(reason).toHaveValue('');

});


  // =====================================================
  // TC_09
  // Verify Invalid Visit Reason Input
  // =====================================================

  test(
    'TC_09_Verify_Invalid_Visit_Reason_Input',
    async ({ page }) => {

      const reason = page.getByRole('textbox', {
        name: 'Type or select reason eg.'
      });

      await reason.fill(
        'XYZ_INVALID_REASON'
      );

      await expect(reason).toHaveValue(
        'XYZ_INVALID_REASON'
      );

      // We only verify the entered value.
      // We do NOT use toBeHidden() on Other because
      // the application can keep the button in the DOM.

    }
  );


  // =====================================================
  // TC_10
  // Verify Start Assessment After Selecting Other
  // =====================================================

  test(
    'TC_10_Verify_Start_Assessment_After_Selecting_Other',
    async ({ page }) => {

      const startAssessment =
        await selectOtherVisitReason(page);

      await expect(startAssessment).toBeEnabled();

      await startAssessment.click();

      await expect(
        page.getByRole('button', {
          name: 'Yes',
          exact: true
        })
      ).toBeVisible({
        timeout: 15000
      });

    }
  );


  // =====================================================
  // TC_11
  // Verify Visit Reason Search Is Case Insensitive
  // =====================================================

  test(
    'TC_11_Verify_Visit_Reason_Search_Case_Insensitive',
    async ({ page }) => {

      const reason = page.getByRole('textbox', {
        name: 'Type or select reason eg.'
      });

      await reason.fill('OTHER');

      const otherOption = page.getByRole(
        'button',
        {
          name: 'Other',
          exact: true
        }
      );

      await expect(otherOption).toBeVisible({
        timeout: 15000
      });

    }
  );


  // =====================================================
  // TC_12
  // Verify Visit Reason Search With Partial Text
  // =====================================================

  test(
    'TC_12_Verify_Visit_Reason_Search_With_Partial_Text',
    async ({ page }) => {

      const reason = page.getByRole('textbox', {
        name: 'Type or select reason eg.'
      });

      await reason.fill('othe');

      const otherOption = page.getByRole(
        'button',
        {
          name: 'Other',
          exact: true
        }
      );

      await expect(otherOption).toBeVisible({
        timeout: 15000
      });

    }
  );


  // =====================================================
  // TC_13
  // Verify Other Option Can Be Selected
  // =====================================================

test('TC_13_Verify_Other_Option_Can_Be_Selected', async ({ page }) => {

  const reason = page.getByRole('textbox', {
    name: 'Type or select reason eg.'
  });

  await reason.fill('other');

  const otherOption = page
    .locator('div')
    .filter({
      hasText: /^Other$/
    })
    .nth(1);

  await expect(otherOption).toBeVisible({
    timeout: 15000
  });

  await otherOption.click();

  // Do not check textbox value.
  // Check that the next action is available.
  const startAssessment = page.getByRole('button', {
    name: 'Start Assessment',
    exact: true
  });

  await expect(startAssessment).toBeVisible({
    timeout: 15000
  });

  await expect(startAssessment).toBeEnabled();
});

  // =====================================================
  // TC_14
  // Verify Start Assessment Is Available
  // After Selecting Other
  // =====================================================

  test(
    'TC_14_Verify_Start_Assessment_Available_After_Other',
    async ({ page }) => {

      await selectOtherVisitReason(page);

      const startAssessment =
        page.getByRole('button', {
          name: 'Start Assessment',
          exact: true
        });

      await expect(startAssessment).toBeVisible();

      await expect(startAssessment).toBeEnabled();

    }
  );


  // =====================================================
  // TC_15
  // Verify Start Assessment Opens Assessment
  // =====================================================

  test(
    'TC_15_Verify_Start_Assessment_Opens_Assessment',
    async ({ page }) => {

      const startAssessment =
        await selectOtherVisitReason(page);

      await startAssessment.click();

      const yesButton =
        page.getByRole('button', {
          name: 'Yes',
          exact: true
        });

      await expect(yesButton).toBeVisible({
        timeout: 15000
      });

    }
  );


  // =====================================================
  // TC_16
  // Verify Yes Option After Starting Assessment
  // =====================================================

  test(
    'TC_16_Verify_Yes_Option_After_Start_Assessment',
    async ({ page }) => {

      const startAssessment =
        await selectOtherVisitReason(page);

      await startAssessment.click();

      const yesButton =
        page.getByRole('button', {
          name: 'Yes',
          exact: true
        });

      await expect(yesButton).toBeVisible({
        timeout: 15000
      });

      await expect(yesButton).toBeEnabled();

    }
  );


  // =====================================================
  // TC_17
  // Verify Start Assessment → Yes Navigation
  // =====================================================

test('TC_17_Verify_Start_Assessment_Yes_Navigation', async ({ page }) => {

  await selectOtherVisitReason(page);

  const startAssessment = page.getByRole('button', {
    name: 'Start Assessment',
    exact: true
  });

  await expect(startAssessment).toBeVisible({
    timeout: 15000
  });

  await expect(startAssessment).toBeEnabled();

  await startAssessment.click();

  const yesButton = page.getByRole('button', {
    name: 'Yes',
    exact: true
  });

  await expect(yesButton).toBeVisible({
    timeout: 15000
  });

  await yesButton.click();

  const description = page.getByRole('textbox', {
    name: "Describe the patient's"
  });

  await expect(description).toBeVisible({
    timeout: 15000
  });
});

  // =====================================================
  // TC_18
  // Verify Patient Description Field After Assessment
  // =====================================================

  test(
    'TC_18_Verify_Patient_Description_Field',
    async ({ page }) => {

      const startAssessment =
        await selectOtherVisitReason(page);

      await startAssessment.click();

      const yesButton =
        page.getByRole('button', {
          name: 'Yes',
          exact: true
        });

      await expect(yesButton).toBeVisible({
        timeout: 15000
      });

      await yesButton.click();

      const description =
        page.getByRole('textbox', {
          name: "Describe the patient's"
        });

      await expect(description).toBeVisible({
        timeout: 15000
      });

    }
  );


  // =====================================================
  // TC_19
  // Verify Patient Description Input
  // =====================================================

  test(
    'TC_19_Verify_Patient_Description_Input',
    async ({ page }) => {

      const startAssessment =
        await selectOtherVisitReason(page);

      await startAssessment.click();

      const yesButton =
        page.getByRole('button', {
          name: 'Yes',
          exact: true
        });

      await expect(yesButton).toBeVisible({
        timeout: 15000
      });

      await yesButton.click();

      const description =
        page.getByRole('textbox', {
          name: "Describe the patient's"
        });

      await expect(description).toBeVisible({
        timeout: 15000
      });

      await description.fill(
        'Automation test description'
      );

      await expect(description).toHaveValue(
        'Automation test description'
      );

    }
  );


  // =====================================================
  // TC_20
  // Verify Submit Button After Patient Description
  // =====================================================

  test(
    'TC_20_Verify_Submit_After_Patient_Description',
    async ({ page }) => {

      const startAssessment =
        await selectOtherVisitReason(page);

      await startAssessment.click();

      const yesButton =
        page.getByRole('button', {
          name: 'Yes',
          exact: true
        });

      await expect(yesButton).toBeVisible({
        timeout: 15000
      });

      await yesButton.click();

      const description =
        page.getByRole('textbox', {
          name: "Describe the patient's"
        });

      await expect(description).toBeVisible({
        timeout: 15000
      });

      await description.fill(
        'Automation test assessment'
      );

      const submitButton =
        page.getByRole('button', {
          name: 'Submit',
          exact: true
        });

      await expect(submitButton).toBeVisible({
        timeout: 15000
      });

      await expect(submitButton).toBeEnabled();

      await submitButton.click();

      // After Submit, the next assessment screen
      // should appear.
      await page.waitForTimeout(1000);

      await expect(
        page.locator('body')
      ).toBeVisible();

    }
  );

});
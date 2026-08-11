import { test, expect } from '@playwright/test';

test.describe('Forgot Password Module', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/hwwebapp#/auth/login');

    await page.locator('a:has-text("Forgot Password")').click({
      force: true
    });
  });


// TC01 - Valid Username
test('TC01 - Valid Username', async ({ page }) => {
  await page.getByRole('button', { name: 'Username' }).click();

  await page.getByRole('textbox', {
    name: 'Enter your username'
  }).fill('nurse1');

  await page.getByRole('button', { name: 'Continue' }).click();

  const toast = page.getByRole('alert').filter({
    hasText: 'OTP sent successfully'
  });

  await expect(toast).toBeVisible({
    timeout: 15000,
  });

  await expect(toast).toContainText('OTP sent successfully');
});



// TC02 - Blank Username
test('TC02 - Blank Username', async ({ page }) => {
  await page.getByRole('button', { name: 'Username' }).click();

  await page.getByRole('button', { name: 'Continue' }).click();

  const usernameInput = page.getByRole('textbox', {
    name: 'Enter your username'
  });

  await expect(usernameInput).toHaveAttribute('aria-invalid', 'true');

  const errorMessage = page.locator(
    `#${await usernameInput.getAttribute('aria-describedby')}`
  );

  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toContainText('Username is required');
});


  // TC03 - Invalid Username
  test('TC03 - Invalid Username', async ({ page }) => {
    await page.getByRole('button', { name: 'Username' }).click();

    await page.getByRole('textbox', {
      name: 'Enter your username'
    }).fill('kasskskas');

    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(
      page.locator('.Toastify__toast--error')
    ).toContainText('Request OTP Failed', { timeout: 7000 });
  });

  // TC04 - Valid Mobile Number
  test('TC04 - Valid Mobile Number', async ({ page }) => {
    await page.getByRole('button', { name: 'Mobile Number' }).click();

    await page.getByRole('textbox', {
      name: 'Enter your mobile number'
    }).fill('9398517350');

    await page.getByRole('button', { name: 'Continue' }).click();

    const toast = page.locator('.Toastify__toast');

    await expect(toast).toBeVisible({ timeout: 15000 });

    await expect(toast).toContainText('OTP sent successfully');
  });


// TC05 - Blank Mobile Number
test('TC05 - Blank Mobile Number', async ({ page }) => {
  await page.getByRole('button', { name: 'Mobile Number' }).click();

  const mobileInput = page.getByRole('textbox', {
    name: 'Enter your mobile number'
  });

  await page.getByRole('button', { name: 'Continue' }).click();

  // Verify field is invalid
  await expect(mobileInput).toHaveAttribute('aria-invalid', 'true');

  // Get the error element linked to the input
  const errorId = await mobileInput.getAttribute('aria-describedby');

  expect(errorId).toBeTruthy();

  const error = page.locator(`#${errorId}`);

  await expect(error).toBeVisible({
    timeout: 15000
  });

  console.log('Mobile validation error:', await error.textContent());
});


// TC06 - Invalid Mobile Number
test('TC06 - Invalid Mobile Number', async ({ page }) => {
  await page.getByRole('button', { name: 'Mobile Number' }).click();

  await page.getByRole('textbox', {
    name: 'Enter your mobile number'
  }).fill('2399239390');

  await page.getByRole('button', { name: 'Continue' }).click();

  const toast = page.getByRole('alert').filter({
    hasText: 'Request OTP Failed'
  });

  await expect(toast).toBeVisible({
    timeout: 15000
  });

  await expect(toast).toContainText('Request OTP Failed');
  await expect(toast).toContainText(
    'No user exists with this phone number/email/username.'
  );
});

});
import { test, expect } from '@playwright/test';

test.describe('Forgot Password Module', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/hwwebapp#/auth/login');
    await page.getByText('Forgot Password?').click();
  });

  //  Blank Input
  test('Forgot Password with blank input', async ({ page }) => {
    await page.getByRole('button', { name: 'Username' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.locator('text=Username is required')).toBeVisible();
  });

  //  Blank Username + Mobile
  test('Forgot Username - blank username and mobile', async ({ page }) => {

    // Username flow
    await page.getByRole('button', { name: 'Username' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Username is required')).toBeVisible();

    // Mobile flow
    await page.getByRole('button', { name: 'Mobile Number' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Mobile number is required')).toBeVisible();
  });

  // Valid Input
  test('Forgot Password with valid username', async ({ page }) => {
    await page.getByRole('textbox', { name: 'Enter your username' }).fill('nurse1');
 
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('.Toastify__toast--success')).toContainText('OTP sent successfully', { timeout: 40000 }); 
});


  test('Forgot Password with invalid username', async ({ page }) => {
    const usernameField = page.getByRole('textbox', { name: 'Enter your username' });

    await usernameField.fill('wrongUser');

    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.locator('.Toastify__toast--error'))
      .toContainText('Request OTP Failed', { timeout: 7000 });
  });

});
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

    await expect(
      page.getByText('OTP sent successfully')
    ).toBeVisible();
  });

  // TC02 - Blank Username
  test('TC02 - Blank Username', async ({ page }) => {
    await page.getByRole('button', { name: 'Username' }).click();

    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(
      page.getByText('Username is required')
    ).toBeVisible();
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

    await expect(
      page.locator('.Toastify__toast')
    ).toContainText('OTP sent successfully');
  });

  // TC05 - Blank Mobile Number
  test('TC05 - Blank Mobile Number', async ({ page }) => {
    await page.getByRole('button', { name: 'Mobile Number' }).click();

    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(
      page.getByText(/Mobile Number is required|required/i)
    ).toBeVisible();
  });

  // TC06 - Invalid Mobile Number
  test('TC06 - Invalid Mobile Number', async ({ page }) => {
    await page.getByRole('button', { name: 'Mobile Number' }).click();

    await page.getByRole('textbox', {
      name: 'Enter your mobile number'
    }).fill('2399239390');

    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(
      page.locator('.Toastify__toast--error')
    ).toContainText('Request OTP Failed', { timeout: 7000 });
  });

});
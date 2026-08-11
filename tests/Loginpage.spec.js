
import { test, expect } from '@playwright/test';

test.describe('Login Module', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/hwwebapp#/auth/login');

    // Wait for login page to load properly
    await expect(
      page.getByRole('textbox', { name: 'Enter your username' })
    ).toBeVisible({ timeout: 10000 });
  });


  // =========================================================
  // UI TEST CASES
  // =========================================================

  // Positive Test
  test('Valid login', async ({ page }) => {
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

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText('Welcome')).toBeVisible();
  });


  // Blank Inputs
  test('Login with blank username and password', async ({ page }) => {
    await page.getByRole('button', {
      name: 'Login'
    }).click();

    await expect(
      page.getByText('Username is required')
    ).toBeVisible();

    await expect(
      page.getByText('Password is required')
    ).toBeVisible();
  });


  // Invalid Username
  test('Login with invalid username', async ({ page }) => {
    await page.getByRole('textbox', {
      name: 'Enter your username'
    }).fill('wrongUser');

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

    const toast = page.getByRole('alert').filter({
      hasText: 'Login Failed'
    });

    await expect(toast).toBeVisible({
      timeout: 15000
    });
  });


  // Invalid Password
  test('Login with invalid password', async ({ page }) => {
    await page.getByRole('textbox', {
      name: 'Enter your username'
    }).fill('nurse1');

    await page.getByRole('textbox', {
      name: 'Enter your password'
    }).fill('WrongPass');

    await page.getByRole('button', {
      name: 'Select Role'
    }).click();

    await page.getByRole('checkbox').check();

    await page.getByRole('button', {
      name: 'Login'
    }).click();

    const toast = page.getByRole('alert').filter({
      hasText: 'Login Failed'
    });

    await expect(toast).toBeVisible({
      timeout: 15000
    });
  });


  // =========================================================
  // API TEST CASES
  // =========================================================

  // API - Valid Login
  test('API - Valid Login', async ({ request }) => {

    const response = await request.post(
      'https://dev.intelehealth.org:3030/auth/login',
      {
        data: {
          username: 'nurse1',
          password: 'Nurse@123'
        }
      }
    );

    // Verify HTTP status
    expect(response.status()).toBe(200);

    // Parse response
    const responseBody = await response.json();

    // Verify login success
    expect(responseBody.status).toBe(true);

    // Verify token is generated
    expect(responseBody.token).toBeTruthy();

    // Verify token is a string
    expect(typeof responseBody.token).toBe('string');
  });

});

import { test, expect } from '@playwright/test';
import { clearAuthState, mockUser, mockToken } from './fixtures/auth.fixture';
import { setupApiMocks } from './fixtures/api-mocks';

test.describe('Auth Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('login page renders correctly with email and PIN inputs', async ({ page }) => {
    await clearAuthState(page);
    await page.goto('/login');

    // Page title / heading
    await expect(page.getByRole('heading', { name: 'TILO' })).toBeVisible();
    await expect(page.getByText('Masuk ke akun backoffice Anda')).toBeVisible();

    // Email input
    const emailInput = page.getByLabel('Email');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');

    // PIN input
    const pinInput = page.getByLabel('PIN');
    await expect(pinInput).toBeVisible();
    await expect(pinInput).toHaveAttribute('type', 'password');
    await expect(pinInput).toHaveAttribute('maxlength', '6');
    await expect(pinInput).toHaveAttribute('inputmode', 'numeric');

    // Submit button
    const submitButton = page.getByRole('button', { name: 'Masuk' });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test('shows validation for empty fields via required attribute', async ({ page }) => {
    await clearAuthState(page);
    await page.goto('/login');

    // Both inputs should have the required attribute
    const emailInput = page.getByLabel('Email');
    const pinInput = page.getByLabel('PIN');

    await expect(emailInput).toHaveAttribute('required', '');
    await expect(pinInput).toHaveAttribute('required', '');

    // Attempt to submit the form with empty fields
    // The browser should prevent submission due to required fields
    await page.getByRole('button', { name: 'Masuk' }).click();

    // We should still be on the login page since form validation should prevent navigation
    await expect(page).toHaveURL(/\/login/);
  });

  test('navigates to dashboard on successful login', async ({ page }) => {
    await clearAuthState(page);
    await page.goto('/login');

    // Mock the login endpoint to set auth state properly
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: mockToken,
          employeeId: mockUser.employeeId,
          employeeName: mockUser.name,
          role: mockUser.role,
          businessId: mockUser.businessId,
          outletId: mockUser.outletId,
        }),
      });
    });

    // Fill in login form
    await page.getByLabel('Email').fill('john@tilo.test');
    await page.getByLabel('PIN').fill('123456');

    // Submit
    await page.getByRole('button', { name: 'Masuk' }).click();

    // Should navigate to dashboard (root path)
    await expect(page).toHaveURL(/^http:\/\/localhost:5173\/?$/);

    // Dashboard content should be visible
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('redirects to login when not authenticated', async ({ page }) => {
    await clearAuthState(page);

    // Try to access a protected route
    await page.goto('/');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects to login when trying to access products without auth', async ({ page }) => {
    await clearAuthState(page);

    await page.goto('/products');

    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects to login when trying to access POS without auth', async ({ page }) => {
    await clearAuthState(page);

    await page.goto('/pos');

    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects to login when trying to access KDS without auth', async ({ page }) => {
    await clearAuthState(page);

    await page.goto('/kds');

    await expect(page).toHaveURL(/\/login/);
  });
});

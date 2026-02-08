import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks } from './fixtures/api-mocks';

test.describe('Settings Pages', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  // ===========================================================================
  // Business Settings
  // ===========================================================================
  test.describe('Business Settings', () => {
    test('page loads', async ({ page }) => {
      await page.goto('/app/settings/business');
      // Wait for page content (not login page)
      await expect(page.locator('h1, h2').filter({ hasNotText: 'TILO' }).first()).toBeVisible({ timeout: 15000 });
    });

    test('has form elements', async ({ page }) => {
      await page.goto('/app/settings/business');
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

      // Should have input fields or form elements
      const inputs = page.locator('input, select, textarea');
      await expect(inputs.first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ===========================================================================
  // Outlets Settings
  // ===========================================================================
  test.describe('Outlets Settings', () => {
    test('page loads', async ({ page }) => {
      await page.goto('/app/settings/outlets');
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    });

    test('has content structure', async ({ page }) => {
      await page.goto('/app/settings/outlets');
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

      // Should show "Tambah Outlet" button
      await expect(page.getByRole('button', { name: 'Tambah Outlet' })).toBeVisible({ timeout: 10000 });
    });
  });

  // ===========================================================================
  // Devices Settings
  // ===========================================================================
  test.describe('Devices Settings', () => {
    test('page loads', async ({ page }) => {
      await page.goto('/app/settings/devices');
      await expect(page.locator('h1, h2').filter({ hasNotText: 'TILO' }).first()).toBeVisible({ timeout: 15000 });
    });
  });

  // ===========================================================================
  // Notifications Settings
  // ===========================================================================
  test.describe('Notifications Settings', () => {
    test('page loads', async ({ page }) => {
      await page.goto('/app/settings/notifications');
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ===========================================================================
  // Tax Settings
  // ===========================================================================
  test.describe('Tax Settings', () => {
    test('page loads', async ({ page }) => {
      await page.goto('/app/settings/tax');
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ===========================================================================
  // Receipt Settings
  // ===========================================================================
  test.describe('Receipt Settings', () => {
    test('page loads', async ({ page }) => {
      await page.goto('/app/settings/receipt');
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ===========================================================================
  // Operating Hours Settings
  // ===========================================================================
  test.describe('Operating Hours Settings', () => {
    test('page loads', async ({ page }) => {
      await page.goto('/app/settings/hours');
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ===========================================================================
  // Modifier Groups Settings
  // ===========================================================================
  test.describe('Modifier Groups Settings', () => {
    test('page loads', async ({ page }) => {
      await page.goto('/app/settings/modifiers');
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    });

    test('has table or empty state', async ({ page }) => {
      await page.goto('/app/settings/modifiers');
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

      const table = page.locator('table');
      const emptyState = page.getByText(/belum ada|tidak ditemukan/i);
      await expect(table.or(emptyState).first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ===========================================================================
  // Navigation between settings pages
  // ===========================================================================
  test('can navigate to business settings from sidebar', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Click Bisnis in sidebar
    await page.locator('aside').getByText('Bisnis').click();
    await expect(page).toHaveURL(/\/app\/settings\/business/);
  });
});

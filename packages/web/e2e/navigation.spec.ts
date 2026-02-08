import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks } from './fixtures/api-mocks';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('sidebar renders with navigation sections', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // TILO branding
    await expect(sidebar.getByText('TILO')).toBeVisible();

    // Main nav items
    await expect(sidebar.getByText('Dashboard')).toBeVisible();
    await expect(sidebar.getByText('POS Terminal')).toBeVisible();
    await expect(sidebar.getByText('Kitchen Display')).toBeVisible();

    // Penjualan section
    await expect(sidebar.getByText('Transaksi')).toBeVisible();
    await expect(sidebar.getByText('Pesanan')).toBeVisible();
    await expect(sidebar.getByText('Meja')).toBeVisible();

    // Katalog section
    await expect(sidebar.getByText('Produk')).toBeVisible();
  });

  test('navigates between pages correctly', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Navigate to Products
    await page.locator('aside').getByText('Produk').click();
    await expect(page).toHaveURL(/\/app\/products/);
    await expect(page.getByText('Kelola daftar produk Anda')).toBeVisible();

    // Navigate to Employees
    await page.locator('aside').getByText('Karyawan').click();
    await expect(page).toHaveURL(/\/app\/employees/);
    await expect(page.getByText('Kelola daftar karyawan Anda')).toBeVisible();

    // Navigate to Transactions
    await page.locator('aside').getByText('Transaksi').click();
    await expect(page).toHaveURL(/\/app\/transactions/);

    // Navigate back to Dashboard
    await page.locator('aside').getByText('Dashboard').click();
    await expect(page).toHaveURL(/\/app\/?$/);
  });

  test('sidebar collapse/expand works', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText('TILO')).toBeVisible();

    // Click the collapse toggle button
    const toggleButton = sidebar.locator('button').first();
    await toggleButton.click();

    // After collapsing, the TILO text should be hidden
    await expect(sidebar.getByText('TILO')).toBeHidden({ timeout: 3000 });

    // Click toggle again to expand
    await toggleButton.click();

    // TILO text should reappear
    await expect(sidebar.getByText('TILO')).toBeVisible({ timeout: 3000 });
  });

  test('header shows user information', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Header area should show user-related info (name and outlet)
    // The actual values come from the real backend seed data
    const header = page.locator('header');
    await expect(header).toBeVisible();
    // Should show outlet name somewhere in the header
    await expect(header.getByText(/Outlet|Pusat/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('theme toggle button exists', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Theme toggle button should be in the header area
    const themeToggle = page.locator('button').filter({ has: page.locator('svg.lucide-moon, svg.lucide-sun') });
    await expect(themeToggle.first()).toBeVisible();
  });

  test('POS Terminal link navigates correctly', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    await page.locator('aside').getByText('POS Terminal').click();
    await expect(page).toHaveURL(/\/pos/);
  });

  test('Kitchen Display link navigates correctly', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    await page.locator('aside').getByText('Kitchen Display').click();
    await expect(page).toHaveURL(/\/kds/);
  });
});

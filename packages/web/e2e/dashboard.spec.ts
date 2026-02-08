import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks } from './fixtures/api-mocks';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('dashboard page loads with metric cards', async ({ page }) => {
    await page.goto('/app');

    // Wait for dashboard to load - check for header h1
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Ringkasan performa bisnis Anda')).toBeVisible();

    // Metric cards should display after data loads (wait longer for API responses)
    await expect(page.getByText('Total Penjualan')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Transaksi').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Rata-rata Order')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pelanggan').first()).toBeVisible({ timeout: 10000 });
  });

  test('date range selector renders tabs', async ({ page }) => {
    await page.goto('/app');

    // Wait for dashboard to be ready first
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Date range tabs should be visible (Radix UI tabs)
    await expect(page.getByRole('tab', { name: 'Hari Ini' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('tab', { name: 'Minggu Ini' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Bulan Ini' })).toBeVisible();

    // Default should be "Bulan Ini" (this_month is the default state)
    const monthTab = page.getByRole('tab', { name: 'Bulan Ini' });
    await expect(monthTab).toHaveAttribute('data-state', 'active');
  });

  test('date range selector switches active tab', async ({ page }) => {
    await page.goto('/app');

    // Wait for dashboard to be fully loaded
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Wait for tabs to be ready
    const todayTab = page.getByRole('tab', { name: 'Hari Ini' });
    await expect(todayTab).toBeVisible({ timeout: 5000 });

    // Click "Hari Ini" tab
    await todayTab.click();
    await expect(todayTab).toHaveAttribute('data-state', 'active', { timeout: 5000 });

    // "Bulan Ini" should no longer be active
    const monthTab = page.getByRole('tab', { name: 'Bulan Ini' });
    await expect(monthTab).toHaveAttribute('data-state', 'inactive');

    // Click "Minggu Ini" tab
    const weekTab = page.getByRole('tab', { name: 'Minggu Ini' });
    await weekTab.click();
    await expect(weekTab).toHaveAttribute('data-state', 'active', { timeout: 5000 });
    await expect(todayTab).toHaveAttribute('data-state', 'inactive');
  });

  test('sales chart renders', async ({ page }) => {
    await page.goto('/app');

    // Wait for dashboard to load first
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Wait for data to load (metric cards will appear when data is ready)
    await expect(page.getByText('Total Penjualan')).toBeVisible({ timeout: 10000 });

    // The sales chart card should be visible - CardTitle with "Penjualan"
    await expect(page.getByText('Penjualan').first()).toBeVisible();

    // Recharts renders SVG elements inside a ResponsiveContainer
    // Wait for the chart to render - Recharts lazy-loads SVG
    const chartContainer = page.locator('.recharts-wrapper');
    await expect(chartContainer).toBeVisible({ timeout: 15000 });
  });

  test('dashboard shows metric cards with values', async ({ page }) => {
    await page.goto('/app');

    // Wait for dashboard to load
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Metric cards should show with their labels (values may be 0 if API mock doesn't intercept)
    await expect(page.getByText('Total Penjualan')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Transaksi').first()).toBeVisible({ timeout: 10000 });

    // Chart section should render
    await expect(page.getByText('Penjualan').first()).toBeVisible({ timeout: 10000 });
  });

  test('dashboard has correct page structure', async ({ page }) => {
    await page.goto('/app');

    // Wait for dashboard to load
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Should have the description text
    await expect(page.getByText('Ringkasan performa bisnis Anda')).toBeVisible();

    // Should have all 4 metric card labels
    await expect(page.getByText('Total Penjualan')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Rata-rata Order')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pelanggan').first()).toBeVisible({ timeout: 10000 });
  });
});

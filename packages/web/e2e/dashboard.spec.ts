import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks } from './fixtures/api-mocks';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('dashboard page loads with metric cards', async ({ page }) => {
    await page.goto('/');

    // Page header
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Ringkasan performa bisnis Anda')).toBeVisible();

    // Metric cards should display after data loads
    await expect(page.getByText('Total Penjualan')).toBeVisible();
    await expect(page.getByText('Transaksi')).toBeVisible();
    await expect(page.getByText('Rata-rata Order')).toBeVisible();
    await expect(page.getByText('Pelanggan')).toBeVisible();
  });

  test('date range selector renders tabs', async ({ page }) => {
    await page.goto('/');

    // Date range tabs should be visible
    await expect(page.getByRole('tab', { name: 'Hari Ini' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Minggu Ini' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Bulan Ini' })).toBeVisible();

    // Default should be "Bulan Ini"
    const monthTab = page.getByRole('tab', { name: 'Bulan Ini' });
    await expect(monthTab).toHaveAttribute('data-state', 'active');
  });

  test('date range selector switches active tab', async ({ page }) => {
    await page.goto('/');

    // Click "Hari Ini" tab
    const todayTab = page.getByRole('tab', { name: 'Hari Ini' });
    await todayTab.click();
    await expect(todayTab).toHaveAttribute('data-state', 'active');

    // "Bulan Ini" should no longer be active
    const monthTab = page.getByRole('tab', { name: 'Bulan Ini' });
    await expect(monthTab).toHaveAttribute('data-state', 'inactive');

    // Click "Minggu Ini" tab
    const weekTab = page.getByRole('tab', { name: 'Minggu Ini' });
    await weekTab.click();
    await expect(weekTab).toHaveAttribute('data-state', 'active');
    await expect(todayTab).toHaveAttribute('data-state', 'inactive');
  });

  test('sales chart renders', async ({ page }) => {
    await page.goto('/');

    // The sales chart card should be visible
    await expect(page.getByText('Penjualan').first()).toBeVisible();

    // Recharts renders SVG elements inside a ResponsiveContainer
    // Wait for the chart to render
    const chartContainer = page.locator('.recharts-wrapper');
    await expect(chartContainer).toBeVisible({ timeout: 10000 });
  });

  test('financial metrics display when data loads', async ({ page }) => {
    await page.goto('/');

    // Financial metrics should appear
    await expect(page.getByText('Pendapatan')).toBeVisible();
    await expect(page.getByText('Laba Kotor')).toBeVisible();
    await expect(page.getByText('Margin')).toBeVisible();
  });

  test('shows loading skeletons initially', async ({ page }) => {
    // Delay API responses to see loading state
    await page.route('**/api/v1/reports/sales*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalSales: 15000000,
          totalTransactions: 245,
          averageOrderValue: 61224,
          salesByDate: [],
        }),
      });
    });

    await page.goto('/');

    // Should show skeleton loading indicators
    const skeletons = page.locator('[class*="animate-pulse"], [data-slot="skeleton"]');
    // At least some skeleton elements should be present during loading
    await expect(skeletons.first()).toBeVisible({ timeout: 3000 });
  });
});

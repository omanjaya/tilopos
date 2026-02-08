import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks } from './fixtures/api-mocks';

test.describe('Inventory Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test.describe('Stock Overview Page', () => {
    test('stock page loads with structure', async ({ page }) => {
      await page.goto('/app/inventory/stock');

      // Page title
      await expect(page.getByRole('heading', { name: /Stok Barang/i })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Monitor stok per outlet')).toBeVisible();
    });

    test('stock table has correct columns', async ({ page }) => {
      await page.goto('/app/inventory/stock');
      await expect(page.getByRole('heading', { name: /Stok Barang/i })).toBeVisible({ timeout: 10000 });

      // Table column headers
      await expect(page.getByText('Produk').first()).toBeVisible();
      await expect(page.getByText('SKU').first()).toBeVisible();
      await expect(page.getByText('Stok Saat Ini').first()).toBeVisible();
      await expect(page.getByText('Stok Minimum').first()).toBeVisible();
      await expect(page.getByText('Status').first()).toBeVisible();
    });

    test('displays stock data in table', async ({ page }) => {
      await page.goto('/app/inventory/stock');
      await expect(page.getByRole('heading', { name: /Stok Barang/i })).toBeVisible({ timeout: 10000 });

      // Table should show product rows from seed data
      const dataRow = page.locator('table tbody tr').first();
      await expect(dataRow).toBeVisible({ timeout: 10000 });
    });

    test('shows metric cards', async ({ page }) => {
      await page.goto('/app/inventory/stock');
      await expect(page.getByRole('heading', { name: /Stok Barang/i })).toBeVisible({ timeout: 10000 });

      // Metric cards
      await expect(page.getByText('Total Produk')).toBeVisible();
      await expect(page.getByText('Stok Rendah').first()).toBeVisible();
      await expect(page.getByText('Stok Habis')).toBeVisible();
    });
  });

  test.describe('Stock Adjustment', () => {
    test('can open stock adjustment dialog', async ({ page }) => {
      await page.goto('/app/inventory/stock');
      await expect(page.getByRole('heading', { name: /Stok Barang/i })).toBeVisible({ timeout: 10000 });

      const adjustButton = page.getByRole('button', { name: /Adjustment Stok/i });
      await expect(adjustButton).toBeVisible();
      await adjustButton.click();
      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test('stock adjustment dialog has form fields', async ({ page }) => {
      await page.goto('/app/inventory/stock');
      await expect(page.getByRole('heading', { name: /Stok Barang/i })).toBeVisible({ timeout: 10000 });

      // Open dialog via row Adjust button
      const adjustRowButton = page.getByRole('button', { name: /^Adjust$/i }).first();
      await expect(adjustRowButton).toBeVisible({ timeout: 10000 });
      await adjustRowButton.click();

      // Dialog should have form elements
      await expect(page.getByRole('dialog')).toBeVisible();
    });
  });

  test.describe('Stock Filter Tabs', () => {
    test('stock page has filter tabs', async ({ page }) => {
      await page.goto('/app/inventory/stock');
      await expect(page.getByRole('heading', { name: /Stok Barang/i })).toBeVisible({ timeout: 10000 });

      // Tabs: Semua, Stok Rendah, Habis
      await expect(page.getByRole('tab', { name: /Semua/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Stok Rendah/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Habis/i })).toBeVisible();
    });

    test('can filter by low stock', async ({ page }) => {
      await page.goto('/app/inventory/stock');
      await expect(page.getByRole('heading', { name: /Stok Barang/i })).toBeVisible({ timeout: 10000 });

      const lowStockTab = page.getByRole('tab', { name: /Stok Rendah/i });
      await lowStockTab.click();
      await expect(lowStockTab).toHaveAttribute('data-state', 'active');
    });

    test('can filter by out of stock', async ({ page }) => {
      await page.goto('/app/inventory/stock');
      await expect(page.getByRole('heading', { name: /Stok Barang/i })).toBeVisible({ timeout: 10000 });

      const outOfStockTab = page.getByRole('tab', { name: /Habis/i });
      await outOfStockTab.click();
      await expect(outOfStockTab).toHaveAttribute('data-state', 'active');
    });
  });

  test.describe('Stock Transfer', () => {
    test('transfers page is accessible', async ({ page }) => {
      await page.goto('/app/inventory/transfers');

      await expect(page.getByRole('heading', { name: /Transfer|Transfers/i })).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Stock Page Actions', () => {
    test('has adjustment button in header', async ({ page }) => {
      await page.goto('/app/inventory/stock');
      await expect(page.getByRole('heading', { name: /Stok Barang/i })).toBeVisible({ timeout: 10000 });

      const adjustButton = page.getByRole('button', { name: /Adjustment Stok/i });
      await expect(adjustButton).toBeVisible();
    });

    test('has adjust button per row', async ({ page }) => {
      await page.goto('/app/inventory/stock');
      await expect(page.getByRole('heading', { name: /Stok Barang/i })).toBeVisible({ timeout: 10000 });

      const adjustRowButton = page.getByRole('button', { name: /^Adjust$/i }).first();
      await expect(adjustRowButton).toBeVisible({ timeout: 10000 });
    });

    test('shows Normal status badges', async ({ page }) => {
      await page.goto('/app/inventory/stock');
      await expect(page.getByRole('heading', { name: /Stok Barang/i })).toBeVisible({ timeout: 10000 });

      // Products with sufficient stock show "Normal" badge
      await expect(page.getByText('Normal').first()).toBeVisible({ timeout: 10000 });
    });
  });
});

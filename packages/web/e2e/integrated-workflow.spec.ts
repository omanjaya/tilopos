import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks } from './fixtures/api-mocks';

/**
 * Integrated Workflow Tests
 *
 * These tests verify cross-page navigation, feature page accessibility,
 * sidebar consistency, and that authentication persists across navigations.
 * They focus on UI structure rather than mock data or real-time data flows.
 */

test.describe('Cross-Page Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('navigate from dashboard to products via sidebar', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Click Produk in sidebar
    await page.locator('a[href="/app/products"]').click();
    await expect(page).toHaveURL(/\/app\/products/);
    await expect(page.locator('h1').filter({ hasText: 'Produk' })).toBeVisible({ timeout: 10000 });
  });

  test('navigate from dashboard to POS via sidebar', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // POS Terminal link in sidebar
    await page.locator('a[href="/pos"]').click();
    await expect(page).toHaveURL(/\/pos/);

    // POS page should load (it has a product grid or search)
    const posContent = page.getByText('Pesanan').or(page.getByPlaceholder(/Cari/i));
    await expect(posContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('navigate from products back to dashboard', async ({ page }) => {
    await page.goto('/app/products');
    await expect(page.locator('h1').filter({ hasText: 'Produk' })).toBeVisible({ timeout: 10000 });

    // Click Dashboard in sidebar
    await page.locator('a[href="/app"]').click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });
  });

  test('navigate to settings and back to dashboard', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Navigate to business settings
    await page.locator('a[href="/app/settings/business"]').click();
    await expect(page).toHaveURL(/\/app\/settings\/business/);

    // Settings page should load with some heading or content
    const settingsHeading = page.locator('h1').filter({ hasText: /Bisnis|Pengaturan|Settings/i });
    const settingsContent = page.getByText(/Bisnis|Pengaturan|Informasi/i).first();
    await expect(settingsHeading.or(settingsContent).first()).toBeVisible({ timeout: 10000 });

    // Navigate back to dashboard
    await page.locator('a[href="/app"]').click();
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });
  });

  test('navigate between orders and tables pages', async ({ page }) => {
    await page.goto('/app/orders');

    // Orders page should load
    const ordersHeading = page.locator('h1').filter({ hasText: /Pesanan|Order/i });
    const ordersEmpty = page.getByText(/Belum ada|kosong|tidak ada/i);
    await expect(ordersHeading.or(ordersEmpty).first()).toBeVisible({ timeout: 10000 });

    // Navigate to tables
    await page.locator('a[href="/app/tables"]').click();
    await expect(page).toHaveURL(/\/app\/tables/);

    const tablesHeading = page.locator('h1').filter({ hasText: /Meja|Table/i });
    const tablesContent = page.getByText(/Meja|Table|Belum ada/i).first();
    await expect(tablesHeading.or(tablesContent).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Feature Page Access', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('POS terminal loads after authenticated navigation', async ({ page }) => {
    await page.goto('/pos');

    // POS page should render product grid or search or cart panel
    const posElement = page
      .getByText('Pesanan')
      .or(page.getByPlaceholder(/Cari/i))
      .or(page.getByText(/Semua Kategori|Kategori/i));
    await expect(posElement.first()).toBeVisible({ timeout: 10000 });
  });

  test('orders page accessible from sidebar', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    await page.locator('a[href="/app/orders"]').click();
    await expect(page).toHaveURL(/\/app\/orders/);

    // Page should load with heading or empty state
    const ordersHeading = page.locator('h1').filter({ hasText: /Pesanan|Order/i });
    const ordersContent = page.getByText(/Pesanan|Order|Belum ada/i).first();
    await expect(ordersHeading.or(ordersContent).first()).toBeVisible({ timeout: 10000 });
  });

  test('reports page accessible from sidebar', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    await page.locator('a[href="/app/reports"]').click();
    await expect(page).toHaveURL(/\/app\/reports/);

    const reportsHeading = page.locator('h1').filter({ hasText: /Laporan|Report/i });
    const reportsContent = page.getByText(/Laporan|Report|Penjualan/i).first();
    await expect(reportsHeading.or(reportsContent).first()).toBeVisible({ timeout: 10000 });
  });

  test('inventory stock page accessible from sidebar', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    await page.locator('a[href="/app/inventory/stock"]').click();
    await expect(page).toHaveURL(/\/app\/inventory\/stock/);

    const stockHeading = page.locator('h1').filter({ hasText: /Stok|Inventory|Stock/i });
    const stockContent = page.getByText(/Stok|Inventory|Stock|Belum ada/i).first();
    await expect(stockHeading.or(stockContent).first()).toBeVisible({ timeout: 10000 });
  });

  test('employees page accessible from sidebar', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    await page.locator('a[href="/app/employees"]').click();
    await expect(page).toHaveURL(/\/app\/employees/);

    const employeesHeading = page.locator('h1').filter({ hasText: /Karyawan|Employee/i });
    const employeesContent = page.getByText(/Karyawan|Employee|Belum ada/i).first();
    await expect(employeesHeading.or(employeesContent).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Multi-Page State', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('auth persists across multiple page navigations', async ({ page }) => {
    // Navigate through several pages and verify no redirect to login
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    await page.goto('/app/products');
    await expect(page.locator('h1').filter({ hasText: 'Produk' })).toBeVisible({ timeout: 10000 });
    // Should NOT be redirected to /login
    await expect(page).not.toHaveURL(/\/login/);

    await page.goto('/app/reports');
    const reportsHeading = page.locator('h1').filter({ hasText: /Laporan|Report/i });
    const reportsContent = page.getByText(/Laporan|Report|Penjualan/i).first();
    await expect(reportsHeading.or(reportsContent).first()).toBeVisible({ timeout: 10000 });
    await expect(page).not.toHaveURL(/\/login/);

    await page.goto('/app/customers');
    const customersHeading = page.locator('h1').filter({ hasText: /Pelanggan|Customer/i });
    const customersContent = page.getByText(/Pelanggan|Customer|Belum ada/i).first();
    await expect(customersHeading.or(customersContent).first()).toBeVisible({ timeout: 10000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('sidebar is visible and consistent across pages', async ({ page }) => {
    // Check sidebar is present on dashboard
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Check key sidebar links are present
    await expect(page.locator('a[href="/app"]')).toBeVisible();
    await expect(page.locator('a[href="/pos"]')).toBeVisible();
    await expect(page.locator('a[href="/app/products"]')).toBeVisible();
    await expect(page.locator('a[href="/app/reports"]')).toBeVisible();

    // Navigate to another page and verify sidebar still has the same links
    await page.goto('/app/products');
    await expect(page.locator('h1').filter({ hasText: 'Produk' })).toBeVisible({ timeout: 10000 });

    await expect(sidebar).toBeVisible();
    await expect(page.locator('a[href="/app"]')).toBeVisible();
    await expect(page.locator('a[href="/pos"]')).toBeVisible();
    await expect(page.locator('a[href="/app/products"]')).toBeVisible();
    await expect(page.locator('a[href="/app/reports"]')).toBeVisible();
  });

  test('TILO branding appears in sidebar across pages', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Sidebar should have the TILO branding
    const tiloBrand = page.locator('aside').getByText('TILO');
    await expect(tiloBrand).toBeVisible({ timeout: 10000 });

    // Navigate to another page
    await page.goto('/app/employees');
    const employeesHeading = page.locator('h1').filter({ hasText: /Karyawan|Employee/i });
    const employeesContent = page.getByText(/Karyawan|Employee|Belum ada/i).first();
    await expect(employeesHeading.or(employeesContent).first()).toBeVisible({ timeout: 10000 });

    // Branding should still be there
    await expect(tiloBrand).toBeVisible();
  });
});

test.describe('Page Load Performance', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('dashboard loads within timeout', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    // Dashboard metric cards should appear
    await expect(page.getByText('Total Penjualan')).toBeVisible({ timeout: 10000 });
  });

  test('POS page loads within timeout', async ({ page }) => {
    await page.goto('/pos');

    // POS should render its main elements
    const posElement = page
      .getByText('Pesanan')
      .or(page.getByPlaceholder(/Cari/i))
      .or(page.getByText(/Semua Kategori|Kategori/i));
    await expect(posElement.first()).toBeVisible({ timeout: 10000 });
  });

  test('multiple sequential page navigations work', async ({ page }) => {
    // Navigate through 4 pages in sequence to verify stability
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

    await page.goto('/app/products');
    await expect(page.locator('h1').filter({ hasText: 'Produk' })).toBeVisible({ timeout: 10000 });

    await page.goto('/app/orders');
    const ordersHeading = page.locator('h1').filter({ hasText: /Pesanan|Order/i });
    const ordersContent = page.getByText(/Pesanan|Order|Belum ada/i).first();
    await expect(ordersHeading.or(ordersContent).first()).toBeVisible({ timeout: 10000 });

    await page.goto('/app/settings/business');
    const settingsHeading = page.locator('h1').filter({ hasText: /Bisnis|Pengaturan|Settings/i });
    const settingsContent = page.getByText(/Bisnis|Pengaturan|Informasi/i).first();
    await expect(settingsHeading.or(settingsContent).first()).toBeVisible({ timeout: 10000 });

    // Final navigation back to dashboard
    await page.goto('/app');
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });
  });
});

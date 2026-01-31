import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks } from './fixtures/api-mocks';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('sidebar renders all navigation sections', async ({ page }) => {
    await page.goto('/');

    // Wait for sidebar to load
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // TILO branding in sidebar
    await expect(sidebar.getByText('TILO')).toBeVisible();

    // Main nav items
    await expect(sidebar.getByText('Dashboard')).toBeVisible();
    await expect(sidebar.getByText('POS Terminal')).toBeVisible();
    await expect(sidebar.getByText('Kitchen Display')).toBeVisible();

    // Penjualan section
    await expect(sidebar.getByText('Penjualan')).toBeVisible();
    await expect(sidebar.getByText('Transaksi')).toBeVisible();
    await expect(sidebar.getByText('Pesanan')).toBeVisible();
    await expect(sidebar.getByText('Meja')).toBeVisible();
    await expect(sidebar.getByText('Shift')).toBeVisible();
    await expect(sidebar.getByText('Penyelesaian')).toBeVisible();

    // Katalog section
    await expect(sidebar.getByText('Katalog')).toBeVisible();
    await expect(sidebar.getByText('Produk')).toBeVisible();
    await expect(sidebar.getByText('Bahan Baku')).toBeVisible();

    // Inventori section
    await expect(sidebar.getByText('Inventori')).toBeVisible();
    await expect(sidebar.getByText('Stok')).toBeVisible();
    await expect(sidebar.getByText('Transfer')).toBeVisible();
    await expect(sidebar.getByText('Supplier')).toBeVisible();
    await expect(sidebar.getByText('Purchase Order')).toBeVisible();

    // Pemasaran section
    await expect(sidebar.getByText('Pemasaran')).toBeVisible();
    await expect(sidebar.getByText('Promosi')).toBeVisible();
    await expect(sidebar.getByText('Voucher')).toBeVisible();
    await expect(sidebar.getByText('Loyalty')).toBeVisible();
    await expect(sidebar.getByText('Toko Online')).toBeVisible();
    await expect(sidebar.getByText('Self Order')).toBeVisible();

    // Lainnya section
    await expect(sidebar.getByText('Lainnya')).toBeVisible();
    await expect(sidebar.getByText('Karyawan')).toBeVisible();
    await expect(sidebar.getByText('Pelanggan')).toBeVisible();
    await expect(sidebar.getByText('Laporan')).toBeVisible();
    await expect(sidebar.getByText('Audit Log')).toBeVisible();

    // Pengaturan section
    await expect(sidebar.getByText('Pengaturan')).toBeVisible();
    await expect(sidebar.getByText('Bisnis')).toBeVisible();
    await expect(sidebar.getByText('Outlet')).toBeVisible();
    await expect(sidebar.getByText('Perangkat')).toBeVisible();
    await expect(sidebar.getByText('Notifikasi')).toBeVisible();
  });

  test('navigates between pages correctly', async ({ page }) => {
    await page.goto('/');

    // Start on dashboard
    await expect(page.getByText('Dashboard')).toBeVisible();

    // Navigate to Products
    await page.locator('aside').getByText('Produk').click();
    await expect(page).toHaveURL(/\/products/);
    await expect(page.getByText('Kelola daftar produk Anda')).toBeVisible();

    // Navigate to Employees
    await page.locator('aside').getByText('Karyawan').click();
    await expect(page).toHaveURL(/\/employees/);
    await expect(page.getByText('Kelola daftar karyawan Anda')).toBeVisible();

    // Navigate to Transactions
    await page.locator('aside').getByText('Transaksi').click();
    await expect(page).toHaveURL(/\/transactions/);

    // Navigate to Reports
    await page.locator('aside').getByText('Laporan').click();
    await expect(page).toHaveURL(/\/reports/);

    // Navigate back to Dashboard
    await page.locator('aside').getByText('Dashboard').click();
    await expect(page).toHaveURL(/^http:\/\/localhost:5173\/?$/);
  });

  test('sidebar collapse/expand works', async ({ page }) => {
    await page.goto('/');

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Sidebar should start expanded (w-60 = 240px)
    await expect(sidebar.getByText('TILO')).toBeVisible();

    // Click the collapse toggle button (ChevronLeft icon button)
    const toggleButton = sidebar.locator('button').first();
    await toggleButton.click();

    // After collapsing, the TILO text should be hidden
    await expect(sidebar.getByText('TILO')).toBeHidden();

    // Section titles should also be hidden when collapsed
    await expect(sidebar.getByText('Penjualan')).toBeHidden();
    await expect(sidebar.getByText('Katalog')).toBeHidden();

    // Click toggle again to expand
    await toggleButton.click();

    // TILO text and section titles should reappear
    await expect(sidebar.getByText('TILO')).toBeVisible();
    await expect(sidebar.getByText('Penjualan')).toBeVisible();
  });

  test('theme toggle switches between light and dark mode', async ({ page }) => {
    await page.goto('/');

    // Find the theme toggle button
    const themeToggle = page.getByRole('button', { name: 'Toggle theme' });
    await expect(themeToggle).toBeVisible();

    // Initially should be light mode (no dark class on html)
    const htmlElement = page.locator('html');

    // Click to switch to dark mode
    await themeToggle.click();

    // The html element should now have the dark class
    await expect(htmlElement).toHaveClass(/dark/);

    // Click again to switch back to light mode
    await themeToggle.click();

    // The html element should no longer have the dark class
    await expect(htmlElement).not.toHaveClass(/dark/);
  });

  test('header shows user information', async ({ page }) => {
    await page.goto('/');

    const header = page.locator('header').first();
    await expect(header).toBeVisible();

    // User name should be visible in the header
    await expect(header.getByText('John Owner')).toBeVisible();
  });

  test('navigating to inventory pages works', async ({ page }) => {
    await page.goto('/');

    // Navigate to Stock
    await page.locator('aside').getByText('Stok').click();
    await expect(page).toHaveURL(/\/inventory\/stock/);

    // Navigate to Transfers
    await page.locator('aside').getByText('Transfer').click();
    await expect(page).toHaveURL(/\/inventory\/transfers/);

    // Navigate to Suppliers
    await page.locator('aside').getByText('Supplier').click();
    await expect(page).toHaveURL(/\/inventory\/suppliers/);
  });

  test('navigating to settings pages works', async ({ page }) => {
    await page.goto('/');

    // Navigate to Business Settings
    await page.locator('aside').getByText('Bisnis').click();
    await expect(page).toHaveURL(/\/settings\/business/);

    // Navigate to Outlet Settings
    await page.locator('aside').getByText('Outlet').click();
    await expect(page).toHaveURL(/\/settings\/outlets/);

    // Navigate to Device Settings
    await page.locator('aside').getByText('Perangkat').click();
    await expect(page).toHaveURL(/\/settings\/devices/);
  });
});

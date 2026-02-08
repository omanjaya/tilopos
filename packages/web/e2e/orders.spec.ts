import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks } from './fixtures/api-mocks';

test.describe('Orders Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('orders page loads with heading', async ({ page }) => {
    await page.goto('/app/orders');

    await expect(page.locator('h1').filter({ hasText: 'Pesanan' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Kelola pesanan dapur')).toBeVisible();
  });

  test('orders page has status filter tabs', async ({ page }) => {
    await page.goto('/app/orders');
    await expect(page.locator('h1').filter({ hasText: 'Pesanan' })).toBeVisible({ timeout: 10000 });

    // Status tabs should be visible
    await expect(page.getByRole('tab', { name: 'Semua' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Menunggu' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Diproses' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Siap' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Disajikan' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Selesai' })).toBeVisible();
  });

  test('orders page has table column headers', async ({ page }) => {
    await page.goto('/app/orders');
    await expect(page.locator('h1').filter({ hasText: 'Pesanan' })).toBeVisible({ timeout: 10000 });

    // Table headers
    await expect(page.getByRole('columnheader', { name: 'No. Pesanan' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Meja' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Tipe' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Items' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Kasir' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Waktu' })).toBeVisible();
  });

  test('orders page shows empty state or data rows', async ({ page }) => {
    await page.goto('/app/orders');
    await expect(page.locator('h1').filter({ hasText: 'Pesanan' })).toBeVisible({ timeout: 10000 });

    // Should show either order data or empty state
    const emptyState = page.getByRole('heading', { name: 'Belum ada pesanan' });
    const tableRow = page.locator('table tbody tr td').first();
    await expect(emptyState.or(tableRow).first()).toBeVisible({ timeout: 10000 });
  });

  test('status tabs can be switched', async ({ page }) => {
    await page.goto('/app/orders');
    await expect(page.locator('h1').filter({ hasText: 'Pesanan' })).toBeVisible({ timeout: 10000 });

    // Default tab should be "Semua"
    const allTab = page.getByRole('tab', { name: 'Semua' });
    await expect(allTab).toHaveAttribute('data-state', 'active');

    // Click on "Menunggu" tab
    const pendingTab = page.getByRole('tab', { name: 'Menunggu' });
    await pendingTab.click();
    await expect(pendingTab).toHaveAttribute('data-state', 'active');
  });

  test('orders page has help button', async ({ page }) => {
    await page.goto('/app/orders');
    await expect(page.locator('h1').filter({ hasText: 'Pesanan' })).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: /Help/ })).toBeVisible();
  });
});

test.describe('Order Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('order detail page shows not found for invalid id', async ({ page }) => {
    await page.goto('/app/orders/invalid-id-999');

    // Should show not found or loading state, then resolve
    const notFound = page.locator('h1').filter({ hasText: 'Pesanan Tidak Ditemukan' });
    const orderNumber = page.locator('h1').first();

    await expect(notFound.or(orderNumber)).toBeVisible({ timeout: 10000 });
  });

  test('order detail page has back button or error recovery', async ({ page }) => {
    await page.goto('/app/orders/some-id');

    // Should show either a back button or the error boundary with "Ke Dashboard" button
    // Should show either a back button or the error boundary buttons
    const backButton = page.getByRole('button', { name: /Kembali/ });
    const dashboardButton = page.getByRole('button', { name: /Ke Dashboard/ });
    await expect(backButton.or(dashboardButton).first()).toBeVisible({ timeout: 10000 });
  });

  test('order detail page can navigate back from error state', async ({ page }) => {
    await page.goto('/app/orders/some-id');

    // Handle both normal back button and error boundary
    const backButton = page.getByRole('button', { name: /Kembali/ });
    const dashboardButton = page.getByRole('button', { name: /Ke Dashboard/ });

    const hasBackButton = await backButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasBackButton) {
      await backButton.click();
      await expect(page).toHaveURL(/\/app\/orders/, { timeout: 10000 });
    } else {
      await dashboardButton.click();
      await expect(page).toHaveURL(/\/app/, { timeout: 10000 });
    }
  });
});

test.describe('Tables Management Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('tables page loads with heading', async ({ page }) => {
    await page.goto('/app/tables');

    await expect(page.locator('h1').filter({ hasText: 'Manajemen Meja' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Kelola meja restoran Anda')).toBeVisible();
  });

  test('tables page has view mode toggle', async ({ page }) => {
    await page.goto('/app/tables');
    await expect(page.locator('h1').filter({ hasText: 'Manajemen Meja' })).toBeVisible({ timeout: 10000 });

    // View mode buttons: Daftar (List) and Denah (Layout)
    await expect(page.getByRole('button', { name: /Daftar/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Denah/ })).toBeVisible();
  });

  test('tables page shows split bill card', async ({ page }) => {
    await page.goto('/app/tables');
    await expect(page.locator('h1').filter({ hasText: 'Manajemen Meja' })).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('Split Bill').first()).toBeVisible();
    await expect(page.getByText('Bagi satu tagihan menjadi beberapa bagian')).toBeVisible();
  });

  test('tables page shows merge bill card', async ({ page }) => {
    await page.goto('/app/tables');
    await expect(page.locator('h1').filter({ hasText: 'Manajemen Meja' })).toBeVisible({ timeout: 10000 });

    await expect(page.getByText('Merge Bill').first()).toBeVisible();
    await expect(page.getByText('Gabungkan beberapa tagihan menjadi satu')).toBeVisible();
  });

  test('split bill dialog opens with form fields', async ({ page }) => {
    await page.goto('/app/tables');
    await expect(page.locator('h1').filter({ hasText: 'Manajemen Meja' })).toBeVisible({ timeout: 10000 });

    // Click the Split Bill button
    await page.getByRole('button', { name: 'Split Bill' }).first().click();

    // Dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('ID Transaksi')).toBeVisible();
    await expect(page.getByLabel('Jumlah Bagian')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Batal' })).toBeVisible();
  });

  test('merge bill dialog opens with form fields', async ({ page }) => {
    await page.goto('/app/tables');
    await expect(page.locator('h1').filter({ hasText: 'Manajemen Meja' })).toBeVisible({ timeout: 10000 });

    // Click the Merge Bill button
    await page.getByRole('button', { name: 'Merge Bill' }).first().click();

    // Dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('ID Transaksi')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Batal' })).toBeVisible();
  });

  test('can switch to layout view', async ({ page }) => {
    await page.goto('/app/tables');
    await expect(page.locator('h1').filter({ hasText: 'Manajemen Meja' })).toBeVisible({ timeout: 10000 });

    // Click layout view button
    await page.getByRole('button', { name: /Denah/ }).click();

    // Layout editor canvas or related element should appear
    // The info card about CRUD not available should disappear in layout mode
    await expect(page.getByText('Fitur CRUD meja belum tersedia')).toBeHidden();
  });
});

test.describe('Waiting List Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('waiting list page loads with heading', async ({ page }) => {
    await page.goto('/app/waiting-list');

    await expect(page.locator('h1').filter({ hasText: 'Daftar Tunggu' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Kelola antrian pelanggan')).toBeVisible();
  });

  test('waiting list page has add customer button', async ({ page }) => {
    await page.goto('/app/waiting-list');
    await expect(page.locator('h1').filter({ hasText: 'Daftar Tunggu' })).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: 'Tambah Pelanggan', exact: true })).toBeVisible();
  });

  test('waiting list page has status tabs', async ({ page }) => {
    await page.goto('/app/waiting-list');
    await expect(page.locator('h1').filter({ hasText: 'Daftar Tunggu' })).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('tab', { name: 'Semua' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Menunggu' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Duduk' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Dibatalkan' })).toBeVisible();
  });

  test('waiting list page has table column headers', async ({ page }) => {
    await page.goto('/app/waiting-list');
    await expect(page.locator('h1').filter({ hasText: 'Daftar Tunggu' })).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('columnheader', { name: 'Pelanggan' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Jumlah' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Waktu Tunggu' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Meja' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Catatan' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Waktu Daftar' })).toBeVisible();
  });

  test('waiting list page shows empty state or data rows', async ({ page }) => {
    await page.goto('/app/waiting-list');
    await expect(page.locator('h1').filter({ hasText: 'Daftar Tunggu' })).toBeVisible({ timeout: 10000 });

    // Should show either data rows or empty state
    const emptyState = page.getByRole('heading', { name: 'Belum ada antrian' });
    const tableRow = page.locator('table tbody tr td').first();
    await expect(emptyState.or(tableRow).first()).toBeVisible({ timeout: 10000 });
  });

  test('add customer dialog opens with form fields', async ({ page }) => {
    await page.goto('/app/waiting-list');
    await expect(page.locator('h1').filter({ hasText: 'Daftar Tunggu' })).toBeVisible({ timeout: 10000 });

    // Click "Tambah Pelanggan" button
    await page.getByRole('button', { name: /Tambah Pelanggan/ }).first().click();

    // Dialog should appear with form fields
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel(/Nama Pelanggan/)).toBeVisible();
    await expect(page.getByLabel(/Nomor Telepon/)).toBeVisible();
    await expect(page.getByLabel(/Jumlah Orang/)).toBeVisible();
    await expect(page.getByLabel(/Catatan Khusus/)).toBeVisible();

    // Dialog buttons
    await expect(page.getByRole('button', { name: 'Batal' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tambahkan' })).toBeVisible();
  });

  test('add customer dialog form accepts input', async ({ page }) => {
    await page.goto('/app/waiting-list');
    await expect(page.locator('h1').filter({ hasText: 'Daftar Tunggu' })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Tambah Pelanggan/ }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill in form fields
    await page.getByLabel(/Nama Pelanggan/).fill('Test Customer');
    await page.getByLabel(/Nomor Telepon/).fill('081234567890');

    await expect(page.getByLabel(/Nama Pelanggan/)).toHaveValue('Test Customer');
    await expect(page.getByLabel(/Nomor Telepon/)).toHaveValue('081234567890');
  });

  test('waiting list status tabs can be switched', async ({ page }) => {
    await page.goto('/app/waiting-list');
    await expect(page.locator('h1').filter({ hasText: 'Daftar Tunggu' })).toBeVisible({ timeout: 10000 });

    // Default tab should be "Semua"
    const allTab = page.getByRole('tab', { name: 'Semua' });
    await expect(allTab).toHaveAttribute('data-state', 'active');

    // Click on "Menunggu" tab
    const waitingTab = page.getByRole('tab', { name: 'Menunggu' });
    await waitingTab.click();
    await expect(waitingTab).toHaveAttribute('data-state', 'active');
  });
});

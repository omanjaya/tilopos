import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks } from './fixtures/api-mocks';

test.describe('Transactions & Shifts Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  // ===========================================================================
  // 1. Transactions List Page
  // ===========================================================================
  test.describe('Transactions List Page', () => {
    test('transactions page loads with correct heading', async ({ page }) => {
      await page.goto('/app/transactions');

      await expect(
        page.locator('h1').filter({ hasText: 'Riwayat Transaksi' }),
      ).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Lihat semua transaksi')).toBeVisible();
    });

    test('transactions table has expected columns', async ({ page }) => {
      await page.goto('/app/transactions');
      await expect(
        page.locator('h1').filter({ hasText: 'Riwayat Transaksi' }),
      ).toBeVisible({ timeout: 10000 });

      await expect(page.getByRole('columnheader', { name: 'No. Transaksi' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Tanggal' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Kasir' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Total' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Metode Bayar' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    });

    test('transactions list shows data rows or empty state', async ({ page }) => {
      await page.goto('/app/transactions');
      await expect(
        page.locator('h1').filter({ hasText: 'Riwayat Transaksi' }),
      ).toBeVisible({ timeout: 10000 });

      const emptyState = page.getByRole('heading', { name: 'Belum ada transaksi' });
      const tableRow = page.locator('table tbody tr td').first();
      await expect(emptyState.or(tableRow).first()).toBeVisible({ timeout: 10000 });
    });

    test('has search functionality', async ({ page }) => {
      await page.goto('/app/transactions');
      await expect(
        page.locator('h1').filter({ hasText: 'Riwayat Transaksi' }),
      ).toBeVisible({ timeout: 10000 });

      const searchInput = page.getByPlaceholder('Cari no. transaksi atau nama pelanggan...');
      await expect(searchInput).toBeVisible();

      await searchInput.fill('TXN-001');
      await expect(searchInput).toHaveValue('TXN-001');
    });

    test('has action menu button per row when data exists', async ({ page }) => {
      await page.goto('/app/transactions');
      await expect(
        page.locator('h1').filter({ hasText: 'Riwayat Transaksi' }),
      ).toBeVisible({ timeout: 10000 });

      // Check for action button (MoreHorizontal icon button) - only if rows exist
      const tableRow = page.locator('table tbody tr').first();
      const emptyState = page.getByRole('heading', { name: 'Belum ada transaksi' });

      const hasRows = await tableRow.isVisible().catch(() => false);
      const hasEmpty = await emptyState.isVisible().catch(() => false);

      if (hasRows && !hasEmpty) {
        const actionButton = page.getByRole('button', { name: /Aksi transaksi/i }).first();
        await expect(actionButton).toBeVisible();
      }
    });
  });

  // ===========================================================================
  // 2. Transaction Filtering
  // ===========================================================================
  test.describe('Transaction Filtering', () => {
    test('status filter dropdown exists with options', async ({ page }) => {
      await page.goto('/app/transactions');
      await expect(
        page.locator('h1').filter({ hasText: 'Riwayat Transaksi' }),
      ).toBeVisible({ timeout: 10000 });

      const statusTrigger = page.locator('button[role="combobox"]').first();
      await expect(statusTrigger).toBeVisible();

      await statusTrigger.click();
      await expect(page.getByRole('option', { name: 'Semua Status' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Selesai' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Void' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Refund', exact: true })).toBeVisible();
    });

    test('date range filters exist and accept values', async ({ page }) => {
      await page.goto('/app/transactions');
      await expect(
        page.locator('h1').filter({ hasText: 'Riwayat Transaksi' }),
      ).toBeVisible({ timeout: 10000 });

      const dateInputs = page.locator('input[type="date"]');
      const count = await dateInputs.count();
      expect(count).toBeGreaterThanOrEqual(2);

      const startDateInput = dateInputs.first();
      const endDateInput = dateInputs.last();

      await startDateInput.fill('2026-02-01');
      await endDateInput.fill('2026-02-07');

      await expect(startDateInput).toHaveValue('2026-02-01');
      await expect(endDateInput).toHaveValue('2026-02-07');
    });
  });

  // ===========================================================================
  // 3. Shift Management Page
  // ===========================================================================
  test.describe('Shift Management Page', () => {
    test('shifts page loads with correct heading', async ({ page }) => {
      await page.goto('/app/shifts');

      await expect(
        page.locator('h1').filter({ hasText: 'Manajemen Shift' }),
      ).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Kelola shift karyawan')).toBeVisible();
    });

    test('shifts page shows shift history section', async ({ page }) => {
      await page.goto('/app/shifts');
      await expect(
        page.locator('h1').filter({ hasText: 'Manajemen Shift' }),
      ).toBeVisible({ timeout: 10000 });

      await expect(page.getByRole('heading', { name: 'Riwayat Shift', exact: true })).toBeVisible();
    });

    test('shift history table has expected columns', async ({ page }) => {
      await page.goto('/app/shifts');
      await expect(
        page.locator('h1').filter({ hasText: 'Manajemen Shift' }),
      ).toBeVisible({ timeout: 10000 });

      await expect(page.getByRole('columnheader', { name: 'Tanggal' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Outlet' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Kas Awal' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Kas Akhir' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Selisih' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Total Penjualan' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Transaksi' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Durasi' })).toBeVisible();
    });

    test('shifts page shows start shift button or active shift section', async ({ page }) => {
      await page.goto('/app/shifts');
      await expect(
        page.locator('h1').filter({ hasText: 'Manajemen Shift' }),
      ).toBeVisible({ timeout: 10000 });

      // Either "Mulai Shift" button (no active shift) or "Shift Aktif" section visible
      const startButton = page.getByRole('button', { name: /Mulai Shift/i });
      const activeShiftHeading = page.getByText('Shift Aktif');

      await expect(startButton.or(activeShiftHeading).first()).toBeVisible({ timeout: 10000 });
    });

    test('start shift button opens dialog when no active shift', async ({ page }) => {
      await page.goto('/app/shifts');
      await expect(
        page.locator('h1').filter({ hasText: 'Manajemen Shift' }),
      ).toBeVisible({ timeout: 10000 });

      const startButton = page.getByRole('button', { name: /Mulai Shift/i });
      if (await startButton.isVisible().catch(() => false)) {
        await startButton.click();

        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText('Mulai Shift Baru')).toBeVisible();
        await expect(page.getByLabel(/Kas Awal/i)).toBeVisible();
      }
    });

    test('active shift shows metrics when shift is active', async ({ page }) => {
      await page.goto('/app/shifts');
      await expect(
        page.locator('h1').filter({ hasText: 'Manajemen Shift' }),
      ).toBeVisible({ timeout: 10000 });

      const activeShiftHeading = page.getByText('Shift Aktif');
      if (await activeShiftHeading.isVisible().catch(() => false)) {
        // Metric labels from MetricCard components
        await expect(page.getByText('Kas Awal').first()).toBeVisible();
        await expect(page.getByText('Total Penjualan').first()).toBeVisible();
        await expect(page.getByText('Transaksi').first()).toBeVisible();
        await expect(page.getByText('Durasi').first()).toBeVisible();
      }
    });

    test('shift history shows empty state or data rows', async ({ page }) => {
      await page.goto('/app/shifts');
      await expect(
        page.locator('h1').filter({ hasText: 'Manajemen Shift' }),
      ).toBeVisible({ timeout: 10000 });

      const emptyState = page.getByRole('heading', { name: 'Belum ada riwayat shift' });
      const tableRow = page.locator('table tbody tr td').first();
      await expect(emptyState.or(tableRow).first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ===========================================================================
  // 4. Settlements Page
  // ===========================================================================
  test.describe('Settlements Page', () => {
    test('settlements page loads with correct heading', async ({ page }) => {
      await page.goto('/app/settlements');

      await expect(
        page.locator('h1').filter({ hasText: 'Penyelesaian' }),
      ).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Rekonsiliasi pembayaran dan setoran bank')).toBeVisible();
    });

    test('settlements page shows metric cards', async ({ page }) => {
      await page.goto('/app/settlements');
      await expect(
        page.locator('h1').filter({ hasText: 'Penyelesaian' }),
      ).toBeVisible({ timeout: 10000 });

      await expect(page.getByText('Total Diselesaikan')).toBeVisible();
      await expect(page.getByText('Menunggu Penyelesaian')).toBeVisible();
      await expect(page.getByText('Dipersengketakan')).toBeVisible();
    });

    test('settlements table has expected columns', async ({ page }) => {
      await page.goto('/app/settlements');
      await expect(
        page.locator('h1').filter({ hasText: 'Penyelesaian' }),
      ).toBeVisible({ timeout: 10000 });

      await expect(page.getByRole('columnheader', { name: 'Tanggal' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Outlet' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Total Penjualan' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Tunai', exact: true })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Non-Tunai' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    });

    test('settlements list shows data rows or empty state', async ({ page }) => {
      await page.goto('/app/settlements');
      await expect(
        page.locator('h1').filter({ hasText: 'Penyelesaian' }),
      ).toBeVisible({ timeout: 10000 });

      const emptyState = page.getByRole('heading', { name: 'Belum ada penyelesaian' });
      const tableRow = page.locator('table tbody tr td').first();
      await expect(emptyState.or(tableRow).first()).toBeVisible({ timeout: 10000 });
    });

    test('settlements status filter dropdown exists with options', async ({ page }) => {
      await page.goto('/app/settlements');
      await expect(
        page.locator('h1').filter({ hasText: 'Penyelesaian' }),
      ).toBeVisible({ timeout: 10000 });

      const statusTrigger = page.locator('button[role="combobox"]').first();
      await expect(statusTrigger).toBeVisible();

      await statusTrigger.click();
      await expect(page.getByRole('option', { name: 'Semua Status' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Tertunda' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Selesai' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Dipersengketakan' })).toBeVisible();
    });

    test('settlements date range filters exist', async ({ page }) => {
      await page.goto('/app/settlements');
      await expect(
        page.locator('h1').filter({ hasText: 'Penyelesaian' }),
      ).toBeVisible({ timeout: 10000 });

      const dateInputs = page.locator('input[type="date"]');
      const count = await dateInputs.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });
});

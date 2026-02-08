import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks } from './fixtures/api-mocks';

test.describe('Promotions and Loyalty', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  // ---------------------------------------------------------------------------
  // Promotions List Page
  // ---------------------------------------------------------------------------

  test.describe('Promotions List Page', () => {
    test('page loads with correct heading', async ({ page }) => {
      await page.goto('/app/promotions');

      await expect(
        page.getByRole('heading', { name: /Promosi/ })
      ).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Kelola promosi dan diskon')).toBeVisible();
    });

    test('table has expected column headers', async ({ page }) => {
      await page.goto('/app/promotions');
      await expect(
        page.getByRole('heading', { name: /Promosi/ })
      ).toBeVisible({ timeout: 10000 });

      await expect(page.getByRole('columnheader', { name: 'Nama' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Tipe Diskon' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Nilai Diskon' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Berlaku' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Penggunaan' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    });

    test('shows data rows or empty state', async ({ page }) => {
      await page.goto('/app/promotions');
      await expect(
        page.getByRole('heading', { name: /Promosi/ })
      ).toBeVisible({ timeout: 10000 });

      const emptyState = page.getByText('Belum ada promosi');
      const tableRow = page.locator('table tbody tr td').first();
      await expect(emptyState.or(tableRow).first()).toBeVisible({ timeout: 10000 });
    });

    test('add promotion button is visible', async ({ page }) => {
      await page.goto('/app/promotions');
      await expect(
        page.getByRole('heading', { name: /Promosi/ })
      ).toBeVisible({ timeout: 10000 });

      await expect(
        page.getByRole('button', { name: /Tambah Promosi/ })
      ).toBeVisible();
    });

    test('search input is present and functional', async ({ page }) => {
      await page.goto('/app/promotions');
      await expect(
        page.getByRole('heading', { name: /Promosi/ })
      ).toBeVisible({ timeout: 10000 });

      const searchInput = page.getByPlaceholder('Cari promosi...');
      await expect(searchInput).toBeVisible();

      await searchInput.fill('test');
      await expect(searchInput).toHaveValue('test');
    });
  });

  // ---------------------------------------------------------------------------
  // Create Promotion Form
  // ---------------------------------------------------------------------------

  test.describe('Create Promotion Form', () => {
    test('navigate to create form via button', async ({ page }) => {
      await page.goto('/app/promotions');
      await expect(
        page.getByRole('heading', { name: /Promosi/ })
      ).toBeVisible({ timeout: 10000 });

      await page.getByRole('button', { name: /Tambah Promosi/ }).click();
      await expect(page).toHaveURL(/\/app\/promotions\/new/);
      await expect(
        page.getByRole('heading', { name: /Tambah Promosi/ })
      ).toBeVisible({ timeout: 10000 });
    });

    test('form page loads with correct heading', async ({ page }) => {
      await page.goto('/app/promotions/new');

      await expect(
        page.getByRole('heading', { name: /Tambah Promosi/ })
      ).toBeVisible({ timeout: 10000 });
    });

    test('form has all required fields', async ({ page }) => {
      await page.goto('/app/promotions/new');
      await expect(
        page.getByRole('heading', { name: /Tambah Promosi/ })
      ).toBeVisible({ timeout: 10000 });

      await expect(page.getByLabel('Nama Promosi')).toBeVisible();
      await expect(page.getByLabel('Deskripsi')).toBeVisible();
      await expect(page.getByText('Tipe Diskon')).toBeVisible();
      await expect(page.getByLabel(/Nilai Diskon/)).toBeVisible();
      await expect(page.getByLabel('Berlaku Dari')).toBeVisible();
      await expect(page.getByLabel('Berlaku Sampai')).toBeVisible();
      await expect(page.getByLabel(/Minimum Pembelian/)).toBeVisible();
      await expect(page.getByLabel('Batas Penggunaan')).toBeVisible();
    });

    test('form has submit and cancel buttons', async ({ page }) => {
      await page.goto('/app/promotions/new');
      await expect(
        page.getByRole('heading', { name: /Tambah Promosi/ })
      ).toBeVisible({ timeout: 10000 });

      await expect(page.getByRole('button', { name: 'Buat Promosi' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Batal' })).toBeVisible();
    });

    test('form has back button', async ({ page }) => {
      await page.goto('/app/promotions/new');
      await expect(
        page.getByRole('heading', { name: /Tambah Promosi/ })
      ).toBeVisible({ timeout: 10000 });

      await expect(
        page.getByRole('button', { name: /Kembali/ })
      ).toBeVisible();
    });

    test('form fields accept input', async ({ page }) => {
      await page.goto('/app/promotions/new');
      await expect(
        page.getByRole('heading', { name: /Tambah Promosi/ })
      ).toBeVisible({ timeout: 10000 });

      const nameInput = page.getByLabel('Nama Promosi');
      await nameInput.fill('Test Promotion');
      await expect(nameInput).toHaveValue('Test Promotion');

      const validFromInput = page.getByLabel('Berlaku Dari');
      await validFromInput.fill('2026-03-01');
      await expect(validFromInput).toHaveValue('2026-03-01');

      const validUntilInput = page.getByLabel('Berlaku Sampai');
      await validUntilInput.fill('2026-03-31');
      await expect(validUntilInput).toHaveValue('2026-03-31');

      const usageLimitInput = page.getByLabel('Batas Penggunaan');
      await usageLimitInput.fill('500');
      await expect(usageLimitInput).toHaveValue('500');
    });
  });

  // ---------------------------------------------------------------------------
  // Form Navigation
  // ---------------------------------------------------------------------------

  test.describe('Form Navigation', () => {
    test('back button returns to promotions list', async ({ page }) => {
      await page.goto('/app/promotions/new');
      await expect(
        page.getByRole('heading', { name: /Tambah Promosi/ })
      ).toBeVisible({ timeout: 10000 });

      await page.getByRole('button', { name: /Kembali/ }).click();
      await expect(page).toHaveURL(/\/app\/promotions$/, { timeout: 5000 });
    });

    test('cancel button returns to promotions list', async ({ page }) => {
      await page.goto('/app/promotions/new');
      await expect(
        page.getByRole('heading', { name: /Tambah Promosi/ })
      ).toBeVisible({ timeout: 10000 });

      await page.getByRole('button', { name: 'Batal' }).click();
      await expect(page).toHaveURL(/\/app\/promotions$/, { timeout: 5000 });
    });
  });

  // ---------------------------------------------------------------------------
  // Voucher Generator Page
  // ---------------------------------------------------------------------------

  test.describe('Voucher Generator Page', () => {
    test('page loads with correct heading', async ({ page }) => {
      await page.goto('/app/promotions/vouchers');

      await expect(
        page.getByRole('heading', { name: /Generator Voucher/ })
      ).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Buat dan kelola kode voucher')).toBeVisible();
    });

    test('generator form has all required fields', async ({ page }) => {
      await page.goto('/app/promotions/vouchers');
      await expect(
        page.getByRole('heading', { name: /Generator Voucher/ })
      ).toBeVisible({ timeout: 10000 });

      await expect(page.getByLabel('Prefix Kode')).toBeVisible();
      await expect(page.getByLabel('Jumlah Voucher')).toBeVisible();
      await expect(page.locator('form').getByText('Tipe Diskon')).toBeVisible();
      await expect(page.getByLabel(/Nilai Diskon/)).toBeVisible();
      await expect(page.getByLabel('Berlaku Dari')).toBeVisible();
      await expect(page.getByLabel('Berlaku Sampai')).toBeVisible();
      await expect(page.getByLabel('Batas Penggunaan per Voucher')).toBeVisible();
    });

    test('generate button is visible', async ({ page }) => {
      await page.goto('/app/promotions/vouchers');
      await expect(
        page.getByRole('heading', { name: /Generator Voucher/ })
      ).toBeVisible({ timeout: 10000 });

      await expect(
        page.getByRole('button', { name: /Buat Voucher/ })
      ).toBeVisible();
    });

    test('export CSV button is visible', async ({ page }) => {
      await page.goto('/app/promotions/vouchers');
      await expect(
        page.getByRole('heading', { name: /Generator Voucher/ })
      ).toBeVisible({ timeout: 10000 });

      await expect(
        page.getByRole('button', { name: /Ekspor CSV/ })
      ).toBeVisible();
    });

    test('voucher table has expected column headers', async ({ page }) => {
      await page.goto('/app/promotions/vouchers');
      await expect(
        page.getByRole('heading', { name: /Generator Voucher/ })
      ).toBeVisible({ timeout: 10000 });

      await expect(page.getByRole('columnheader', { name: 'Kode Voucher' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Tipe Diskon' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Nilai Diskon' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Masa Berlaku' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Penggunaan' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Dibuat' })).toBeVisible();
    });

    test('voucher search input is present and functional', async ({ page }) => {
      await page.goto('/app/promotions/vouchers');
      await expect(
        page.getByRole('heading', { name: /Generator Voucher/ })
      ).toBeVisible({ timeout: 10000 });

      const searchInput = page.getByPlaceholder('Cari kode voucher...');
      await expect(searchInput).toBeVisible();

      await searchInput.fill('TEST');
      await expect(searchInput).toHaveValue('TEST');
    });

    test('shows voucher data or empty state', async ({ page }) => {
      await page.goto('/app/promotions/vouchers');
      await expect(
        page.getByRole('heading', { name: /Generator Voucher/ })
      ).toBeVisible({ timeout: 10000 });

      const emptyState = page.getByText('Belum ada voucher');
      const tableRow = page.locator('table tbody tr td').first();
      await expect(emptyState.or(tableRow).first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ---------------------------------------------------------------------------
  // Loyalty Program Page
  // ---------------------------------------------------------------------------

  test.describe('Loyalty Program Page', () => {
    test('page loads with correct heading', async ({ page }) => {
      await page.goto('/app/loyalty');

      await expect(
        page.getByRole('heading', { name: /Program Loyalti/ })
      ).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Kelola program loyalti pelanggan')).toBeVisible();
    });

    test('shows program data or empty state with create button', async ({ page }) => {
      await page.goto('/app/loyalty');
      await expect(
        page.getByRole('heading', { name: /Program Loyalti/ })
      ).toBeVisible({ timeout: 10000 });

      // Either we see the program metrics or the empty state
      const emptyState = page.getByText('Belum ada program loyalti');
      const programMetric = page.getByText('Nama Program');
      await expect(emptyState.or(programMetric).first()).toBeVisible({ timeout: 10000 });
    });

    test('create program button visible when no program exists', async ({ page }) => {
      await page.goto('/app/loyalty');
      await expect(
        page.getByRole('heading', { name: /Program Loyalti/ })
      ).toBeVisible({ timeout: 10000 });

      // If empty state is shown, the create button should be visible
      const emptyState = page.getByText('Belum ada program loyalti');
      const createButton = page.getByRole('button', { name: /Buat Program/ });
      const programMetric = page.getByText('Nama Program');

      // Either we have program data displayed, or empty state with create button
      await expect(programMetric.or(emptyState).first()).toBeVisible({ timeout: 10000 });

      if (await emptyState.isVisible()) {
        await expect(createButton.first()).toBeVisible();
      }
    });

    test('loyalty tier table has expected columns when program exists', async ({ page }) => {
      await page.goto('/app/loyalty');
      await expect(
        page.getByRole('heading', { name: /Program Loyalti/ })
      ).toBeVisible({ timeout: 10000 });

      // Only check tier table if program data is present
      const programMetric = page.getByText('Nama Program');
      const emptyState = page.getByText('Belum ada program loyalti');
      await expect(programMetric.or(emptyState).first()).toBeVisible({ timeout: 10000 });

      if (await programMetric.isVisible()) {
        await expect(page.getByText('Tier Loyalti')).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Nama Tier' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Min Poin' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Multiplier' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Benefits' })).toBeVisible();
      }
    });

    test('metric cards shown when program exists', async ({ page }) => {
      await page.goto('/app/loyalty');
      await expect(
        page.getByRole('heading', { name: /Program Loyalti/ })
      ).toBeVisible({ timeout: 10000 });

      const programMetric = page.getByText('Nama Program');
      const emptyState = page.getByText('Belum ada program loyalti');
      await expect(programMetric.or(emptyState).first()).toBeVisible({ timeout: 10000 });

      if (await programMetric.isVisible()) {
        await expect(page.getByText('Jumlah per Poin')).toBeVisible();
        await expect(page.getByText('Nilai Tukar')).toBeVisible();
        await expect(page.getByText('Masa Berlaku Poin')).toBeVisible();
      }
    });
  });
});

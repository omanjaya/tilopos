import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks } from './fixtures/api-mocks';

test.describe('Customers Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test.describe('Customer List Page', () => {
    test('customers page loads with structure', async ({ page }) => {
      await page.goto('/app/customers');

      // Page title
      await expect(page.getByRole('heading', { level: 1, name: 'Pelanggan' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Kelola data pelanggan Anda')).toBeVisible();
    });

    test('customer table has correct columns', async ({ page }) => {
      await page.goto('/app/customers');
      await expect(page.getByRole('heading', { level: 1, name: 'Pelanggan' })).toBeVisible({ timeout: 10000 });

      // Table column headers
      await expect(page.getByRole('columnheader', { name: 'Nama' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Telepon' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    });

    test('shows customer data or empty state', async ({ page }) => {
      await page.goto('/app/customers');
      await expect(page.getByRole('heading', { level: 1, name: 'Pelanggan' })).toBeVisible({ timeout: 10000 });

      // Should show either customer data rows or empty state
      const dataRow = page.locator('table tbody tr td').first();
      const emptyState = page.getByText(/Belum ada pelanggan/);
      await expect(dataRow.or(emptyState)).toBeVisible({ timeout: 10000 });
    });

    test('has search functionality', async ({ page }) => {
      await page.goto('/app/customers');
      await expect(page.getByRole('heading', { level: 1, name: 'Pelanggan' })).toBeVisible({ timeout: 10000 });

      const searchInput = page.getByPlaceholder(/Cari pelanggan/i);
      await expect(searchInput).toBeVisible();

      // Type a search query
      await searchInput.fill('Test');
      await expect(searchInput).toHaveValue('Test');
    });

    test('shows add customer button', async ({ page }) => {
      await page.goto('/app/customers');
      await expect(page.getByRole('heading', { level: 1, name: 'Pelanggan' })).toBeVisible({ timeout: 10000 });

      const addButton = page.getByRole('button', { name: /Tambah Pelanggan/i });
      await expect(addButton).toBeVisible();
      await expect(addButton).toBeEnabled();
    });

    test('displays status badges', async ({ page }) => {
      await page.goto('/app/customers');
      await expect(page.getByRole('heading', { level: 1, name: 'Pelanggan' })).toBeVisible({ timeout: 10000 });

      // Should show Aktif badge for active customers (from seed data)
      await expect(page.getByText('Aktif').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Add New Customer', () => {
    test('navigates to add customer page', async ({ page }) => {
      await page.goto('/app/customers');
      await expect(page.getByRole('heading', { level: 1, name: 'Pelanggan' })).toBeVisible({ timeout: 10000 });

      await page.getByRole('button', { name: /Tambah Pelanggan/i }).click();
      await expect(page).toHaveURL(/\/app\/customers\/new/);
      await expect(page.getByRole('heading', { level: 1, name: 'Tambah Pelanggan' })).toBeVisible();
    });

    test('customer form has required fields', async ({ page }) => {
      await page.goto('/app/customers/new');
      await expect(page.getByRole('heading', { level: 1, name: 'Tambah Pelanggan' })).toBeVisible({ timeout: 10000 });

      await expect(page.getByLabel(/Nama Pelanggan/i)).toBeVisible();
      await expect(page.getByLabel(/Email/i)).toBeVisible();
      await expect(page.getByLabel(/Telepon/i)).toBeVisible();
    });

    test('customer form accepts input', async ({ page }) => {
      await page.goto('/app/customers/new');
      await expect(page.getByRole('heading', { level: 1, name: 'Tambah Pelanggan' })).toBeVisible({ timeout: 10000 });

      await page.getByLabel(/Nama Pelanggan/i).fill('Dewi Lestari');
      await page.getByLabel(/Telepon/i).fill('089876543210');
      await page.getByLabel(/Email/i).fill('dewi@test.com');

      await expect(page.getByLabel(/Nama Pelanggan/i)).toHaveValue('Dewi Lestari');
      await expect(page.getByLabel(/Telepon/i)).toHaveValue('089876543210');
      await expect(page.getByLabel(/Email/i)).toHaveValue('dewi@test.com');
    });

    test('has back button to return to list', async ({ page }) => {
      await page.goto('/app/customers/new');
      await expect(page.getByRole('heading', { level: 1, name: 'Tambah Pelanggan' })).toBeVisible({ timeout: 10000 });

      const backButton = page.getByRole('button', { name: /Kembali/i });
      await expect(backButton).toBeVisible();
      await backButton.click();

      await expect(page).toHaveURL(/\/app\/customers$/);
    });

    test('has submit button', async ({ page }) => {
      await page.goto('/app/customers/new');
      await expect(page.getByRole('heading', { level: 1, name: 'Tambah Pelanggan' })).toBeVisible({ timeout: 10000 });

      const submitButton = page.getByRole('button', { name: /Tambah Pelanggan/i });
      await expect(submitButton).toBeVisible();
    });
  });

  test.describe('Customer Segments', () => {
    test('segments page loads', async ({ page }) => {
      await page.goto('/app/customers/segments');

      // Page title
      await expect(page.getByRole('heading', { level: 1, name: 'Segmen Pelanggan' })).toBeVisible({ timeout: 10000 });
    });

    test('can open create segment dialog', async ({ page }) => {
      await page.goto('/app/customers/segments');
      await expect(page.getByRole('heading', { level: 1, name: 'Segmen Pelanggan' })).toBeVisible({ timeout: 10000 });

      const addButton = page.getByRole('button', { name: /Buat Segmen/i });
      await addButton.click();

      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Buat Segmen Baru')).toBeVisible();
      await expect(page.getByLabel(/Nama Segmen/i)).toBeVisible();
    });
  });

  test.describe('Customer Table Actions', () => {
    test('table rows have action buttons', async ({ page }) => {
      await page.goto('/app/customers');
      await expect(page.getByRole('heading', { level: 1, name: 'Pelanggan' })).toBeVisible({ timeout: 10000 });

      // Wait for data to load, then check for action buttons
      const dataRow = page.locator('table tbody tr').first();
      await expect(dataRow).toBeVisible({ timeout: 10000 });

      // Each row should have an actions menu button (three dots)
      const actionsButton = dataRow.getByRole('button').last();
      await expect(actionsButton).toBeVisible();
    });

    test('help button is available', async ({ page }) => {
      await page.goto('/app/customers');
      await expect(page.getByRole('heading', { level: 1, name: 'Pelanggan' })).toBeVisible({ timeout: 10000 });

      await expect(page.getByRole('button', { name: /Help/i })).toBeVisible();
    });
  });

  test.describe('Customer Integration with POS', () => {
    test('POS page loads successfully', async ({ page }) => {
      await page.goto('/pos');

      await expect(page.locator('h1').filter({ hasText: 'POS Terminal' })).toBeVisible({ timeout: 10000 });
    });
  });
});

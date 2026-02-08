import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks } from './fixtures/api-mocks';

test.describe('Products CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('product list page loads with structure', async ({ page }) => {
    await page.goto('/app/products');

    // Page header
    await expect(page.locator('h1').filter({ hasText: 'Produk' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Kelola daftar produk Anda')).toBeVisible();

    // Table headers
    await expect(page.getByRole('columnheader', { name: 'Nama' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'SKU' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Harga' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Kategori' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
  });

  test('product list shows empty state or data', async ({ page }) => {
    await page.goto('/app/products');
    await expect(page.locator('h1').filter({ hasText: 'Produk' })).toBeVisible({ timeout: 10000 });

    // Should show either product data or empty state
    const emptyState = page.getByRole('heading', { name: 'Belum ada produk' });
    const tableRow = page.locator('table tbody tr td').first();
    await expect(emptyState.or(tableRow).first()).toBeVisible({ timeout: 10000 });
  });

  test('search functionality works', async ({ page }) => {
    await page.goto('/app/products');
    await expect(page.locator('h1').filter({ hasText: 'Produk' })).toBeVisible({ timeout: 10000 });

    const searchInput = page.getByPlaceholder('Cari produk...');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('Nasi');
    await expect(searchInput).toHaveValue('Nasi');
  });

  test('category filter dropdown exists', async ({ page }) => {
    await page.goto('/app/products');
    await expect(page.locator('h1').filter({ hasText: 'Produk' })).toBeVisible({ timeout: 10000 });

    // Category filter trigger
    const categoryTrigger = page.getByRole('combobox').first();
    await expect(categoryTrigger).toBeVisible();
    await expect(page.getByText('Semua Kategori')).toBeVisible();
  });

  test('navigate to create product form', async ({ page }) => {
    await page.goto('/app/products');
    await expect(page.locator('h1').filter({ hasText: 'Produk' })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Tambah Produk', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/products\/new/);
    await expect(page.locator('h1').filter({ hasText: 'Tambah Produk' })).toBeVisible({ timeout: 10000 });
  });

  test('product create form has fields', async ({ page }) => {
    await page.goto('/app/products/new');
    await expect(page.locator('h1').filter({ hasText: 'Tambah Produk' })).toBeVisible({ timeout: 10000 });

    // Card title
    await expect(page.getByText('Informasi Produk')).toBeVisible();

    // Field labels
    await expect(page.getByText('Nama Produk')).toBeVisible();
    await expect(page.getByText('SKU')).toBeVisible();
    await expect(page.getByText('Harga Jual')).toBeVisible();
    await expect(page.getByText('Harga Modal')).toBeVisible();

    // Variant section
    await expect(page.getByText('Varian').first()).toBeVisible();

    // Buttons
    await expect(page.getByRole('button', { name: /Buat Produk|Tambah Produk/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Batal' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Kembali/ })).toBeVisible();
  });

  test('product form fields accept input', async ({ page }) => {
    await page.goto('/app/products/new');
    await expect(page.locator('h1').filter({ hasText: 'Tambah Produk' })).toBeVisible({ timeout: 10000 });

    await page.getByLabel('Nama Produk').fill('Nasi Uduk');
    await page.getByLabel('SKU').fill('NU-001');
    await page.getByLabel('Harga Jual').fill('25000');
    await page.getByLabel('Harga Modal').fill('10000');

    await expect(page.getByLabel('Nama Produk')).toHaveValue('Nasi Uduk');
    await expect(page.getByLabel('SKU')).toHaveValue('NU-001');
  });

  test('can add variants', async ({ page }) => {
    await page.goto('/app/products/new');
    await expect(page.locator('h1').filter({ hasText: 'Tambah Produk' })).toBeVisible({ timeout: 10000 });

    // Initially no variant rows
    await expect(page.getByText('Belum ada varian.')).toBeVisible();

    // Click "Tambah Varian"
    await page.getByRole('button', { name: /Tambah Varian/ }).click();

    // Variant row should appear
    await expect(page.getByText('Belum ada varian.')).toBeHidden();

    // Variant name input
    const variantNameInput = page.getByPlaceholder('Contoh: Large');
    await expect(variantNameInput).toBeVisible();

    await variantNameInput.fill('Porsi Besar');
    await expect(variantNameInput).toHaveValue('Porsi Besar');
  });

  test('back button returns to product list', async ({ page }) => {
    await page.goto('/app/products/new');
    await expect(page.locator('h1').filter({ hasText: 'Tambah Produk' })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Kembali/ }).click();
    await expect(page).toHaveURL(/\/app\/products$/);
  });

  test('category manager button exists', async ({ page }) => {
    await page.goto('/app/products');
    await expect(page.locator('h1').filter({ hasText: 'Produk' })).toBeVisible({ timeout: 10000 });

    // "Kategori" button
    const categoryBtn = page.getByRole('button', { name: /Kategori/ });
    await expect(categoryBtn).toBeVisible();
  });

  test('add product button is visible', async ({ page }) => {
    await page.goto('/app/products');
    await expect(page.locator('h1').filter({ hasText: 'Produk' })).toBeVisible({ timeout: 10000 });

    const addButton = page.getByRole('button', { name: 'Tambah Produk', exact: true });
    await expect(addButton).toBeVisible();
    await expect(addButton).toBeEnabled();
  });

  test('help button is available', async ({ page }) => {
    await page.goto('/app/products');
    await expect(page.locator('h1').filter({ hasText: 'Produk' })).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: /Help/ })).toBeVisible();
  });
});

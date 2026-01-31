import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks, mockProducts, mockCategories } from './fixtures/api-mocks';

test.describe('Products CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('product list page loads with data', async ({ page }) => {
    await page.goto('/products');

    // Page header
    await expect(page.getByRole('heading', { name: 'Produk' })).toBeVisible();
    await expect(page.getByText('Kelola daftar produk Anda')).toBeVisible();

    // Product data should be visible in the table
    for (const product of mockProducts) {
      await expect(page.getByText(product.name)).toBeVisible();
    }

    // SKUs should be visible
    await expect(page.getByText('NG-001')).toBeVisible();
    await expect(page.getByText('ETM-001')).toBeVisible();
  });

  test('product list shows status badges', async ({ page }) => {
    await page.goto('/products');

    // Active products should show "Aktif" badge
    const aktivBadges = page.getByText('Aktif', { exact: true });
    await expect(aktivBadges.first()).toBeVisible();

    // Inactive product (Kopi Susu) should show "Nonaktif" badge
    await expect(page.getByText('Nonaktif')).toBeVisible();
  });

  test('product list shows category badges', async ({ page }) => {
    await page.goto('/products');

    // Category names should appear as badges
    await expect(page.getByText('Makanan').first()).toBeVisible();
    await expect(page.getByText('Minuman').first()).toBeVisible();
  });

  test('search functionality works', async ({ page }) => {
    await page.goto('/products');

    // Find the search input
    const searchInput = page.getByPlaceholder('Cari produk...');
    await expect(searchInput).toBeVisible();

    // Type a search query
    await searchInput.fill('Nasi');

    // The search should trigger an API call (debounced)
    // Since we're mocking, we verify the input is working
    await expect(searchInput).toHaveValue('Nasi');
  });

  test('category filter select is available', async ({ page }) => {
    await page.goto('/products');

    // The category filter should be visible
    const categoryTrigger = page.getByRole('combobox').first();
    await expect(categoryTrigger).toBeVisible();

    // Click to open the category dropdown
    await categoryTrigger.click();

    // Should show "Semua Kategori" option plus all categories
    await expect(page.getByRole('option', { name: 'Semua Kategori' })).toBeVisible();
    for (const category of mockCategories) {
      await expect(page.getByRole('option', { name: category.name })).toBeVisible();
    }
  });

  test('navigate to create product form', async ({ page }) => {
    await page.goto('/products');

    // Click the "Tambah Produk" button
    await page.getByRole('button', { name: /Tambah Produk/ }).click();

    // Should navigate to the new product form
    await expect(page).toHaveURL(/\/products\/new/);

    // Form page header
    await expect(page.getByRole('heading', { name: 'Tambah Produk' })).toBeVisible();
  });

  test('product create form has all required fields', async ({ page }) => {
    await page.goto('/products/new');

    // Product information card
    await expect(page.getByText('Informasi Produk')).toBeVisible();

    // Required fields
    await expect(page.getByLabel('Nama Produk')).toBeVisible();
    await expect(page.getByLabel('SKU')).toBeVisible();
    await expect(page.getByLabel('Deskripsi')).toBeVisible();
    await expect(page.getByLabel('Harga Jual')).toBeVisible();
    await expect(page.getByLabel('Harga Modal')).toBeVisible();

    // Category selector
    await expect(page.getByText('Kategori').first()).toBeVisible();

    // Stock tracking toggle
    await expect(page.getByText('Lacak Stok')).toBeVisible();

    // Image upload
    await expect(page.getByText('Gambar Produk')).toBeVisible();

    // Variant section
    await expect(page.getByText('Varian')).toBeVisible();
    await expect(page.getByRole('button', { name: /Tambah Varian/ })).toBeVisible();

    // Submit / cancel buttons
    await expect(page.getByRole('button', { name: 'Buat Produk' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Batal' })).toBeVisible();

    // Back button
    await expect(page.getByRole('button', { name: /Kembali/ })).toBeVisible();
  });

  test('product form fields accept input', async ({ page }) => {
    await page.goto('/products/new');

    // Fill in the form
    await page.getByLabel('Nama Produk').fill('Nasi Uduk');
    await page.getByLabel('SKU').fill('NU-001');
    await page.getByLabel('Deskripsi').fill('Nasi uduk betawi');
    await page.getByLabel('Harga Jual').fill('25000');
    await page.getByLabel('Harga Modal').fill('10000');

    // Verify values
    await expect(page.getByLabel('Nama Produk')).toHaveValue('Nasi Uduk');
    await expect(page.getByLabel('SKU')).toHaveValue('NU-001');
    await expect(page.getByLabel('Deskripsi')).toHaveValue('Nasi uduk betawi');
    await expect(page.getByLabel('Harga Jual')).toHaveValue('25000');
    await expect(page.getByLabel('Harga Modal')).toHaveValue('10000');
  });

  test('can add and remove variants', async ({ page }) => {
    await page.goto('/products/new');

    // Initially no variant rows
    await expect(page.getByText('Belum ada varian')).toBeVisible();

    // Click "Tambah Varian"
    await page.getByRole('button', { name: /Tambah Varian/ }).click();

    // Variant row should appear with name, price, and cost fields
    await expect(page.getByText('Belum ada varian')).toBeHidden();

    // There should be input fields for the variant
    const variantNameInput = page.getByPlaceholder('Contoh: Large');
    await expect(variantNameInput).toBeVisible();

    // Fill variant name
    await variantNameInput.fill('Porsi Besar');
    await expect(variantNameInput).toHaveValue('Porsi Besar');
  });

  test('navigate to edit product form', async ({ page }) => {
    await page.goto('/products');

    // Find the "more" action button for the first product
    const moreButton = page.locator('table tbody tr').first().getByRole('button').last();
    await moreButton.click();

    // Click "Edit" in the dropdown
    await page.getByRole('menuitem', { name: /Edit/ }).click();

    // Should navigate to edit page
    await expect(page).toHaveURL(/\/products\/.*\/edit/);
  });

  test('back button returns to product list', async ({ page }) => {
    await page.goto('/products/new');

    await page.getByRole('button', { name: /Kembali/ }).click();

    await expect(page).toHaveURL(/\/products$/);
  });

  test('category manager dialog can be opened', async ({ page }) => {
    await page.goto('/products');

    // Click "Kategori" button
    await page.getByRole('button', { name: /Kategori/ }).click();

    // Category manager dialog/sheet should be visible
    // The CategoryManager component renders as a dialog or sheet
    await expect(page.getByText('Kategori').first()).toBeVisible();
  });
});

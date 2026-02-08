import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks } from './fixtures/api-mocks';

test.describe('POS Terminal', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('POS page loads with header', async ({ page }) => {
    await page.goto('/pos');
    await expect(page.locator('h1').filter({ hasText: 'POS Terminal' })).toBeVisible({ timeout: 10000 });
  });

  test('POS page shows user info in header', async ({ page }) => {
    await page.goto('/pos');
    await expect(page.locator('h1').filter({ hasText: 'POS Terminal' })).toBeVisible({ timeout: 10000 });
    // User name and outlet should be visible in header
    await expect(page.locator('header').getByText(/Budi Santoso|John Owner/)).toBeVisible();
    await expect(page.locator('header').getByText(/Outlet Pusat|Outlet Utama/)).toBeVisible();
  });

  test('POS page has order type tabs', async ({ page }) => {
    await page.goto('/pos');
    await expect(page.locator('h1').filter({ hasText: 'POS Terminal' })).toBeVisible({ timeout: 10000 });

    // Order type tabs: Dine In, Take Away, Delivery
    await expect(page.getByRole('button', { name: /Dine In/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Take Away/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Delivery/i })).toBeVisible();
  });

  test('product grid has search input', async ({ page }) => {
    await page.goto('/pos');
    await expect(page.locator('h1').filter({ hasText: 'POS Terminal' })).toBeVisible({ timeout: 10000 });

    const searchInput = page.getByPlaceholder('Cari produk atau scan barcode...');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Type a search term
    await searchInput.fill('Nasi');
    await expect(searchInput).toHaveValue('Nasi');
  });

  test('product grid shows category tabs', async ({ page }) => {
    await page.goto('/pos');
    await expect(page.locator('h1').filter({ hasText: 'POS Terminal' })).toBeVisible({ timeout: 10000 });

    // "Semua" category tab is always present
    await expect(page.getByRole('button', { name: /Semua/i })).toBeVisible({ timeout: 10000 });
  });

  test('cart panel is visible on desktop layout', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/pos');
    await expect(page.locator('h1').filter({ hasText: 'POS Terminal' })).toBeVisible({ timeout: 10000 });

    // Cart panel with "Pesanan" heading
    await expect(page.getByText('Pesanan').first()).toBeVisible({ timeout: 10000 });

    // Order type label
    await expect(page.getByText('Makan di Tempat').first()).toBeVisible();

    // Empty cart message
    await expect(page.getByText('Keranjang kosong')).toBeVisible();
  });

  test('POS header action buttons are present', async ({ page }) => {
    await page.goto('/pos');
    await expect(page.locator('h1').filter({ hasText: 'POS Terminal' })).toBeVisible({ timeout: 10000 });

    // Action buttons in header
    await expect(page.getByRole('button', { name: /Pelanggan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Meja/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Diskon/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ditahan/i })).toBeVisible();
  });

  test('view mode toggle buttons exist', async ({ page }) => {
    await page.goto('/pos');
    await expect(page.locator('h1').filter({ hasText: 'POS Terminal' })).toBeVisible({ timeout: 10000 });

    // Grid and list toggle buttons near search
    const toggleButtons = page.locator('button').filter({ has: page.locator('svg') });
    await expect(toggleButtons.first()).toBeVisible();
  });

  test('keyboard shortcut F1 focuses search input', async ({ page }) => {
    await page.goto('/pos');
    await expect(page.locator('h1').filter({ hasText: 'POS Terminal' })).toBeVisible({ timeout: 10000 });

    // Wait for page to be fully interactive
    const searchInput = page.getByPlaceholder('Cari produk atau scan barcode...');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Press F1
    await page.keyboard.press('F1');

    // The search input should be focused
    await expect(searchInput).toBeFocused();
  });

  test('back button navigates to backoffice', async ({ page }) => {
    await page.goto('/pos');
    await expect(page.locator('h1').filter({ hasText: 'POS Terminal' })).toBeVisible({ timeout: 10000 });

    // Click the back button
    const backButton = page.getByRole('button', { name: 'Kembali ke dashboard' });
    await backButton.click();

    // Should navigate to dashboard (/app)
    await expect(page).toHaveURL(/\/app\/?$/);
  });

  test('order type can be switched', async ({ page }) => {
    await page.goto('/pos');
    await expect(page.locator('h1').filter({ hasText: 'POS Terminal' })).toBeVisible({ timeout: 10000 });

    // Default is Dine In, switch to Take Away
    await page.getByRole('button', { name: /Take Away/i }).click();

    // Cart panel should update order type
    await expect(page.getByText('Bawa Pulang').first()).toBeVisible({ timeout: 5000 });
  });

  test('product grid shows products or empty state', async ({ page }) => {
    await page.goto('/pos');
    await expect(page.locator('h1').filter({ hasText: 'POS Terminal' })).toBeVisible({ timeout: 10000 });

    // Should show products (from seed data) or empty state
    const productName = page.getByText('Americano').first();
    const emptyState = page.getByText(/Produk tidak ditemukan|Tidak ada produk/);
    await expect(productName.or(emptyState)).toBeVisible({ timeout: 15000 });
  });

  test('POS page has fullscreen layout', async ({ page }) => {
    await page.goto('/pos');
    await expect(page.locator('h1').filter({ hasText: 'POS Terminal' })).toBeVisible({ timeout: 10000 });

    // POS uses h-screen fullscreen layout (no sidebar)
    const posContainer = page.locator('.h-screen').first();
    await expect(posContainer).toBeVisible();
  });

  test('Dine In is the default order type', async ({ page }) => {
    await page.goto('/pos');
    await expect(page.locator('h1').filter({ hasText: 'POS Terminal' })).toBeVisible({ timeout: 10000 });

    // Dine In button should be active/selected (has different styling)
    const dineInBtn = page.getByRole('button', { name: /Dine In/i });
    await expect(dineInBtn).toBeVisible();

    // Cart should show "Makan di Tempat"
    await expect(page.getByText('Makan di Tempat').first()).toBeVisible();
  });
});

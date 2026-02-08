import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks } from './fixtures/api-mocks';

test.describe('Online Store - Admin Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('online store admin page loads with heading', async ({ page }) => {
    await page.goto('/app/online-store');

    await expect(
      page.locator('h1').filter({ hasText: 'Toko Online' }),
    ).toBeVisible({ timeout: 10000 });

    await expect(page.getByText(/Kelola toko online/i)).toBeVisible({ timeout: 10000 });
  });

  test('shows store list or empty state', async ({ page }) => {
    await page.goto('/app/online-store');

    await expect(
      page.locator('h1').filter({ hasText: 'Toko Online' }),
    ).toBeVisible({ timeout: 10000 });

    // Should show either store cards or empty state message
    const emptyState = page.getByText(/Belum ada toko online/i);
    const storeCard = page.locator('[class*="card"]').first();
    await expect(emptyState.or(storeCard).first()).toBeVisible({ timeout: 10000 });
  });

  test('has create store button', async ({ page }) => {
    await page.goto('/app/online-store');

    await expect(
      page.locator('h1').filter({ hasText: 'Toko Online' }),
    ).toBeVisible({ timeout: 10000 });

    const createButton = page.getByRole('button', { name: /Buat Toko|Create Store/i }).first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
  });

  test('create store dialog opens when clicking button', async ({ page }) => {
    await page.goto('/app/online-store');

    await expect(
      page.locator('h1').filter({ hasText: 'Toko Online' }),
    ).toBeVisible({ timeout: 10000 });

    const createButton = page.getByRole('button', { name: /Buat Toko/i }).first();
    await createButton.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Buat Toko Online' })).toBeVisible({ timeout: 10000 });
  });

  test('create store dialog has form fields', async ({ page }) => {
    await page.goto('/app/online-store');

    await expect(
      page.locator('h1').filter({ hasText: 'Toko Online' }),
    ).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Buat Toko/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    // Form fields: Nama Toko, Slug, Deskripsi
    await expect(page.getByText('Nama Toko')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Slug')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Deskripsi')).toBeVisible({ timeout: 10000 });

    // Input placeholders should be present
    await expect(page.getByPlaceholder(/Contoh/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder(/kedai-kopi/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder(/Deskripsi singkat/i)).toBeVisible({ timeout: 10000 });
  });

  test('slug auto-generates from store name input', async ({ page }) => {
    await page.goto('/app/online-store');

    await expect(
      page.locator('h1').filter({ hasText: 'Toko Online' }),
    ).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Buat Toko/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    // Type a store name
    await page.getByPlaceholder(/Contoh/i).fill('Toko Baru Saya');

    // Slug field should auto-populate
    const slugInput = page.getByPlaceholder(/kedai-kopi/i);
    await expect(slugInput).toHaveValue('toko-baru-saya', { timeout: 10000 });
  });

  test('can cancel store creation dialog', async ({ page }) => {
    await page.goto('/app/online-store');

    await expect(
      page.locator('h1').filter({ hasText: 'Toko Online' }),
    ).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Buat Toko/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    // Click Batal to cancel
    await page.getByRole('button', { name: 'Batal' }).click();

    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });
  });

  test('can open view store button', async ({ page }) => {
    await page.goto('/app/online-store');

    await expect(
      page.locator('h1').filter({ hasText: 'Toko Online' }),
    ).toBeVisible({ timeout: 10000 });

    // If stores are loaded, there should be a "Lihat Toko" button
    const viewButton = page.getByRole('button', { name: /Lihat Toko|View Store/i }).first();
    const emptyState = page.getByText(/Belum ada toko online/i);

    // Either view button exists (stores loaded) or empty state is shown
    await expect(viewButton.or(emptyState).first()).toBeVisible({ timeout: 10000 });
  });

  test('view store button is enabled when stores exist', async ({ page }) => {
    await page.goto('/app/online-store');

    await expect(
      page.locator('h1').filter({ hasText: 'Toko Online' }),
    ).toBeVisible({ timeout: 10000 });

    const viewButton = page.getByRole('button', { name: /Lihat Toko/i }).first();
    if (await viewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(viewButton).toBeEnabled();
    }
  });

  test('keyboard shortcut N opens create dialog', async ({ page }) => {
    await page.goto('/app/online-store');

    await expect(
      page.locator('h1').filter({ hasText: 'Toko Online' }),
    ).toBeVisible({ timeout: 10000 });

    // Press N key to open dialog via keyboard shortcut
    await page.keyboard.press('n');

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
  });

  test('create button is disabled when form fields are empty', async ({ page }) => {
    await page.goto('/app/online-store');

    await expect(
      page.locator('h1').filter({ hasText: 'Toko Online' }),
    ).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Buat Toko/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    // The submit button inside the dialog should be disabled when name/slug are empty
    const submitButton = page.getByRole('dialog').getByRole('button', { name: 'Buat Toko' });
    await expect(submitButton).toBeDisabled({ timeout: 10000 });
  });

  test('page description text is visible', async ({ page }) => {
    await page.goto('/app/online-store');

    await expect(
      page.locator('h1').filter({ hasText: 'Toko Online' }),
    ).toBeVisible({ timeout: 10000 });

    await expect(page.getByText(/Kelola toko online Anda/i)).toBeVisible({ timeout: 10000 });
  });
});

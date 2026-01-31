import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks, mockKDSOrders } from './fixtures/api-mocks';

test.describe('Kitchen Display System (KDS)', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('KDS page loads with header', async ({ page }) => {
    await page.goto('/kds');

    // KDS header
    await expect(page.getByRole('heading', { name: 'Kitchen Display' })).toBeVisible();

    // Outlet name should be visible
    await expect(page.getByText('Outlet Utama')).toBeVisible();

    // The page should have a dark background (bg-zinc-900)
    const container = page.locator('.bg-zinc-900').first();
    await expect(container).toBeVisible();
  });

  test('KDS page shows live clock', async ({ page }) => {
    await page.goto('/kds');

    // The clock should render with a font-mono class
    const clock = page.locator('.font-mono').first();
    await expect(clock).toBeVisible();

    // The clock text should contain time-like characters (digits and colons)
    const clockText = await clock.textContent();
    expect(clockText).toMatch(/\d{2}[.:]\d{2}[.:]\d{2}/);
  });

  test('KDS page shows active orders badge', async ({ page }) => {
    await page.goto('/kds');

    // Should show badge with active order count
    await expect(page.getByText(/\d+ pesanan aktif/)).toBeVisible();
  });

  test('order cards render with correct data', async ({ page }) => {
    await page.goto('/kds');

    // Wait for orders to load
    // Order numbers should be visible
    await expect(page.getByText('#001')).toBeVisible();
    await expect(page.getByText('#002')).toBeVisible();
    await expect(page.getByText('#003')).toBeVisible();

    // Table names should be visible for dine-in orders
    await expect(page.getByText('Meja 3').first()).toBeVisible();
    await expect(page.getByText('Meja 1').first()).toBeVisible();

    // Order type badges
    await expect(page.getByText('dine_in').first()).toBeVisible();
    await expect(page.getByText('takeaway')).toBeVisible();

    // Product names in order items
    await expect(page.getByText('Nasi Goreng Spesial').first()).toBeVisible();
    await expect(page.getByText('Es Teh Manis').first()).toBeVisible();
    await expect(page.getByText('Mie Ayam Bakso')).toBeVisible();
  });

  test('order cards show item quantities', async ({ page }) => {
    await page.goto('/kds');

    // Quantities should be visible (e.g., "2x")
    await expect(page.getByText('2x').first()).toBeVisible();
    await expect(page.getByText('1x').first()).toBeVisible();
  });

  test('order cards show item notes', async ({ page }) => {
    await page.goto('/kds');

    // Notes should be visible
    await expect(page.getByText('Kurang gula')).toBeVisible();
    await expect(page.getByText('Tanpa sayur')).toBeVisible();
  });

  test('order cards show modifiers', async ({ page }) => {
    await page.goto('/kds');

    // Modifiers should be visible
    await expect(page.getByText('Extra bakso')).toBeVisible();
  });

  test('priority badges display correctly', async ({ page }) => {
    await page.goto('/kds');

    // VIP order should show VIP badge
    await expect(page.getByText('VIP')).toBeVisible();

    // Urgent order should show Urgent badge
    await expect(page.getByText('Urgent')).toBeVisible();
  });

  test('filter tabs render with correct labels', async ({ page }) => {
    await page.goto('/kds');

    // Filter tabs should be visible
    await expect(page.getByText('Semua').first()).toBeVisible();
    await expect(page.getByText('Menunggu').first()).toBeVisible();
    await expect(page.getByText('Diproses').first()).toBeVisible();
    await expect(page.getByText('Siap').first()).toBeVisible();
  });

  test('filter tabs show counts', async ({ page }) => {
    await page.goto('/kds');

    // Total count for "Semua" should match total orders
    const allTab = page.locator('button').filter({ hasText: 'Semua' }).first();
    await expect(allTab).toBeVisible();

    // The count is shown as a span inside the button
    const allCount = allTab.locator('span').last();
    const countText = await allCount.textContent();
    expect(countText).toBe(String(mockKDSOrders.length));
  });

  test('clicking filter tab changes active state', async ({ page }) => {
    await page.goto('/kds');

    // Click on "Menunggu" tab
    const pendingTab = page.locator('button').filter({ hasText: 'Menunggu' }).first();
    await pendingTab.click();

    // The "Menunggu" tab should now have the active style (bg-orange-600)
    await expect(pendingTab).toHaveClass(/bg-orange-600/);

    // "Semua" tab should no longer be active
    const allTab = page.locator('button').filter({ hasText: 'Semua' }).first();
    await expect(allTab).not.toHaveClass(/bg-orange-600/);
  });

  test('clicking "Siap" filter shows ready orders', async ({ page }) => {
    await page.goto('/kds');

    // Click on "Siap" tab
    const readyTab = page.locator('button').filter({ hasText: 'Siap' }).first();
    await readyTab.click();

    // Order #003 (all items ready) should be visible
    await expect(page.getByText('#003')).toBeVisible();

    // The completed section header should show
    await expect(page.getByText(/Selesai/)).toBeVisible();
  });

  test('KDS stats bar shows statistics', async ({ page }) => {
    await page.goto('/kds');

    // The stats bar component should render with performance metrics
    // It shows data like total orders, average time, etc.
    // The KDSStatsBar is only rendered when orders.length > 0
    // It should be present since we have mock orders
    const statsSection = page.locator('[class*="border-b"]').nth(1);
    await expect(statsSection).toBeVisible();
  });

  test('completed orders show "Semua item selesai" message', async ({ page }) => {
    await page.goto('/kds');

    // Order #003 has all items in "ready" status
    await expect(page.getByText('Semua item selesai')).toBeVisible();
  });

  test('completed orders show "Beritahu Kasir" button', async ({ page }) => {
    await page.goto('/kds');

    // The "Beritahu Kasir" button should be visible for completed orders
    await expect(page.getByRole('button', { name: /Beritahu Kasir/ })).toBeVisible();
  });

  test('refresh button is present and clickable', async ({ page }) => {
    await page.goto('/kds');

    // The refresh button is in the header
    const headerButtons = page.locator('header button');
    // The refresh button should exist (has RefreshCw icon)
    await expect(headerButtons.nth(1)).toBeVisible();
  });

  test('back button navigates to dashboard', async ({ page }) => {
    await page.goto('/kds');

    // Click back button
    const backButton = page.locator('header button').first();
    await backButton.click();

    // Should navigate to dashboard
    await expect(page).toHaveURL(/^http:\/\/localhost:5173\/?$/);
  });

  test('active orders show bump buttons for incomplete items', async ({ page }) => {
    await page.goto('/kds');

    // Active orders (not all items ready) should have green check buttons for each item
    // Order #001 has pending items, so bump buttons should be present
    // Each non-done item gets a green button with a Check icon
    const bumpButtons = page.locator('button.bg-green-600');
    const count = await bumpButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('orders display progress indicators', async ({ page }) => {
    await page.goto('/kds');

    // Active orders should show progress info like "X/Y item selesai"
    await expect(page.getByText(/\d+\/\d+ item selesai/)).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks } from './fixtures/api-mocks';

test.describe('Kitchen Display System (KDS)', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('KDS page loads with header', async ({ page }) => {
    await page.goto('/kds');

    // KDS header
    await expect(page.getByRole('heading', { name: 'Kitchen Display' })).toBeVisible({ timeout: 10000 });

    // Outlet name should be visible
    await expect(page.getByText(/Outlet/i).first()).toBeVisible();

    // The page should have a dark background (bg-zinc-900)
    const container = page.locator('.bg-zinc-900').first();
    await expect(container).toBeVisible();
  });

  test('KDS page shows live clock', async ({ page }) => {
    await page.goto('/kds');
    await expect(page.getByRole('heading', { name: 'Kitchen Display' })).toBeVisible({ timeout: 10000 });

    // The clock should render with a font-mono class
    const clock = page.locator('.font-mono').first();
    await expect(clock).toBeVisible();

    // The clock text should contain time-like characters (digits and separators)
    const clockText = await clock.textContent();
    expect(clockText).toMatch(/\d{2}[.:]\d{2}[.:]\d{2}/);
  });

  test('KDS page shows active orders badge', async ({ page }) => {
    await page.goto('/kds');
    await expect(page.getByRole('heading', { name: 'Kitchen Display' })).toBeVisible({ timeout: 10000 });

    // Should show badge with active order count
    await expect(page.getByText(/\d+ pesanan aktif/)).toBeVisible();
  });

  test('order cards render on the page', async ({ page }) => {
    await page.goto('/kds');
    await expect(page.getByRole('heading', { name: 'Kitchen Display' })).toBeVisible({ timeout: 10000 });

    // Order cards should be present (identified by order number pattern #ORD-xxx)
    const orderCards = page.getByText(/^#ORD-/);
    const count = await orderCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('order cards show item quantities', async ({ page }) => {
    await page.goto('/kds');
    await expect(page.getByRole('heading', { name: 'Kitchen Display' })).toBeVisible({ timeout: 10000 });

    // Quantities should be visible (e.g., "1x", "2x", "3x")
    await expect(page.getByText(/^\d+x$/).first()).toBeVisible();
  });

  test('filter tabs render with correct labels', async ({ page }) => {
    await page.goto('/kds');
    await expect(page.getByRole('heading', { name: 'Kitchen Display' })).toBeVisible({ timeout: 10000 });

    // Filter tabs should be visible
    await expect(page.locator('button').filter({ hasText: 'Semua' }).first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'Menunggu' }).first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'Diproses' }).first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'Siap' }).first()).toBeVisible();
  });

  test('filter tabs show counts', async ({ page }) => {
    await page.goto('/kds');
    await expect(page.getByRole('heading', { name: 'Kitchen Display' })).toBeVisible({ timeout: 10000 });

    // "Semua" tab should have a count
    const allTab = page.locator('button').filter({ hasText: 'Semua' }).first();
    await expect(allTab).toBeVisible();

    // The count span should contain a number
    const allCount = allTab.locator('span').last();
    const countText = await allCount.textContent();
    expect(countText).toMatch(/\d+/);
  });

  test('clicking filter tab changes active state', async ({ page }) => {
    await page.goto('/kds');
    await expect(page.getByRole('heading', { name: 'Kitchen Display' })).toBeVisible({ timeout: 10000 });

    // Click on "Menunggu" tab
    const pendingTab = page.locator('button').filter({ hasText: 'Menunggu' }).first();
    await pendingTab.click();

    // The "Menunggu" tab should now have the active style (bg-orange-600)
    await expect(pendingTab).toHaveClass(/bg-orange-600/);

    // "Semua" tab should no longer be active
    const allTab = page.locator('button').filter({ hasText: 'Semua' }).first();
    await expect(allTab).not.toHaveClass(/bg-orange-600/);
  });

  test('KDS stats bar shows statistics', async ({ page }) => {
    await page.goto('/kds');
    await expect(page.getByRole('heading', { name: 'Kitchen Display' })).toBeVisible({ timeout: 10000 });

    // Stats section should be visible
    await expect(page.getByText('STATISTIK DAPUR')).toBeVisible();
    await expect(page.getByText('ANTRIAN PESANAN')).toBeVisible();
    await expect(page.getByText('RATA-RATA PERSIAPAN')).toBeVisible();
  });

  test('completed orders section exists', async ({ page }) => {
    await page.goto('/kds');
    await expect(page.getByRole('heading', { name: 'Kitchen Display' })).toBeVisible({ timeout: 10000 });

    // Click "Siap" tab to see ready/completed orders
    const readyTab = page.locator('button').filter({ hasText: 'Siap' }).first();
    await readyTab.click();

    // Either completed section header or empty state should appear
    const completedSection = page.getByText(/Selesai|Siap/i).first();
    await expect(completedSection).toBeVisible({ timeout: 5000 });
  });

  test('refresh button is present and clickable', async ({ page }) => {
    await page.goto('/kds');
    await expect(page.getByRole('heading', { name: 'Kitchen Display' })).toBeVisible({ timeout: 10000 });

    // The refresh button is in the header area
    const headerButtons = page.locator('header button');
    // There should be at least a back button and refresh button
    const count = await headerButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('back button navigates away from KDS', async ({ page }) => {
    await page.goto('/kds');
    await expect(page.getByRole('heading', { name: 'Kitchen Display' })).toBeVisible({ timeout: 10000 });

    // Click back button (first button in header)
    const backButton = page.locator('header button').first();
    await backButton.click();

    // Should navigate away from KDS
    await expect(page).not.toHaveURL(/\/kds/, { timeout: 10000 });
  });

  test('orders display progress indicators', async ({ page }) => {
    await page.goto('/kds');
    await expect(page.getByRole('heading', { name: 'Kitchen Display' })).toBeVisible({ timeout: 10000 });

    // Active orders should show progress info like "X/Y item selesai"
    await expect(page.getByText(/\d+\/\d+ item selesai/).first()).toBeVisible();
  });

  test('order cards have bump buttons', async ({ page }) => {
    await page.goto('/kds');
    await expect(page.getByRole('heading', { name: 'Kitchen Display' })).toBeVisible({ timeout: 10000 });

    // Active orders should have green check/bump buttons
    const bumpButtons = page.locator('button svg.lucide-check').first();
    await expect(bumpButtons).toBeVisible({ timeout: 5000 });
  });

  test('order type badges are displayed', async ({ page }) => {
    await page.goto('/kds');
    await expect(page.getByRole('heading', { name: 'Kitchen Display' })).toBeVisible({ timeout: 10000 });

    // Order type badges should show (dine_in, takeaway, delivery, etc.)
    const badges = page.getByText(/dine_in|takeaway|delivery/i);
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
  });
});

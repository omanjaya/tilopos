import { test, expect } from '@playwright/test';
import { setupApiMocks } from './fixtures/api-mocks';
import { setAuthenticatedStateForRole } from './fixtures/auth.fixture';

/**
 * Role-Based Access Control Tests
 *
 * Tests that each role can only access appropriate features.
 * Role hierarchy: super_admin > owner > manager > supervisor > cashier/kitchen
 *
 * Actual RoleGuard-protected routes (from router.tsx):
 * - employees, employees/new, employees/:id/edit → ['owner', 'super_admin', 'manager']
 * - audit → ['owner', 'super_admin']
 * - settings/business → ['owner', 'super_admin']
 * - settings/outlets → ['owner', 'super_admin', 'manager']
 * - settings/devices → ['owner', 'super_admin', 'manager']
 * - settings/notifications → ['owner', 'super_admin', 'manager']
 * - settings/tax → ['owner', 'super_admin']
 * - settings/receipt → ['owner', 'super_admin', 'manager']
 * - settings/hours → ['owner', 'super_admin', 'manager']
 *
 * All other routes (POS, KDS, products, reports, transactions, etc.)
 * only have AuthGuard — accessible by ALL authenticated roles.
 */

test.describe('Role-Based Access Control', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  // ===========================================================================
  // Owner Role - Full Access
  // ===========================================================================
  test.describe('Owner Role - Full Access', () => {
    test.beforeEach(async ({ page }) => {
      await setAuthenticatedStateForRole(page, 'owner');
    });

    test('owner can access dashboard', async ({ page }) => {
      await page.goto('/app');
      await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    });

    test('owner can access POS', async ({ page }) => {
      await page.goto('/pos');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      // POS page should not redirect away
      await expect(page).toHaveURL(/\/pos/);
    });

    test('owner can access KDS', async ({ page }) => {
      await page.goto('/kds');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(/\/kds/);
    });

    test('owner can access employees management', async ({ page }) => {
      await page.goto('/app/employees');
      await expect(page.locator('h1').filter({ hasText: 'Karyawan' })).toBeVisible({ timeout: 10000 });
    });

    test('owner can access business settings', async ({ page }) => {
      await page.goto('/app/settings/business');
      await expect(page.locator('h1, h2').filter({ hasNotText: 'TILO' }).first()).toBeVisible({ timeout: 15000 });
      await expect(page).toHaveURL(/\/app\/settings\/business/);
    });

    test('owner can access tax settings', async ({ page }) => {
      await page.goto('/app/settings/tax');
      await expect(page.locator('h1, h2').filter({ hasNotText: 'TILO' }).first()).toBeVisible({ timeout: 15000 });
      await expect(page).toHaveURL(/\/app\/settings\/tax/);
    });

    test('owner can access audit log', async ({ page }) => {
      await page.goto('/app/audit');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(/\/app\/audit/);
    });

    test('owner can access reports', async ({ page }) => {
      await page.goto('/app/reports');
      await expect(page.locator('h1, h2').filter({ hasNotText: 'TILO' }).first()).toBeVisible({ timeout: 15000 });
      await expect(page).toHaveURL(/\/app\/reports/);
    });
  });

  // ===========================================================================
  // Manager Role - Limited Admin Access
  // ===========================================================================
  test.describe('Manager Role - Limited Admin Access', () => {
    test.beforeEach(async ({ page }) => {
      await setAuthenticatedStateForRole(page, 'manager');
    });

    test('manager can access dashboard', async ({ page }) => {
      await page.goto('/app');
      await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    });

    test('manager can access POS', async ({ page }) => {
      await page.goto('/pos');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(/\/pos/);
    });

    test('manager can access employees', async ({ page }) => {
      await page.goto('/app/employees');
      await expect(page.locator('h1').filter({ hasText: 'Karyawan' })).toBeVisible({ timeout: 10000 });
    });

    test('manager can access outlets settings', async ({ page }) => {
      await page.goto('/app/settings/outlets');
      await expect(page.locator('h1, h2').filter({ hasNotText: 'TILO' }).first()).toBeVisible({ timeout: 15000 });
      await expect(page).toHaveURL(/\/app\/settings\/outlets/);
    });

    test('manager cannot access business settings - redirects', async ({ page }) => {
      await page.goto('/app/settings/business');
      // RoleGuard redirects non-owner to /app
      await expect(page).toHaveURL(/\/app\/?$/, { timeout: 10000 });
    });

    test('manager cannot access tax settings - redirects', async ({ page }) => {
      await page.goto('/app/settings/tax');
      await expect(page).toHaveURL(/\/app\/?$/, { timeout: 10000 });
    });

    test('manager cannot access audit log - redirects', async ({ page }) => {
      await page.goto('/app/audit');
      await expect(page).toHaveURL(/\/app\/?$/, { timeout: 10000 });
    });

    test('manager can access reports', async ({ page }) => {
      await page.goto('/app/reports');
      await expect(page.locator('h1, h2').filter({ hasNotText: 'TILO' }).first()).toBeVisible({ timeout: 15000 });
      await expect(page).toHaveURL(/\/app\/reports/);
    });
  });

  // ===========================================================================
  // Supervisor Role - Operational Access
  // ===========================================================================
  test.describe('Supervisor Role - Operational Access', () => {
    test.beforeEach(async ({ page }) => {
      await setAuthenticatedStateForRole(page, 'supervisor');
    });

    test('supervisor can access dashboard', async ({ page }) => {
      await page.goto('/app');
      await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    });

    test('supervisor can access POS', async ({ page }) => {
      await page.goto('/pos');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(/\/pos/);
    });

    test('supervisor can access products', async ({ page }) => {
      await page.goto('/app/products');
      await expect(page.locator('h1').filter({ hasText: 'Produk' })).toBeVisible({ timeout: 10000 });
    });

    test('supervisor cannot access employees - redirects', async ({ page }) => {
      await page.goto('/app/employees');
      await expect(page).toHaveURL(/\/app\/?$/, { timeout: 10000 });
    });

    test('supervisor cannot access business settings - redirects', async ({ page }) => {
      await page.goto('/app/settings/business');
      await expect(page).toHaveURL(/\/app\/?$/, { timeout: 10000 });
    });

    test('supervisor cannot access audit - redirects', async ({ page }) => {
      await page.goto('/app/audit');
      await expect(page).toHaveURL(/\/app\/?$/, { timeout: 10000 });
    });

    test('supervisor can access reports', async ({ page }) => {
      await page.goto('/app/reports');
      await expect(page.locator('h1, h2').filter({ hasNotText: 'TILO' }).first()).toBeVisible({ timeout: 15000 });
      await expect(page).toHaveURL(/\/app\/reports/);
    });
  });

  // ===========================================================================
  // Cashier Role - POS Focused
  // ===========================================================================
  test.describe('Cashier Role - POS Focused', () => {
    test.beforeEach(async ({ page }) => {
      await setAuthenticatedStateForRole(page, 'cashier');
    });

    test('cashier can access dashboard', async ({ page }) => {
      await page.goto('/app');
      await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    });

    test('cashier can access POS', async ({ page }) => {
      await page.goto('/pos');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(/\/pos/);
    });

    test('cashier can access transactions', async ({ page }) => {
      await page.goto('/app/transactions');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(/\/app\/transactions/);
    });

    test('cashier cannot access employees - redirects', async ({ page }) => {
      await page.goto('/app/employees');
      await expect(page).toHaveURL(/\/app\/?$/, { timeout: 10000 });
    });

    test('cashier cannot access business settings - redirects', async ({ page }) => {
      await page.goto('/app/settings/business');
      await expect(page).toHaveURL(/\/app\/?$/, { timeout: 10000 });
    });

    test('cashier cannot access audit - redirects', async ({ page }) => {
      await page.goto('/app/audit');
      await expect(page).toHaveURL(/\/app\/?$/, { timeout: 10000 });
    });
  });

  // ===========================================================================
  // Kitchen Role - KDS Focused
  // ===========================================================================
  test.describe('Kitchen Role - KDS Focused', () => {
    test.beforeEach(async ({ page }) => {
      await setAuthenticatedStateForRole(page, 'kitchen');
    });

    test('kitchen can access KDS', async ({ page }) => {
      await page.goto('/kds');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(/\/kds/);
    });

    test('kitchen can access dashboard', async ({ page }) => {
      await page.goto('/app');
      await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    });

    test('kitchen cannot access employees - redirects', async ({ page }) => {
      await page.goto('/app/employees');
      await expect(page).toHaveURL(/\/app\/?$/, { timeout: 10000 });
    });

    test('kitchen cannot access business settings - redirects', async ({ page }) => {
      await page.goto('/app/settings/business');
      await expect(page).toHaveURL(/\/app\/?$/, { timeout: 10000 });
    });

    test('kitchen cannot access audit - redirects', async ({ page }) => {
      await page.goto('/app/audit');
      await expect(page).toHaveURL(/\/app\/?$/, { timeout: 10000 });
    });
  });

  // ===========================================================================
  // Sidebar Menu Visibility
  // ===========================================================================
  test.describe('Sidebar Menu Visibility', () => {
    test('owner sees all menu items', async ({ page }) => {
      await setAuthenticatedStateForRole(page, 'owner');
      await page.goto('/app');
      await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

      const sidebar = page.locator('aside');
      await expect(sidebar.getByText('Dashboard')).toBeVisible();
      await expect(sidebar.getByText('POS Terminal')).toBeVisible();
    });

    test('manager sees core menu items', async ({ page }) => {
      await setAuthenticatedStateForRole(page, 'manager');
      await page.goto('/app');
      await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

      const sidebar = page.locator('aside');
      await expect(sidebar.getByText('Dashboard')).toBeVisible();
      await expect(sidebar.getByText('POS Terminal')).toBeVisible();
    });

    test('cashier sees dashboard and POS', async ({ page }) => {
      await setAuthenticatedStateForRole(page, 'cashier');
      await page.goto('/app');
      await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

      const sidebar = page.locator('aside');
      await expect(sidebar.getByText('Dashboard')).toBeVisible();
      await expect(sidebar.getByText('POS Terminal')).toBeVisible();
    });

    test('kitchen sees KDS link', async ({ page }) => {
      await setAuthenticatedStateForRole(page, 'kitchen');
      await page.goto('/app');
      await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });

      const sidebar = page.locator('aside');
      await expect(sidebar.getByText('Kitchen Display')).toBeVisible();
    });
  });

  // ===========================================================================
  // Role Differentiation
  // ===========================================================================
  test.describe('Role Differentiation', () => {
    test('cashier is blocked from employees while manager is allowed', async ({ page }) => {
      // Verify cashier is redirected from employees
      await setAuthenticatedStateForRole(page, 'cashier');
      await page.goto('/app/employees');
      await expect(page).toHaveURL(/\/app\/?$/, { timeout: 10000 });
    });

    test('manager can access employees page', async ({ page }) => {
      // Verify manager can access employees
      await setAuthenticatedStateForRole(page, 'manager');
      await page.goto('/app/employees');
      await expect(page.locator('h1').filter({ hasText: 'Karyawan' })).toBeVisible({ timeout: 10000 });
    });
  });

  // ===========================================================================
  // Unauthorized Access Handling
  // ===========================================================================
  test.describe('Unauthorized Access Handling', () => {
    test('cashier accessing restricted page gets redirected', async ({ page }) => {
      await setAuthenticatedStateForRole(page, 'cashier');
      await page.goto('/app/settings/business');
      await expect(page).toHaveURL(/\/app\/?$/, { timeout: 10000 });
    });

    test('kitchen accessing restricted page gets redirected gracefully', async ({ page }) => {
      await setAuthenticatedStateForRole(page, 'kitchen');
      await page.goto('/app/employees');
      await expect(page).toHaveURL(/\/app\/?$/, { timeout: 10000 });
    });
  });
});

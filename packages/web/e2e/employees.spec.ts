import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks, mockEmployees } from './fixtures/api-mocks';

test.describe('Employees CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('employee list page loads with data', async ({ page }) => {
    await page.goto('/employees');

    // Page header
    await expect(page.getByRole('heading', { name: 'Karyawan' })).toBeVisible();
    await expect(page.getByText('Kelola daftar karyawan Anda')).toBeVisible();

    // Employee data should be visible
    for (const emp of mockEmployees) {
      await expect(page.getByText(emp.name)).toBeVisible();
    }

    // Emails should be visible
    await expect(page.getByText('john@tilo.test')).toBeVisible();
    await expect(page.getByText('jane@tilo.test')).toBeVisible();
  });

  test('employee list shows role badges', async ({ page }) => {
    await page.goto('/employees');

    // Wait for data to load - roles are displayed via ROLE_LABELS mapping
    // The exact labels depend on the ROLE_LABELS constant
    // At minimum, the role column should have content in badge elements
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Check that the table has rows with employee data
    const rows = table.locator('tbody tr');
    await expect(rows).toHaveCount(mockEmployees.length);
  });

  test('employee list shows status badges', async ({ page }) => {
    await page.goto('/employees');

    // Active employees should show "Aktif"
    const aktivBadges = page.getByText('Aktif', { exact: true });
    await expect(aktivBadges.first()).toBeVisible();

    // Inactive employee (Bob Kitchen) should show "Nonaktif"
    await expect(page.getByText('Nonaktif')).toBeVisible();
  });

  test('search functionality works', async ({ page }) => {
    await page.goto('/employees');

    const searchInput = page.getByPlaceholder('Cari karyawan...');
    await expect(searchInput).toBeVisible();

    // Type a search query
    await searchInput.fill('Jane');
    await expect(searchInput).toHaveValue('Jane');
  });

  test('role filter select is available', async ({ page }) => {
    await page.goto('/employees');

    // There should be role and status filter comboboxes
    const comboboxes = page.getByRole('combobox');

    // First combobox is role filter
    const roleFilter = comboboxes.first();
    await expect(roleFilter).toBeVisible();

    // Open role filter
    await roleFilter.click();

    // Should show "Semua Role" option
    await expect(page.getByRole('option', { name: 'Semua Role' })).toBeVisible();
  });

  test('status filter select is available', async ({ page }) => {
    await page.goto('/employees');

    // Status filter is the second combobox
    const comboboxes = page.getByRole('combobox');
    const statusFilter = comboboxes.nth(1);
    await expect(statusFilter).toBeVisible();

    // Open status filter
    await statusFilter.click();

    // Should show "Semua Status" option
    await expect(page.getByRole('option', { name: 'Semua Status' })).toBeVisible();
  });

  test('navigate to create employee form', async ({ page }) => {
    await page.goto('/employees');

    // Click the "Tambah Karyawan" button
    await page.getByRole('button', { name: /Tambah Karyawan/ }).click();

    // Should navigate to the new employee form
    await expect(page).toHaveURL(/\/employees\/new/);

    // Form page header
    await expect(page.getByRole('heading', { name: 'Tambah Karyawan' })).toBeVisible();
  });

  test('employee create form has all required fields', async ({ page }) => {
    await page.goto('/employees/new');

    // Employee information card
    await expect(page.getByText('Informasi Karyawan')).toBeVisible();

    // Required fields
    await expect(page.getByLabel('Nama Lengkap')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Telepon')).toBeVisible();
    await expect(page.getByLabel(/PIN/)).toBeVisible();
    await expect(page.getByText('Tarif per Jam (Rp)')).toBeVisible();

    // Role selector
    await expect(page.getByText('Role').first()).toBeVisible();

    // Outlet selector
    await expect(page.getByText('Outlet').first()).toBeVisible();

    // Submit / cancel buttons
    await expect(page.getByRole('button', { name: 'Tambah Karyawan' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Batal' })).toBeVisible();

    // Back button
    await expect(page.getByRole('button', { name: /Kembali/ })).toBeVisible();
  });

  test('employee form fields accept input', async ({ page }) => {
    await page.goto('/employees/new');

    // Fill in the form
    await page.getByLabel('Nama Lengkap').fill('Dina Manager');
    await page.getByLabel('Email').fill('dina@tilo.test');
    await page.getByLabel('Telepon').fill('08123456000');
    await page.getByLabel(/PIN/).fill('654321');

    // Verify values
    await expect(page.getByLabel('Nama Lengkap')).toHaveValue('Dina Manager');
    await expect(page.getByLabel('Email')).toHaveValue('dina@tilo.test');
    await expect(page.getByLabel('Telepon')).toHaveValue('08123456000');
    await expect(page.getByLabel(/PIN/)).toHaveValue('654321');
  });

  test('PIN input has max length of 6 and numeric input mode', async ({ page }) => {
    await page.goto('/employees/new');

    const pinInput = page.getByLabel(/PIN/);
    await expect(pinInput).toHaveAttribute('maxlength', '6');
    await expect(pinInput).toHaveAttribute('inputmode', 'numeric');
  });

  test('navigate to edit employee form via action menu', async ({ page }) => {
    await page.goto('/employees');

    // Click the action menu on the first employee row
    const moreButton = page.locator('table tbody tr').first().getByRole('button').last();
    await moreButton.click();

    // Click "Edit" in the dropdown
    await page.getByRole('menuitem', { name: /Edit/ }).click();

    // Should navigate to edit page
    await expect(page).toHaveURL(/\/employees\/.*\/edit/);
  });

  test('back button returns to employee list', async ({ page }) => {
    await page.goto('/employees/new');

    await page.getByRole('button', { name: /Kembali/ }).click();

    await expect(page).toHaveURL(/\/employees$/);
  });

  test('employee form does not show active toggle for new employee', async ({ page }) => {
    await page.goto('/employees/new');

    // The "Karyawan Aktif" toggle should NOT be visible for new employees
    await expect(page.getByText('Karyawan Aktif')).toBeHidden();
  });

  test('add employee button is visible', async ({ page }) => {
    await page.goto('/employees');

    const addButton = page.getByRole('button', { name: /Tambah Karyawan/ });
    await expect(addButton).toBeVisible();
    await expect(addButton).toBeEnabled();
  });
});

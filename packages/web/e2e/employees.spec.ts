import { test, expect } from '@playwright/test';
import { setAuthenticatedState } from './fixtures/auth.fixture';
import { setupApiMocks } from './fixtures/api-mocks';

test.describe('Employees CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await setAuthenticatedState(page);
  });

  test('employee list page loads with structure', async ({ page }) => {
    await page.goto('/app/employees');

    // Page header
    await expect(page.locator('h1').filter({ hasText: 'Karyawan' })).toBeVisible();
    await expect(page.getByText('Kelola daftar karyawan Anda')).toBeVisible();

    // Table headers should be visible
    await expect(page.getByRole('columnheader', { name: 'Nama' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Role' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
  });

  test('employee list has table structure', async ({ page }) => {
    await page.goto('/app/employees');
    await expect(page.locator('h1').filter({ hasText: 'Karyawan' })).toBeVisible();

    // Table should exist
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Table headers
    await expect(table.locator('thead')).toBeVisible();
  });

  test('employee list shows empty state or data', async ({ page }) => {
    await page.goto('/app/employees');
    await expect(page.locator('h1').filter({ hasText: 'Karyawan' })).toBeVisible();

    // Should show either employee data rows or empty state heading
    const emptyState = page.getByRole('heading', { name: 'Belum ada karyawan' });
    const employeeRow = page.locator('table tbody tr td').first();

    // Use .first() to avoid strict mode when both match (heading is inside td)
    await expect(emptyState.or(employeeRow).first()).toBeVisible({ timeout: 10000 });
  });

  test('search functionality works', async ({ page }) => {
    await page.goto('/app/employees');

    // Wait for page to load
    await expect(page.locator('h1').filter({ hasText: 'Karyawan' })).toBeVisible();

    const searchInput = page.getByPlaceholder('Cari karyawan...');
    await expect(searchInput).toBeVisible();

    // Type a search query
    await searchInput.fill('Jane');
    await expect(searchInput).toHaveValue('Jane');
  });

  test('role filter select is available', async ({ page }) => {
    await page.goto('/app/employees');

    // Wait for page to load
    await expect(page.locator('h1').filter({ hasText: 'Karyawan' })).toBeVisible();

    // Find role filter by its trigger button (Select components use button with role combobox)
    const roleFilterTrigger = page.locator('button[role="combobox"]').first();
    await expect(roleFilterTrigger).toBeVisible();

    // Open role filter
    await roleFilterTrigger.click();

    // Should show "Semua Role" option
    await expect(page.getByRole('option', { name: 'Semua Role' })).toBeVisible();
  });

  test('status filter select is available', async ({ page }) => {
    await page.goto('/app/employees');

    // Wait for page to load
    await expect(page.locator('h1').filter({ hasText: 'Karyawan' })).toBeVisible();

    // Status filter is the second combobox trigger
    const statusFilterTrigger = page.locator('button[role="combobox"]').nth(1);
    await expect(statusFilterTrigger).toBeVisible();

    // Open status filter
    await statusFilterTrigger.click();

    // Should show "Semua Status" option
    await expect(page.getByRole('option', { name: 'Semua Status' })).toBeVisible();
  });

  test('navigate to create employee form', async ({ page }) => {
    await page.goto('/app/employees');

    // Wait for page to load
    await expect(page.locator('h1').filter({ hasText: 'Karyawan' })).toBeVisible();

    // Click the "Tambah Karyawan" button
    await page.getByRole('button', { name: 'Tambah Karyawan', exact: true }).click();

    // Should navigate to the new employee form
    await expect(page).toHaveURL(/\/app\/employees\/new/);

    // Form page header
    await expect(page.locator('h1').filter({ hasText: 'Tambah Karyawan' })).toBeVisible();
  });

  test('employee create form has all required fields', async ({ page }) => {
    await page.goto('/app/employees/new');

    // Wait for page to load
    await expect(page.locator('h1').filter({ hasText: 'Tambah Karyawan' })).toBeVisible();

    // Employee information card
    await expect(page.getByText('Informasi Karyawan')).toBeVisible();

    // Field labels (text, not necessarily <label> elements)
    await expect(page.getByText('Nama Lengkap')).toBeVisible();
    await expect(page.getByText('Email').first()).toBeVisible();
    await expect(page.getByText('Telepon')).toBeVisible();
    await expect(page.getByText('PIN')).toBeVisible();
    await expect(page.getByText('Role').first()).toBeVisible();
    await expect(page.getByText('Outlet').first()).toBeVisible();
    await expect(page.getByText('Tarif per Jam (Rp)')).toBeVisible();

    // Submit / cancel buttons
    await expect(page.getByRole('button', { name: 'Tambah Karyawan' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Batal' })).toBeVisible();

    // Back button
    await expect(page.getByRole('button', { name: /Kembali/ })).toBeVisible();
  });

  test('employee form fields accept input', async ({ page }) => {
    await page.goto('/app/employees/new');

    // Wait for page to load
    await expect(page.locator('h1').filter({ hasText: 'Tambah Karyawan' })).toBeVisible();

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
    await page.goto('/app/employees/new');

    // Wait for page to load
    await expect(page.locator('h1').filter({ hasText: 'Tambah Karyawan' })).toBeVisible();

    const pinInput = page.getByLabel(/PIN/);
    await expect(pinInput).toHaveAttribute('maxlength', '6');
    await expect(pinInput).toHaveAttribute('inputmode', 'numeric');
  });

  test('add button navigates to create form', async ({ page }) => {
    await page.goto('/app/employees');
    await expect(page.locator('h1').filter({ hasText: 'Karyawan' })).toBeVisible();

    // Click "Tambah Karyawan" button
    await page.getByRole('button', { name: 'Tambah Karyawan', exact: true }).click();

    // Should navigate to create form
    await expect(page).toHaveURL(/\/app\/employees\/new/);
    await expect(page.locator('h1').filter({ hasText: 'Tambah Karyawan' })).toBeVisible();
  });

  test('back button returns to employee list', async ({ page }) => {
    await page.goto('/app/employees/new');

    // Wait for page to load
    await expect(page.locator('h1').filter({ hasText: 'Tambah Karyawan' })).toBeVisible();

    await page.getByRole('button', { name: /Kembali/ }).click();

    await expect(page).toHaveURL(/\/app\/employees$/);
  });

  test('employee form does not show active toggle for new employee', async ({ page }) => {
    await page.goto('/app/employees/new');

    // Wait for page to load
    await expect(page.locator('h1').filter({ hasText: 'Tambah Karyawan' })).toBeVisible();

    // The "Karyawan Aktif" toggle should NOT be visible for new employees
    await expect(page.getByText('Karyawan Aktif')).toBeHidden();
  });

  test('add employee button is visible', async ({ page }) => {
    await page.goto('/app/employees');

    // Wait for page to load
    await expect(page.locator('h1').filter({ hasText: 'Karyawan' })).toBeVisible();

    const addButton = page.getByRole('button', { name: 'Tambah Karyawan', exact: true });
    await expect(addButton).toBeVisible();
    await expect(addButton).toBeEnabled();
  });
});

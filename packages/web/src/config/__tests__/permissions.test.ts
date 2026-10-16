import { describe, it, expect } from 'vitest';
import {
  canAccessPath,
  canManageRole,
  can,
  hasRole,
  homePathForRole,
  roleGroupForPath,
} from '../permissions';

describe('permissions', () => {
  it('owner and super_admin pass every non-platform group', () => {
    expect(hasRole('owner', 'STOCK')).toBe(true);
    expect(hasRole('owner', 'PLATFORM')).toBe(false);
    expect(hasRole('super_admin', 'PLATFORM')).toBe(true);
    expect(hasRole(undefined, 'ALL')).toBe(false);
  });

  it('resolves the most specific route key, including :param segments', () => {
    expect(roleGroupForPath('/app/products')).toBeUndefined();
    expect(roleGroupForPath('/app/products/new')).toBe('STOCK');
    expect(roleGroupForPath('/app/products/abc-123/edit')).toBe('STOCK');
    expect(roleGroupForPath('/app/inventory/stock')).toBe('STOCK');
    expect(roleGroupForPath('/app/inventory/product-assignment')).toBe('MANAGEMENT');
    expect(roleGroupForPath('/app/inventory/stock-opname/xyz')).toBe('STOCK_COUNT');
    expect(roleGroupForPath('/app/promotions/vouchers')).toBe('MANAGEMENT');
    expect(roleGroupForPath('/app/promotions/p1/edit')).toBe('MANAGEMENT');
    expect(roleGroupForPath('/app/promotions')).toBe('FRONT_OF_HOUSE');
    expect(roleGroupForPath('/pos')).toBe('FRONT_OF_HOUSE');
    expect(roleGroupForPath('/app/settings/tax?x=1')).toBe('MANAGEMENT');
  });

  it('mirrors backend @Roles for key pages', () => {
    // SettlementsController: owner, manager
    expect(canAccessPath('supervisor', '/app/settlements')).toBe(false);
    expect(canAccessPath('manager', '/app/settlements')).toBe(true);
    // /reports/*: owner, manager, supervisor
    expect(canAccessPath('cashier', '/app/reports/sales')).toBe(false);
    expect(canAccessPath('supervisor', '/app/reports')).toBe(true);
    // kitchen/inventory cannot sell
    expect(canAccessPath('kitchen', '/pos')).toBe(false);
    expect(canAccessPath('inventory', '/pos')).toBe(false);
    expect(canAccessPath('cashier', '/pos')).toBe(true);
    // AuditController: owner, manager
    expect(canAccessPath('manager', '/app/audit')).toBe(true);
    // Open pages
    expect(canAccessPath('kitchen', '/app/profile')).toBe(true);
    expect(canAccessPath(undefined, '/app/profile')).toBe(false);
  });

  it('gates narrower in-page actions', () => {
    expect(can('manager', 'subscription.manage')).toBe(false);
    expect(can('owner', 'subscription.manage')).toBe(true);
    expect(can('supervisor', 'customers.write')).toBe(true);
    expect(can('supervisor', 'customers.import')).toBe(false);
    // POST /customers allows cashier; PUT/DELETE do not
    expect(can('cashier', 'customers.create')).toBe(true);
    expect(can('cashier', 'customers.write')).toBe(false);
    expect(canAccessPath('cashier', '/app/customers/new')).toBe(true);
    expect(canAccessPath('cashier', '/app/customers/abc/edit')).toBe(false);
    // Owner-only since round 1: PUT /business/type, POST /onboarding/setup, PUT /settings/business
    expect(can('manager', 'businessType.migrate')).toBe(false);
    expect(can('manager', 'onboarding.setup')).toBe(false);
    expect(can('manager', 'business.edit')).toBe(false);
    expect(can('owner', 'onboarding.setup')).toBe(true);
    // GET /reports/financial: owner, manager
    expect(can('supervisor', 'reports.financial')).toBe(false);
  });

  it('sends non-dashboard roles to their working screen', () => {
    expect(homePathForRole('cashier')).toBe('/pos');
    expect(homePathForRole('kitchen')).toBe('/kds');
    expect(homePathForRole('inventory')).toBe('/app/inventory/stock');
    expect(homePathForRole('manager')).toBe('/app');
    // the home path of every role must be accessible to that role
    for (const role of ['owner', 'manager', 'supervisor', 'cashier', 'kitchen', 'inventory']) {
      expect(canAccessPath(role, homePathForRole(role))).toBe(true);
    }
  });

  it('canManageRole matches backend hierarchy', () => {
    expect(canManageRole('manager', 'supervisor')).toBe(true);
    expect(canManageRole('manager', 'manager')).toBe(false);
    expect(canManageRole('manager', 'owner')).toBe(false);
    expect(canManageRole('owner', 'manager')).toBe(true);
  });
});

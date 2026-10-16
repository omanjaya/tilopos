import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from '../../client';
import { customersApi } from '../customers.api';
import {
  promotionsApi,
  businessDayStartIso,
  businessDayEndIso,
  toBusinessDateInput,
} from '../promotions.api';
import { bundlePackagesApi } from '../bundle-packages.api';

const get = vi.mocked(apiClient.get);

beforeEach(() => {
  get.mockReset();
});

describe('promotion business-day helpers', () => {
  it('maps a business date to 00:00 and 23:59:59.999 WIB', () => {
    expect(businessDayStartIso('2026-01-31')).toBe('2026-01-30T17:00:00.000Z');
    expect(businessDayEndIso('2026-01-31')).toBe('2026-01-31T16:59:59.999Z');
  });

  it('round-trips ISO timestamps back to the WIB date', () => {
    expect(toBusinessDateInput('2026-01-30T17:00:00.000Z')).toBe('2026-01-31');
    expect(toBusinessDateInput('2026-01-31T16:59:59.999Z')).toBe('2026-01-31');
  });
});

describe('promotionsApi.getLoyaltyProgram', () => {
  it('returns null when the business has no program', async () => {
    get.mockResolvedValueOnce({ data: { program: null, tiers: [] } });
    await expect(promotionsApi.getLoyaltyProgram()).resolves.toBeNull();
  });
});

describe('customersApi.listPaginated (server-side paging)', () => {
  it('sends page/limit/search and maps { data, meta }', async () => {
    get.mockResolvedValueOnce({
      data: {
        data: [{ id: '2', name: 'Ani', email: 'ani@x.id', phone: null, totalSpent: '300', loyaltyPoints: 0, visitCount: 2 }],
        meta: { page: 2, limit: 1, total: 3, totalPages: 3 },
      },
    });
    const res = await customersApi.listPaginated({ page: 2, limit: 1, search: ' an ' });
    expect(get).toHaveBeenCalledWith('/customers', { params: { page: 2, limit: 1, search: 'an' } });
    expect(res.total).toBe(3);
    expect(res.totalPages).toBe(3);
    expect(res.data[0]?.totalSpent).toBe(300);
  });

  it('throws instead of returning [] on an unexpected shape', async () => {
    get.mockResolvedValueOnce({ data: { error: 'x' } });
    await expect(customersApi.list()).rejects.toThrow();
  });
});

describe('bundlePackagesApi.get', () => {
  it('converts Decimal strings to numbers so edits re-submit numbers', async () => {
    get.mockResolvedValueOnce({
      data: { id: 'b1', price: '25000.00', costPrice: '10000.00', items: [{ quantity: '2.000' }], outlets: [] },
    });
    const b = await bundlePackagesApi.get('b1');
    expect(b.price).toBe(25000);
    expect(b.costPrice).toBe(10000);
    expect(b.items[0]?.quantity).toBe(2);
  });
});

describe('reportsApi cost metrics for roles without cost access', () => {
  it('keeps null grossProfit/grossMargin/totalValue instead of coercing to 0', async () => {
    const { reportsApi } = await import('../reports.api');
    get.mockResolvedValueOnce({ data: { grossSales: 100, netSales: 90, grossProfit: null, grossMargin: null } });
    const summary = await reportsApi.dashboardSummary({ outletId: 'o1', startDate: '2026-01-01', endDate: '2026-01-31' });
    expect(summary.grossProfit).toBeNull();
    expect(summary.grossMargin).toBeNull();

    get.mockResolvedValueOnce({ data: { totalItems: 1, lowStockItems: 0, outOfStockItems: 0, totalValue: null, items: [] } });
    const inv = await reportsApi.inventory({ outletId: 'o1' });
    expect(inv.totalValue).toBeNull();
  });
});

describe('auditApi.list', () => {
  it('sends page/limit (max 100)', async () => {
    const { auditApi } = await import('../audit.api');
    get.mockResolvedValueOnce({ data: [] });
    await auditApi.list({ page: 2 });
    expect(get).toHaveBeenCalledWith('/audit', { params: { page: 2, limit: 100, startDate: undefined, endDate: undefined } });
  });
});

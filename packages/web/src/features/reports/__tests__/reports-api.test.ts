import { describe, it, expect, vi, beforeEach } from 'vitest';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/api/client', () => ({ apiClient: { get } }));

import { reportsApi } from '@/api/endpoints/reports.api';
import { reportDateParams } from '../report-date-params';

const params = { outletId: 'o1', dateRange: 'this_month' as const };

describe('reportsApi', () => {
  beforeEach(() => get.mockReset());

  it('maps the backend kitchen report shape (summary/itemsPreparedByProduct)', async () => {
    get.mockResolvedValue({
      data: {
        period: { start: 'a', end: 'b' },
        summary: { totalOrders: 4, completedOrders: 3, avgPrepTimeMinutes: 7.5, slaAdherenceRate: 75 },
        peakHours: [{ hour: 12, orderCount: 3 }],
        itemsPreparedByProduct: [{ productId: 'p', productName: 'Nasi', totalPrepared: 5 }],
        stations: [],
        orderStatusBreakdown: [],
      },
    });
    const r = await reportsApi.kitchen(params);
    expect(r.summary.totalOrders).toBe(4);
    expect(r.summary.avgPrepTimeMinutes).toBe(7.5);
    expect(r.peakHours[0]?.orderCount).toBe(3);
    expect(r.itemsPreparedByProduct[0]?.productName).toBe('Nasi');
  });

  it('maps the backend inventory report shape', async () => {
    get.mockResolvedValue({ data: { totalItems: 2, lowStockItems: 1, outOfStockItems: 0, totalValue: 5000, items: [] } });
    const r = await reportsApi.inventory({ outletId: 'o1' });
    expect(r).toMatchObject({ totalItems: 2, lowStockItems: 1, totalValue: 5000 });
  });

  it('surfaces failures instead of resolving an all-zero report', async () => {
    get.mockResolvedValue({ data: [] });
    await expect(reportsApi.sales(params)).rejects.toThrow();
    await expect(reportsApi.products(params)).rejects.toThrow();
    await expect(reportsApi.paymentMethods(params)).rejects.toThrow();
  });
});

describe('reportDateParams', () => {
  it('sends local YYYY-MM-DD dates and waits for a complete custom range', () => {
    const from = new Date(2026, 8, 1, 0, 0, 0);
    const to = new Date(2026, 8, 30, 0, 0, 0);
    expect(reportDateParams('custom', { from, to })).toEqual({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      ready: true,
    });
    expect(reportDateParams('custom', { from, to: undefined }).ready).toBe(false);
    expect(reportDateParams('today').ready).toBe(true);
  });
});

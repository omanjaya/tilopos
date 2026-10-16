import { describe, it, expect, vi, beforeEach } from 'vitest';

const { post, get } = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('@/api/client', () => ({ apiClient: { post, get } }));

import { transactionsApi } from '@/api/endpoints/transactions.api';

describe('transactionsApi contract', () => {
  beforeEach(() => {
    post.mockReset().mockResolvedValue({ data: {} });
    get.mockReset();
  });

  it('refund sends exactly the ProcessRefundDto fields', async () => {
    await transactionsApi.refund({
      transactionId: 't1',
      items: [{ transactionItemId: 'ti1', quantity: 2, reason: 'customer_request' }],
      refundMethod: 'cash',
      notes: 'rusak',
    });
    expect(post).toHaveBeenCalledWith('/pos/refunds', {
      transactionId: 't1',
      items: [{ transactionItemId: 'ti1', quantity: 2, reason: 'customer_request' }],
      refundMethod: 'cash',
      notes: 'rusak',
    });
    const body = post.mock.calls[0]![1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('reason');
  });

  it('listPaginated passes the server page (totalPages, summary) and drops unsupported sort params', async () => {
    const summary = { count: 45, grandTotal: 900000, netSales: 800000 };
    get.mockResolvedValue({ data: { data: [], total: 45, page: 1, limit: 20, totalPages: 3, summary } });
    const res = await transactionsApi.listPaginated({
      page: 1,
      limit: 20,
      sortBy: 'totalAmount',
      sortOrder: 'asc',
      startDate: '2026-09-27',
      endDate: '2026-09-27',
    });
    expect(res.totalPages).toBe(3);
    expect(res.summary).toEqual(summary);
    const params = get.mock.calls[0]![1].params;
    expect(params).not.toHaveProperty('sortBy');
    expect(params.startDate).toBe('2026-09-27');
  });

  it('get returns the mapped DTO of GET /pos/transactions/:id in one call', async () => {
    const dto = { id: 't1', transactionNumber: 'TRX-1', items: [], payments: [] };
    get.mockResolvedValue({ data: dto });
    const tx = await transactionsApi.get('t1');
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/pos/transactions/t1');
    expect(tx).toBe(dto);
  });
});

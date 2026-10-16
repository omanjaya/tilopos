import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
const put = vi.fn();
const del = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: {
    get: (...a: unknown[]) => get(...a),
    put: (...a: unknown[]) => put(...a),
    delete: (...a: unknown[]) => del(...a),
  },
}));

import { inventoryApi } from '@/api/endpoints/inventory.api';

describe('inventoryApi contracts', () => {
  beforeEach(() => {
    get.mockReset();
    put.mockReset();
    del.mockReset();
  });

  it('maps stock rows (quantity/lowStockAlert, product + variant names)', async () => {
    get.mockResolvedValue({
      data: [
        {
          id: 's1',
          outletId: 'o1',
          productId: 'p1',
          variantId: 'v1',
          quantity: 3,
          lowStockAlert: 5,
          updatedAt: '2026-09-01T00:00:00Z',
          product: { id: 'p1', name: 'Kopi', sku: 'KOPI' },
          variant: { id: 'v1', name: 'Large', sku: 'KOPI-L' },
        },
      ],
    });
    const [row] = await inventoryApi.getStockLevels('o1');
    expect(row).toMatchObject({
      productName: 'Kopi',
      variantName: 'Large',
      sku: 'KOPI-L',
      currentStock: 3,
      minStock: 5,
    });
  });

  it('throws on a non-array stock response instead of showing an empty list', async () => {
    get.mockResolvedValue({ data: { data: [], total: 0 } });
    await expect(inventoryApi.getStockLevels('o1')).rejects.toThrow();
  });

  it('receiveTransfer sends per-item quantities, or an empty body for a full receipt', async () => {
    put.mockResolvedValue({ data: {} });
    await inventoryApi.receiveTransfer('t1', [{ stockTransferItemId: 'i1', quantityReceived: 2 }]);
    expect(put).toHaveBeenLastCalledWith('/stock-transfers/t1/receive', {
      items: [{ stockTransferItemId: 'i1', quantityReceived: 2 }],
    });
    await inventoryApi.receiveTransfer('t1');
    expect(put).toHaveBeenLastCalledWith('/stock-transfers/t1/receive', {});
  });

  it('approvePurchaseOrder never sends approvedBy (approver = JWT user)', async () => {
    put.mockResolvedValue({ data: {} });
    await inventoryApi.approvePurchaseOrder('po1');
    expect(put).toHaveBeenLastCalledWith('/suppliers/purchase-orders/po1/approve', {});
    await inventoryApi.approvePurchaseOrder('po1', 'ok');
    expect(put).toHaveBeenLastCalledWith('/suppliers/purchase-orders/po1/approve', { notes: 'ok' });
  });

  it('maps purchase-order supplier and outlet names from the relations', async () => {
    get.mockResolvedValue({
      data: [
        {
          id: 'po1',
          poNumber: 'PO-1',
          supplierId: 's1',
          outletId: 'o1',
          status: 'partial',
          totalAmount: '150000.00',
          supplier: { id: 's1', name: 'Sumber Jaya' },
          outlet: { id: 'o1', name: 'Pusat' },
          items: [],
        },
      ],
    });
    const [po] = await inventoryApi.listPurchaseOrders();
    expect(po).toMatchObject({ supplierName: 'Sumber Jaya', outletName: 'Pusat', totalAmount: 150000 });
  });

  it('removes outlet products with one bulk DELETE', async () => {
    del.mockResolvedValue({ data: { removed: 2 } });
    const res = await inventoryApi.removeProductsFromOutlet('o1', ['p1', 'p2']);
    expect(del).toHaveBeenCalledWith('/inventory/outlets/o1/products', { data: { productIds: ['p1', 'p2'] } });
    expect(res.removed).toBe(2);
  });
});

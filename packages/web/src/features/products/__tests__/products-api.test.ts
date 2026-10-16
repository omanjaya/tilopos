import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
vi.mock('@/api/client', () => ({ apiClient: { get: (...a: unknown[]) => get(...a) } }));

import { productsApi, normalizeProduct } from '@/api/endpoints/products.api';
import type { Product } from '@/types/product.types';

function p(id: string, name: string, extra: Partial<Product> = {}): Product {
  return {
    id,
    name,
    sku: `SKU-${id}`,
    description: null,
    categoryId: null,
    category: null,
    basePrice: 1000,
    costPrice: 500,
    trackStock: true,
    imageUrl: null,
    isActive: true,
    variants: [],
    businessId: 'b1',
    createdAt: '',
    updatedAt: '',
    ...extra,
  };
}

describe('productsApi list helpers', () => {
  beforeEach(() => get.mockReset());

  it('coerces stray Decimal strings but keeps a null cost price (hidden/unset)', () => {
    const raw = p('1', 'A', {
      basePrice: '15000.00' as unknown as number,
      costPrice: null,
      variants: [{ id: 'v', name: 'L', sku: '', barcode: null, price: '2000' as unknown as number, costPrice: null, isActive: true }],
    });
    const n = normalizeProduct(raw);
    expect(n.basePrice).toBe(15000);
    expect(n.costPrice).toBeNull();
    expect(n.variants[0]!.price).toBe(2000);
    expect(n.variants[0]!.costPrice).toBeNull();
  });

  it('list sends search/category/sort to the server without page/limit (array response)', async () => {
    get.mockResolvedValue({ data: [p('1', 'Nasi Goreng')] });
    const res = await productsApi.list({ search: ' nasi ', categoryId: 'c1', sortBy: 'basePrice', sortOrder: 'asc' });
    expect(res.map((x) => x.id)).toEqual(['1']);
    expect(get).toHaveBeenCalledWith('/inventory/products', {
      params: { search: 'nasi', categoryId: 'c1', sortBy: 'basePrice', sortOrder: 'asc' },
    });
  });

  it('listPaginated sends page/limit and passes the paginated response through', async () => {
    get.mockResolvedValue({ data: { data: [p('1', 'A')], total: 40, page: 2, limit: 1, totalPages: 40 } });
    const res = await productsApi.listPaginated({ outletId: 'o1', page: 2, limit: 1 });
    expect(get).toHaveBeenCalledWith('/inventory/outlets/o1/products', { params: { page: 2, limit: 1 } });
    expect(res.total).toBe(40);
    expect(res.data).toHaveLength(1);
  });

  it('drops sort fields the backend rejects and caps limit at 100', async () => {
    get.mockResolvedValue({ data: { data: [], total: 0, page: 1, limit: 100, totalPages: 1 } });
    await productsApi.listPaginated({ sortBy: 'sku', page: 1, limit: 500 });
    expect(get).toHaveBeenCalledWith('/inventory/products', { params: { page: 1, limit: 100 } });
  });

  it('rejects an unexpected response shape instead of rendering an empty list', async () => {
    get.mockResolvedValue({ data: { message: 'oops' } });
    await expect(productsApi.list()).rejects.toThrow();
  });
});

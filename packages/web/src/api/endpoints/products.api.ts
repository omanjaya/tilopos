import { apiClient } from '../client';
import type { PaginationParams, PaginatedResponse } from '@/types/api.types';
import type {
  Product,
  ProductVariant,
  CreateProductRequest,
  UpdateProductRequest,
  CreateVariantRequest,
  UpdateVariantRequest,
  DeleteVariantResponse,
  BulkUpdateProductsRequest,
  BulkUpdateProductsResponse,
  BulkDeleteProductsRequest,
  BulkDeleteProductsResponse,
} from '@/types/product.types';

/**
 * Body for PUT /inventory/products/:id. Variants are managed through the
 * /variants sub-resource and are never sent here; `imageUrl: null` clears the image.
 */
export type ProductUpdatePayload = Omit<UpdateProductRequest, 'imageUrl' | 'variants' | 'categoryId'> & {
  imageUrl?: string | null;
  categoryId?: string | null;
};

/** sortBy must be one of the backend PRODUCT_SORT_FIELDS (else 400). */
export type ProductSortField = 'name' | 'basePrice' | 'createdAt';
const SORT_FIELDS: readonly string[] = ['name', 'basePrice', 'createdAt'];

/** Product.isActive filter; the backend honours inactive/all only for owner/manager/inventory. */
export type ProductStatusFilter = 'active' | 'inactive' | 'all';

type ProductListParams = PaginationParams & {
  categoryId?: string;
  outletId?: string;
  status?: ProductStatusFilter;
};

/**
 * All product endpoints serialize Decimals as numbers and send `costPrice: null`
 * to roles that may not see cost (or when unset). This only guards the Product
 * type against a stray string/undefined; `null` cost is kept (never coerced to 0).
 */
function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toNullableNum(v: unknown): number | null {
  return v === null || v === undefined || v === '' ? null : toNum(v);
}

export function normalizeProduct(p: Product): Product {
  return {
    ...p,
    basePrice: toNum(p.basePrice),
    costPrice: toNullableNum(p.costPrice),
    variants: (p.variants ?? []).map((v) => ({
      ...v,
      price: toNum(v.price),
      costPrice: toNullableNum(v.costPrice),
    })),
  };
}

/**
 * GET /inventory/products (or /inventory/outlets/:id/products) filters by
 * search/categoryId and sorts server-side. Without page/limit it returns a
 * plain array (cap 5000); with page or limit it returns a PaginatedResponse.
 */
function listQuery(params: ProductListParams | undefined, paged: boolean) {
  const { outletId, page, limit, search, categoryId, sortBy, sortOrder, status } = params ?? {};
  const url = outletId ? `/inventory/outlets/${outletId}/products` : '/inventory/products';
  const query: Record<string, string | number> = {};
  const q = search?.trim();
  if (q) query.search = q;
  if (categoryId) query.categoryId = categoryId;
  if (status && status !== 'active') query.status = status;
  if (sortBy && SORT_FIELDS.includes(sortBy)) {
    query.sortBy = sortBy;
    if (sortOrder) query.sortOrder = sortOrder;
  }
  if (paged) {
    query.page = page && page > 0 ? page : 1;
    query.limit = Math.min(limit && limit > 0 ? limit : 20, 100);
  }
  return { url, query };
}

export const productsApi = {
  list: (params?: ProductListParams): Promise<Product[]> => {
    const { url, query } = listQuery(params, false);
    return apiClient.get<unknown>(url, { params: query }).then((r) => {
      if (!Array.isArray(r.data)) throw new Error('Respons daftar produk tidak valid');
      return (r.data as Product[]).map(normalizeProduct);
    });
  },

  listPaginated: (params?: ProductListParams): Promise<PaginatedResponse<Product>> => {
    const { url, query } = listQuery(params, true);
    return apiClient.get<PaginatedResponse<Product>>(url, { params: query }).then((r) => {
      const d = r.data;
      if (!d || !Array.isArray(d.data)) throw new Error('Respons daftar produk tidak valid');
      return { ...d, data: d.data.map(normalizeProduct) };
    });
  },

  get: (id: string) =>
    apiClient.get<Product>(`/inventory/products/${id}`).then((r) => normalizeProduct(r.data)),

  create: (data: CreateProductRequest) =>
    apiClient.post<Product>('/inventory/products', data).then((r) => normalizeProduct(r.data)),

  update: (id: string, data: ProductUpdatePayload) =>
    apiClient.put<Product>(`/inventory/products/${id}`, data).then((r) => normalizeProduct(r.data)),

  delete: (id: string) =>
    apiClient.delete(`/inventory/products/${id}`).then((r) => r.data),

  // Variant CRUD
  addVariant: (productId: string, data: CreateVariantRequest) =>
    apiClient.post<ProductVariant>(`/inventory/products/${productId}/variants`, data).then((r) => r.data),

  updateVariant: (productId: string, variantId: string, data: UpdateVariantRequest) =>
    apiClient.put<ProductVariant>(`/inventory/products/${productId}/variants/${variantId}`, data).then((r) => r.data),

  deleteVariant: (productId: string, variantId: string) =>
    apiClient.delete<DeleteVariantResponse>(`/inventory/products/${productId}/variants/${variantId}`).then((r) => r.data),

  // Bulk Operations
  bulkUpdate: (data: BulkUpdateProductsRequest) =>
    apiClient.patch<BulkUpdateProductsResponse>('/inventory/products/bulk', data).then((r) => r.data),

  bulkDelete: (data: BulkDeleteProductsRequest) =>
    apiClient.delete<BulkDeleteProductsResponse>('/inventory/products/bulk', { data }).then((r) => r.data),
};

import { apiClient } from '../client';
import type { PaginationParams } from '@/types/api.types';
import type {
  Product,
  ProductVariant,
  CreateProductRequest,
  UpdateProductRequest,
  CreateVariantRequest,
  UpdateVariantRequest,
  DeleteVariantResponse,
} from '@/types/product.types';

export const productsApi = {
  list: (params?: PaginationParams & { categoryId?: string; outletId?: string }) => {
    if (params?.outletId) {
      const { outletId, ...rest } = params;
      return apiClient
        .get<Product[]>(`/inventory/outlets/${outletId}/products`, { params: rest })
        .then((r) => r.data);
    }
    return apiClient.get<Product[]>('/inventory/products', { params }).then((r) => r.data);
  },

  get: (id: string) =>
    apiClient.get<Product>(`/inventory/products/${id}`).then((r) => r.data),

  create: (data: CreateProductRequest) =>
    apiClient.post<Product>('/inventory/products', data).then((r) => r.data),

  update: (id: string, data: UpdateProductRequest) =>
    apiClient.put<Product>(`/inventory/products/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/inventory/products/${id}`).then((r) => r.data),

  // Variant CRUD
  addVariant: (productId: string, data: CreateVariantRequest) =>
    apiClient.post<ProductVariant>(`/inventory/products/${productId}/variants`, data).then((r) => r.data),

  updateVariant: (productId: string, variantId: string, data: UpdateVariantRequest) =>
    apiClient.put<ProductVariant>(`/inventory/products/${productId}/variants/${variantId}`, data).then((r) => r.data),

  deleteVariant: (productId: string, variantId: string) =>
    apiClient.delete<DeleteVariantResponse>(`/inventory/products/${productId}/variants/${variantId}`).then((r) => r.data),
};

import { apiClient } from '../client';
import type { PaginationParams } from '@/types/api.types';
import type { Product, CreateProductRequest, UpdateProductRequest } from '@/types/product.types';

export const productsApi = {
  list: (params?: PaginationParams & { categoryId?: string }) =>
    apiClient.get<Product[]>('/inventory/products', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Product>(`/inventory/products/${id}`).then((r) => r.data),

  create: (data: CreateProductRequest) =>
    apiClient.post<Product>('/inventory/products', data).then((r) => r.data),

  update: (id: string, data: UpdateProductRequest) =>
    apiClient.put<Product>(`/inventory/products/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/inventory/products/${id}`).then((r) => r.data),
};

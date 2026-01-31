import { apiClient } from '../client';
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from '@/types/product.types';

export const categoriesApi = {
  list: () =>
    apiClient.get<Category[]>('/inventory/categories').then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Category>(`/inventory/categories/${id}`).then((r) => r.data),

  create: (data: CreateCategoryRequest) =>
    apiClient.post<Category>('/inventory/categories', data).then((r) => r.data),

  update: (id: string, data: UpdateCategoryRequest) =>
    apiClient.put<Category>(`/inventory/categories/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/inventory/categories/${id}`).then((r) => r.data),
};

import { apiClient } from '../client';
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from '@/types/product.types';

export const categoriesApi = {
  list: () =>
    apiClient.get<Category[]>('/inventory/categories').then((r) => r.data),

  /**
   * Manager view: also returns inactive categories so they can be re-activated.
   * Honoured for owner/manager only; other roles silently get active categories.
   */
  listAll: () =>
    apiClient
      .get<Category[]>('/inventory/categories', { params: { includeInactive: true } })
      .then((r) => r.data),

  create: (data: CreateCategoryRequest) =>
    apiClient.post<Category>('/inventory/categories', data).then((r) => r.data),

  update: (id: string, data: UpdateCategoryRequest) =>
    apiClient.put<Category>(`/inventory/categories/${id}`, data).then((r) => r.data),
};

import { apiClient } from '../client';
import type {
  StockOpname,
  StockOpnameDetail,
  CreateStockOpnameRequest,
  UpdateOpnameItemRequest,
} from '@/types/stock-opname.types';

export const stockOpnameApi = {
  list: (params?: { outletId?: string; status?: string }) =>
    apiClient.get<StockOpname[]>('/inventory/stock-opname', { params }).then((r) => {
      const raw = r.data;
      return Array.isArray(raw) ? raw : [];
    }),

  getById: (id: string) =>
    apiClient.get<StockOpnameDetail>(`/inventory/stock-opname/${id}`).then((r) => r.data),

  create: (data: CreateStockOpnameRequest) =>
    apiClient.post<StockOpnameDetail>('/inventory/stock-opname', data).then((r) => r.data),

  updateItems: (id: string, items: UpdateOpnameItemRequest[]) =>
    apiClient.patch<StockOpnameDetail>(`/inventory/stock-opname/${id}/items`, { items }).then((r) => r.data),

  complete: (id: string) =>
    apiClient.post<StockOpnameDetail>(`/inventory/stock-opname/${id}/complete`).then((r) => r.data),

  cancel: (id: string) =>
    apiClient.post(`/inventory/stock-opname/${id}/cancel`).then((r) => r.data),
};

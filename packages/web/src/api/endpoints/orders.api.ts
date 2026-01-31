import { apiClient } from '../client';
import type { Order } from '@/types/order.types';

export const ordersApi = {
  list: (params?: { outletId?: string; status?: string }) =>
    apiClient.get<Order[]>('/orders', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Order>(`/orders/${id}`).then((r) => r.data),

  updateStatus: (id: string, status: string) =>
    apiClient.put(`/orders/${id}/status`, { status }).then((r) => r.data),
};

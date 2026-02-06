import { apiClient } from '../client';
import type { KDSOrder } from '@/types/kds.types';

export const kdsApi = {
  // Fetch all active orders (pending, preparing, ready) for kitchen display
  // Backend automatically excludes completed and cancelled orders
  getOrders: (outletId: string) =>
    apiClient
      .get<KDSOrder[]>('/orders', { params: { outletId } })
      .then((r) => r.data),

  bumpItem: (orderItemId: string) =>
    apiClient.post('/kds/bump', { orderItemId }).then((r) => r.data),

  updateOrderStatus: (orderId: string, status: string) =>
    apiClient.put(`/orders/${orderId}/status`, { status }).then((r) => r.data),

  notifyCashier: (orderId: string) =>
    apiClient.post(`/kds/orders/${orderId}/notify-ready`).then((r) => r.data),
};

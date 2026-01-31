import { apiClient } from '../client';
import type { KDSOrder } from '@/types/kds.types';

export const kdsApi = {
  getOrders: (outletId: string) =>
    apiClient
      .get<KDSOrder[]>('/orders', { params: { outletId, status: 'preparing' } })
      .then((r) => r.data),

  bumpItem: (orderItemId: string) =>
    apiClient.post('/kds/bump', { orderItemId }).then((r) => r.data),

  updateOrderStatus: (orderId: string, status: string) =>
    apiClient.patch(`/orders/${orderId}/status`, { status }).then((r) => r.data),

  notifyCashier: (orderId: string, outletId: string) =>
    apiClient.post('/kds/notify-ready', { orderId, outletId }).then((r) => r.data),
};

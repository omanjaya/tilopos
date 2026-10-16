import { apiClient } from '../client';
import type { Order, OrderStatus } from '@/types/order.types';

/** Statuses accepted by PUT /orders/:id/status (backend ORDER_STATUS_UPDATES). */
export type OrderStatusUpdate = 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed';

export interface ListOrdersParams {
  /** Omit to list every outlet the caller may access. */
  outletId?: string;
  /** Omit for active orders (pending → served); any OrderStatus narrows the list. */
  status?: OrderStatus;
  /** 1..200 (default 200). */
  limit?: number;
}

export const ordersApi = {
  /** GET /orders — records include tableName and customerName (no employeeName). */
  list: (params: ListOrdersParams = {}) =>
    apiClient.get<Order[]>('/orders', { params }).then((r) => r.data),

  /** GET /orders/:id — same shape as a list row (tableName, customerName, items). */
  get: (id: string) =>
    apiClient.get<Order>(`/orders/${id}`).then((r) => r.data),

  /** Forward transitions only (invalid transition → 409); cancellation must use `cancel`. */
  updateStatus: (id: string, status: OrderStatusUpdate) =>
    apiClient.put(`/orders/${id}/status`, { status }).then((r) => r.data),

  /** PUT /orders/:id/cancel — reason required (max 500 chars); frees the table. */
  cancel: (id: string, reason: string) =>
    apiClient.put(`/orders/${id}/cancel`, { reason }).then((r) => r.data),
};

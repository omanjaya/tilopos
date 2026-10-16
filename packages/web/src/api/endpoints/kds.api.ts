import { apiClient } from '../client';
import type { KDSOrder, KDSOrderItem, KDSOrderPriority, KDSOrderStatus } from '@/types/kds.types';

/** One flat order item from GET /kds/orders (backend StationOrderItem). */
export interface KdsStationOrderItem {
  id: string;
  orderId: string;
  orderNumber: string;
  productId: string | null;
  productName: string;
  quantity: number;
  station: string | null;
  status: string;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  tableId: string | null;
  orderType: string;
  /** Numeric order priority: 0 normal, 5 urgent, 10 vip. */
  priority: number;
  customerId: string | null;
  orderNotes: string | null;
  tableName: string | null;
  /** Order items carry no modifiers in the current schema (always []). */
  modifiers: unknown[];
}

/** GET /kds/orders response (backend GetStationOrdersResult). */
export interface KdsStationOrdersResponse {
  items: KdsStationOrderItem[];
  summary: {
    total: number;
    pending: number;
    preparing: number;
    ready: number;
    served: number;
    /** @deprecated same as `served`. */
    completed: number;
  };
}

function toPriority(priority: number): KDSOrderPriority {
  if (priority >= 10) return 'vip';
  if (priority >= 5) return 'urgent';
  return 'normal';
}

function toItemStatus(status: string): KDSOrderStatus {
  if (status === 'pending' || status === 'preparing' || status === 'ready') return status;
  // 'served' (delivered) and 'cancelled' only appear with includeCompleted
  return 'served';
}

/**
 * Groups the flat station items returned by the backend into the per-order
 * cards the KDS renders. Orders keep the backend ordering (priority desc,
 * then oldest first).
 */
export function groupStationItems(
  response: KdsStationOrdersResponse,
  now: number = Date.now(),
): KDSOrder[] {
  const orders = new Map<string, KDSOrder>();
  for (const item of response.items ?? []) {
    let order = orders.get(item.orderId);
    if (!order) {
      order = {
        id: item.orderId,
        orderNumber: item.orderNumber,
        tableName: item.tableName ?? null,
        orderType: item.orderType,
        items: [],
        createdAt: item.createdAt,
        elapsedMinutes: 0,
        priority: toPriority(item.priority),
      };
      orders.set(item.orderId, order);
    }
    if (new Date(item.createdAt).getTime() < new Date(order.createdAt).getTime()) {
      order.createdAt = item.createdAt;
    }
    const kdsItem: KDSOrderItem = {
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      notes: item.notes,
      modifiers: (item.modifiers ?? []).filter((m): m is string => typeof m === 'string'),
      status: toItemStatus(item.status),
    };
    order.items.push(kdsItem);
  }
  const result = Array.from(orders.values());
  for (const order of result) {
    order.elapsedMinutes = Math.max(
      0,
      Math.floor((now - new Date(order.createdAt).getTime()) / 60000),
    );
  }
  return result;
}

export const kdsApi = {
  /** Active (pending/preparing/ready) items for the outlet, grouped per order. */
  getOrders: (outletId: string) =>
    apiClient
      .get<KdsStationOrdersResponse>('/kds/orders', { params: { outletId } })
      .then((r) => groupStationItems(r.data)),

  /** POST /kds/bump — station is optional server-side (the item's own station is used). */
  bumpItem: (orderItemId: string) =>
    apiClient.post('/kds/bump', { orderItemId }).then((r) => r.data),

  notifyCashier: (orderId: string) =>
    apiClient.post(`/kds/orders/${orderId}/notify-ready`).then((r) => r.data),
};

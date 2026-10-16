/**
 * Real-time Hooks
 *
 * Feature-focused WebSocket hooks for real-time updates.
 * Each hook manages a specific domain (orders, inventory, notifications, etc.).
 */

// Core socket utilities
export { useSocket, useEffectiveOutletId } from './use-socket';
export { getSharedSocket, releaseSharedSocket, resolveRoom, acquireRoom, releaseRoom } from './socket.util';

// Feature-specific hooks
export { useRealtimeOrders } from './use-realtime-orders';
export { useRealtimeNotifications } from './use-realtime-notifications';
export { useRealtimeDeviceSync } from './use-realtime-device-sync';
export { useRealtimeSync } from './use-realtime-sync';

// Types
export type {
  OrderStatusEvent,
  StockChangedEvent,
  StockUpdatedEvent,
  TransferStatusEvent,
  QueueCustomerAddedEvent,
  QueueCustomerCalledEvent,
  QueueCustomerSeatedEvent,
  QueueEvent,
  TransactionCreatedEvent,
  ShiftEvent,
  ShiftSalesUpdateEvent,
  NotificationEvent,
  DeviceSyncStatusEvent,
  RoomOptions,
} from './types';

// Hook option types
export type { UseRealtimeOrdersOptions, UseRealtimeOrdersReturn } from './use-realtime-orders';
export type { UseRealtimeNotificationsOptions, UseRealtimeNotificationsReturn } from './use-realtime-notifications';
export type { UseRealtimeDeviceSyncOptions, UseRealtimeDeviceSyncReturn } from './use-realtime-device-sync';
export type { UseRealtimeSyncReturn } from './use-realtime-sync';
export type { UseSocketReturn } from './use-socket';

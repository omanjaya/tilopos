/**
 * Real-time WebSocket Event Types
 *
 * Type definitions for all real-time events emitted by the backend WebSocket server.
 */

// -------------------------------------------------------------------
// Order Events
// -------------------------------------------------------------------

export interface OrderStatusEvent {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  occurredOn: string;
}

// -------------------------------------------------------------------
// Inventory & Stock Events
// -------------------------------------------------------------------

export interface StockChangedEvent {
  outletId: string;
  productId: string;
  variantId: string | null;
  previousQuantity: number;
  newQuantity: number;
  occurredOn: string;
}

export interface StockUpdatedEvent {
  outletId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  occurredOn: string;
}

export interface TransferStatusEvent {
  transferId: string;
  sourceOutletId: string;
  destinationOutletId: string;
  businessId: string;
  previousStatus: string;
  newStatus: string;
  updatedBy: string;
  occurredOn: string;
}

// -------------------------------------------------------------------
// Queue / Waiting List Events
// -------------------------------------------------------------------

export interface QueueCustomerAddedEvent {
  outletId: string;
  customerId: string;
  customerName: string;
  partySize: number;
  position: number;
  estimatedWaitMinutes: number;
  occurredOn: string;
}

export interface QueueCustomerCalledEvent {
  outletId: string;
  customerId: string;
  customerName: string;
  tableId: string;
  tableName: string;
  occurredOn: string;
}

export interface QueueCustomerSeatedEvent {
  outletId: string;
  customerId: string;
  customerName: string;
  tableId: string;
  tableName: string;
  occurredOn: string;
}

export type QueueEvent =
  | QueueCustomerAddedEvent
  | QueueCustomerCalledEvent
  | QueueCustomerSeatedEvent;

// -------------------------------------------------------------------
// Transaction Events
// -------------------------------------------------------------------

export interface TransactionCreatedEvent {
  transactionId: string;
  transactionNumber: string;
  outletId: string;
  totalAmount: number;
  employeeName: string;
  occurredOn: string;
}

// -------------------------------------------------------------------
// Shift Events
// -------------------------------------------------------------------

export interface ShiftEvent {
  shiftId: string;
  employeeId: string;
  employeeName: string;
  outletId: string;
  occurredOn: string;
}

export interface ShiftSalesUpdateEvent {
  shiftId: string;
  totalSales: number;
  totalTransactions: number;
  occurredOn: string;
}

// -------------------------------------------------------------------
// Notification Events
// -------------------------------------------------------------------

export interface NotificationEvent {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

// -------------------------------------------------------------------
// Device Sync Events
// -------------------------------------------------------------------

export interface DeviceSyncStatusEvent {
  deviceId: string;
  deviceName: string;
  outletId: string;
  businessId: string;
  status: 'syncing' | 'synced' | 'failed' | 'offline';
  lastSyncTime: string | null;
  errorMessage: string | null;
  occurredOn: string;
}

// -------------------------------------------------------------------
// Room Configuration
// -------------------------------------------------------------------

export interface RoomOptions {
  businessId?: string;
  outletId?: string;
}

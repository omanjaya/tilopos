# Real-time WebSocket Hooks

Feature-focused React hooks for managing WebSocket connections and real-time updates in TiloPOS.

## Overview

This module provides a modular, type-safe approach to handling real-time events via Socket.io. The architecture uses a shared WebSocket connection with reference counting to optimize performance and prevent connection leaks.

## Architecture

```
realtime/
├── socket.util.ts              # Shared WebSocket connection utility
├── use-socket.ts               # Base hook for connection management
├── types.ts                    # TypeScript event types
├── use-realtime-orders.ts      # Order status updates
├── use-realtime-inventory.ts   # Stock & transfer updates
├── use-realtime-queue.ts       # Waiting list updates
├── use-realtime-transactions.ts # Transaction creation events
├── use-realtime-shifts.ts      # Shift start/end & sales updates
├── use-realtime-notifications.ts # Notification bell events
├── use-realtime-device-sync.ts  # Device sync status
├── use-realtime-sync.ts        # Combined sync hook (auto-updates stores)
└── index.ts                    # Public API exports
```

## Core Principles

### 1. Shared Connection

All hooks share a single WebSocket connection managed by `socket.util.ts`:

```typescript
// Reference counting ensures connection persists while any hook is active
const socket1 = getSharedSocket(); // refCount = 1, creates connection
const socket2 = getSharedSocket(); // refCount = 2, reuses connection
releaseSharedSocket(); // refCount = 1
releaseSharedSocket(); // refCount = 0, disconnects
```

### 2. Feature-Focused Hooks

Each hook manages events for a specific domain:

- **Orders**: `useRealtimeOrders`
- **Inventory**: `useRealtimeInventory`
- **Queue**: `useRealtimeQueue`
- **Transactions**: `useRealtimeTransactions`
- **Shifts**: `useRealtimeShifts`, `useRealtimeShiftSales`
- **Notifications**: `useRealtimeNotifications`
- **Device Sync**: `useRealtimeDeviceSync`
- **Combined Sync**: `useRealtimeSync`

### 3. Type Safety

All events are strongly typed in `types.ts`:

```typescript
export interface OrderStatusEvent {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  occurredOn: string;
}
```

## Usage

### Basic Example

```tsx
import { useRealtimeOrders } from '@/hooks/realtime';

function OrdersPage() {
  const { lastEvent, isConnected } = useRealtimeOrders({
    onStatusChanged: (event) => {
      console.log('Order status changed:', event);
      // Refetch orders or update UI
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  return (
    <div>
      <ConnectionIndicator connected={isConnected} />
      {lastEvent && <div>Last order: {lastEvent.orderId}</div>}
    </div>
  );
}
```

### Multiple Event Handlers

```tsx
import { useRealtimeInventory } from '@/hooks/realtime';

function InventoryPage() {
  const { lastStockEvent, lastTransferEvent, isConnected } = useRealtimeInventory({
    onStockChanged: (event) => {
      console.log('Stock changed:', event.productId, event.newQuantity);
    },
    onStockUpdated: (event) => {
      console.log('Stock updated:', event.productId);
    },
    onTransferStatusChanged: (event) => {
      console.log('Transfer status:', event.newStatus);
    }
  });

  return <div>...</div>;
}
```

### Global Sync (RealtimeProvider)

```tsx
import { useRealtimeSync } from '@/hooks/realtime';

function RealtimeProvider({ children }) {
  const { isConnected } = useRealtimeSync();

  // This hook auto-updates Zustand stores for:
  // - Transactions (useTransactionStore)
  // - Orders (useOrderStore)
  // - Inventory (useInventoryStore)

  return <>{children}</>;
}
```

### Queue Events with History

```tsx
import { useRealtimeQueue } from '@/hooks/realtime';

function QueueManagement() {
  const { queueEvents, isConnected } = useRealtimeQueue({
    onCustomerAdded: (event) => {
      toast.success(`${event.customerName} added to queue (position ${event.position})`);
    },
    onCustomerCalled: (event) => {
      toast.info(`${event.customerName} called to ${event.tableName}`);
    },
    onCustomerSeated: (event) => {
      toast.success(`${event.customerName} seated at ${event.tableName}`);
    }
  });

  return (
    <div>
      <h2>Recent Queue Events ({queueEvents.length})</h2>
      {queueEvents.map((event, i) => (
        <div key={i}>{JSON.stringify(event)}</div>
      ))}
    </div>
  );
}
```

### Device Sync Status Map

```tsx
import { useRealtimeDeviceSync } from '@/hooks/realtime';

function DevicesPage() {
  const { deviceStatuses, isConnected } = useRealtimeDeviceSync({
    onSyncStatus: (event) => {
      console.log(`Device ${event.deviceName}: ${event.status}`);
    }
  });

  return (
    <div>
      {Array.from(deviceStatuses.entries()).map(([deviceId, status]) => (
        <DeviceCard key={deviceId} status={status} />
      ))}
    </div>
  );
}
```

## API Reference

### `useSocket()`

Base hook for WebSocket connection management.

**Returns:**
- `socket`: MutableRefObject to Socket.io instance
- `isConnected`: boolean - connection status
- `joinRoom(room, options?)`: function - join WebSocket room
- `leaveRoom(room)`: function - leave WebSocket room

**Usage:**
```tsx
const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
```

---

### `useRealtimeOrders(options?)`

Listen for order status changes.

**Options:**
- `onStatusChanged?: (event: OrderStatusEvent) => void`

**Returns:**
- `lastEvent: OrderStatusEvent | null`
- `isConnected: boolean`

**Events:**
- `order:status_changed`

---

### `useRealtimeInventory(options?)`

Listen for inventory and transfer updates.

**Options:**
- `onStockChanged?: (event: StockChangedEvent) => void`
- `onStockUpdated?: (event: StockUpdatedEvent) => void`
- `onTransferStatusChanged?: (event: TransferStatusEvent) => void`

**Returns:**
- `lastStockEvent: StockChangedEvent | null`
- `lastTransferEvent: TransferStatusEvent | null`
- `isConnected: boolean`

**Events:**
- `inventory:stock_changed`
- `inventory:stock_updated`
- `transfer:status_changed`

---

### `useRealtimeQueue(options?)`

Listen for waiting list/queue events.

**Options:**
- `onCustomerAdded?: (event: QueueCustomerAddedEvent) => void`
- `onCustomerCalled?: (event: QueueCustomerCalledEvent) => void`
- `onCustomerSeated?: (event: QueueCustomerSeatedEvent) => void`

**Returns:**
- `queueEvents: QueueEvent[]` - last 50 events
- `isConnected: boolean`

**Events:**
- `queue:customer_added`
- `queue:customer_called`
- `queue:customer_seated`

---

### `useRealtimeTransactions(options?)`

Listen for transaction creation events. Auto-updates `useTransactionStore`.

**Options:**
- `onTransactionCreated?: (event: TransactionCreatedEvent) => void`

**Returns:**
- `lastEvent: TransactionCreatedEvent | null`
- `isConnected: boolean`

**Events:**
- `transaction:created`

---

### `useRealtimeShifts(options?)`

Listen for shift start/end events.

**Options:**
- `onShiftStarted?: (event: ShiftEvent) => void`
- `onShiftEnded?: (event: ShiftEvent) => void`

**Returns:**
- `lastEvent: ShiftEvent | null`
- `isConnected: boolean`

**Events:**
- `shift:started`
- `shift:ended`

---

### `useRealtimeShiftSales(options?)`

Listen for shift sales updates (for active shift banner).

**Options:**
- `onSalesUpdate?: (event: ShiftSalesUpdateEvent) => void`

**Returns:**
- `lastSalesEvent: ShiftSalesUpdateEvent | null`
- `isConnected: boolean`

**Events:**
- `shift:sales_updated`

---

### `useRealtimeNotifications(options?)`

Listen for notification bell events.

**Options:**
- `onNotification?: (event: NotificationEvent) => void`

**Returns:**
- `notifications: NotificationEvent[]` - last 50 notifications
- `isConnected: boolean`

**Events:**
- `notification:new`

---

### `useRealtimeDeviceSync(options?)`

Listen for device sync status updates.

**Options:**
- `onSyncStatus?: (event: DeviceSyncStatusEvent) => void`

**Returns:**
- `deviceStatuses: Map<string, DeviceSyncStatusEvent>`
- `isConnected: boolean`

**Events:**
- `device:sync-status`

---

### `useRealtimeSync()`

Combined hook that auto-updates all Zustand stores.

**Returns:**
- `isConnected: boolean`

**Auto-updates:**
- `useTransactionStore` (on `transaction:created`)
- `useOrderStore` (on `order:status_changed`)
- `useInventoryStore` (on `inventory:stock_changed`)

**Usage:**
```tsx
// Typically used in RealtimeProvider
function RealtimeProvider({ children }) {
  useRealtimeSync(); // Auto-syncs all stores
  return <>{children}</>;
}
```

## Event Types

All event types are exported from `types.ts`:

```typescript
import type {
  OrderStatusEvent,
  StockChangedEvent,
  TransactionCreatedEvent,
  NotificationEvent,
  // ... etc
} from '@/hooks/realtime';
```

## Room Membership

Hooks automatically join rooms based on user context:

- **Outlet-scoped events**: `outlet:${outletId}`
  - Orders, Inventory, Queue, Transactions, Shifts, Notifications

- **Business-scoped events**: `business:${businessId}`
  - Device Sync

Rooms are joined on mount and left on unmount.

## Connection Management

### Reference Counting

The shared socket uses reference counting:

```typescript
// Hook 1 mounts
useRealtimeOrders() // refCount = 1, socket connects

// Hook 2 mounts
useRealtimeInventory() // refCount = 2, socket reused

// Hook 1 unmounts
// refCount = 1, socket stays connected

// Hook 2 unmounts
// refCount = 0, socket disconnects
```

### Reconnection Strategy

Socket.io is configured with:
- `reconnection: true`
- `reconnectionAttempts: Infinity`
- `reconnectionDelay: 1000ms`
- `reconnectionDelayMax: 10000ms`

## Best Practices

### 1. Use Callback Refs

Callbacks are stored in refs to prevent unnecessary re-renders:

```tsx
// Good - callback changes don't trigger WebSocket re-subscription
const { lastEvent } = useRealtimeOrders({
  onStatusChanged: (event) => {
    // This can reference latest state/props
    handleStatusChange(event, currentFilter);
  }
});
```

### 2. Invalidate React Query Caches

```tsx
const queryClient = useQueryClient();

const { lastEvent } = useRealtimeOrders({
  onStatusChanged: () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }
});
```

### 3. Conditional Rendering Based on Connection

```tsx
const { isConnected } = useRealtimeOrders();

if (!isConnected) {
  return <ConnectionLostBanner />;
}
```

### 4. Combine Multiple Hooks for Complex Pages

```tsx
function KitchenDisplaySystem() {
  const { lastEvent: orderEvent } = useRealtimeOrders({
    onStatusChanged: refetchOrders
  });

  const { notifications } = useRealtimeNotifications({
    onNotification: showToast
  });

  const { lastSalesEvent } = useRealtimeShiftSales({
    onSalesUpdate: updateBanner
  });

  return <div>...</div>;
}
```

## Migration Guide

### From Old Monolithic Hook

**Before:**
```tsx
import { useRealtimeOrders } from '@/hooks/use-realtime';
```

**After:**
```tsx
// Option 1: Direct import (recommended)
import { useRealtimeOrders } from '@/hooks/realtime';

// Option 2: Backward compatible (still works)
import { useRealtimeOrders } from '@/hooks/use-realtime';
```

The old `use-realtime.ts` now re-exports from the new modular structure, so existing code continues to work without changes.

## Debugging

### Check Connection State

```tsx
import { getSocketState } from '@/hooks/realtime';

console.log(getSocketState());
// { connected: true, refCount: 3 }
```

### Enable Socket.io Debug Logs

```typescript
// In browser console
localStorage.debug = 'socket.io-client:*';
```

## Performance

### File Sizes

All files are under 200 lines for maintainability:

- `types.ts`: 155 lines (type definitions)
- `use-realtime-shifts.ts`: 147 lines (dual hooks)
- `use-realtime-sync.ts`: 105 lines (store integration)
- `use-realtime-inventory.ts`: 101 lines (3 events)
- `use-realtime-queue.ts`: 101 lines (3 events)
- Others: < 100 lines each

### Tree Shaking

Import only what you need:

```tsx
// Good - only imports necessary code
import { useRealtimeOrders } from '@/hooks/realtime';

// Also works - but imports more code
import { useRealtimeOrders, useRealtimeInventory } from '@/hooks/realtime';
```

## Environment Variables

WebSocket connection uses:

```env
VITE_WS_URL=http://localhost:3001  # WebSocket server URL
```

Default namespace: `/notifications`

## Testing

### Mock WebSocket in Tests

```tsx
import { vi } from 'vitest';
import * as socketUtil from '@/hooks/realtime/socket.util';

vi.spyOn(socketUtil, 'getSharedSocket').mockReturnValue({
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connected: true,
} as any);
```

### Test Event Handlers

```tsx
import { renderHook, act } from '@testing-library/react';
import { useRealtimeOrders } from '@/hooks/realtime';

test('calls onStatusChanged when order status changes', () => {
  const onStatusChanged = vi.fn();

  const { result } = renderHook(() =>
    useRealtimeOrders({ onStatusChanged })
  );

  // Simulate event
  act(() => {
    mockSocket.emit('order:status_changed', {
      orderId: '1',
      previousStatus: 'pending',
      newStatus: 'preparing',
      occurredOn: new Date().toISOString(),
    });
  });

  expect(onStatusChanged).toHaveBeenCalledTimes(1);
});
```

## Troubleshooting

### Connection Not Establishing

1. Check `VITE_WS_URL` environment variable
2. Verify backend WebSocket server is running
3. Check JWT token in localStorage: `localStorage.getItem('token')`
4. Check browser console for Socket.io errors

### Events Not Received

1. Verify room membership: check `joinRoom` calls
2. Confirm user has `outletId` or `businessId` in auth context
3. Check backend is emitting events to correct rooms
4. Enable Socket.io debug logs

### Memory Leaks

If you see stale data or growing memory usage:

1. Ensure hooks are properly unmounting
2. Check `releaseSharedSocket()` is called in cleanup
3. Verify event listeners are removed in cleanup functions

## License

Internal use only - TiloPOS project.

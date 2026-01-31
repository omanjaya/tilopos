import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';
import { useTransactionStore } from '@/stores/transaction.store';
import { useOrderStore } from '@/stores/order.store';
import { useInventoryStore } from '@/stores/inventory.store';

// -------------------------------------------------------------------
// Core socket hook
// -------------------------------------------------------------------

const SOCKET_URL = import.meta.env.VITE_WS_URL || '';
const SOCKET_NAMESPACE = '/notifications';

let sharedSocket: Socket | null = null;
let refCount = 0;

function getSharedSocket(): Socket {
  if (!sharedSocket) {
    const token = localStorage.getItem('token');
    sharedSocket = io(`${SOCKET_URL}${SOCKET_NAMESPACE}`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      auth: token ? { token } : undefined,
    });
  }
  refCount++;
  return sharedSocket;
}

function releaseSharedSocket(): void {
  refCount--;
  if (refCount <= 0 && sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
    refCount = 0;
  }
}

/**
 * Base hook that manages Socket.io connection and room membership.
 */
function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const socket = getSharedSocket();
    socketRef.current = socket;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      releaseSharedSocket();
      socketRef.current = null;
    };
  }, []);

  const joinRoom = useCallback((room: string, options?: { businessId?: string; outletId?: string }) => {
    socketRef.current?.emit('joinRoom', {
      room,
      businessId: options?.businessId || user?.businessId,
      outletId: options?.outletId || user?.outletId,
    });
  }, [user?.businessId, user?.outletId]);

  const leaveRoom = useCallback((room: string) => {
    socketRef.current?.emit('leaveRoom', { room });
  }, []);

  return { socket: socketRef, isConnected, joinRoom, leaveRoom };
}

// -------------------------------------------------------------------
// Event data types
// -------------------------------------------------------------------

interface OrderStatusEvent {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  occurredOn: string;
}

interface StockChangedEvent {
  outletId: string;
  productId: string;
  variantId: string | null;
  previousQuantity: number;
  newQuantity: number;
  occurredOn: string;
}

interface StockUpdatedEvent {
  outletId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  occurredOn: string;
}

interface TransferStatusEvent {
  transferId: string;
  sourceOutletId: string;
  destinationOutletId: string;
  businessId: string;
  previousStatus: string;
  newStatus: string;
  updatedBy: string;
  occurredOn: string;
}

interface QueueCustomerAddedEvent {
  outletId: string;
  customerId: string;
  customerName: string;
  partySize: number;
  position: number;
  estimatedWaitMinutes: number;
  occurredOn: string;
}

interface QueueCustomerCalledEvent {
  outletId: string;
  customerId: string;
  customerName: string;
  tableId: string;
  tableName: string;
  occurredOn: string;
}

interface QueueCustomerSeatedEvent {
  outletId: string;
  customerId: string;
  customerName: string;
  tableId: string;
  tableName: string;
  occurredOn: string;
}

interface TransactionCreatedEvent {
  transactionId: string;
  transactionNumber: string;
  outletId: string;
  totalAmount: number;
  employeeName: string;
  occurredOn: string;
}

interface ShiftEvent {
  shiftId: string;
  employeeId: string;
  employeeName: string;
  outletId: string;
  occurredOn: string;
}

interface ShiftSalesUpdateEvent {
  shiftId: string;
  totalSales: number;
  totalTransactions: number;
  occurredOn: string;
}

interface NotificationEvent {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

interface DeviceSyncStatusEvent {
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
// Specialized hooks
// -------------------------------------------------------------------

/**
 * Listen for real-time order status changes.
 */
export function useRealtimeOrders(options?: {
  onStatusChanged?: (event: OrderStatusEvent) => void;
}) {
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const [lastEvent, setLastEvent] = useState<OrderStatusEvent | null>(null);
  const user = useAuthStore((s) => s.user);
  const callbackRef = useRef(options?.onStatusChanged);

  // Update ref when callback changes
  useEffect(() => {
    callbackRef.current = options?.onStatusChanged;
  }, [options?.onStatusChanged]);

  useEffect(() => {
    if (!isConnected || !user?.outletId) return;

    joinRoom('outlet', { outletId: user.outletId });

    const handler = (data: OrderStatusEvent) => {
      setLastEvent(data);
      callbackRef.current?.(data);
    };

    const currentSocket = socket.current;
    currentSocket?.on('order:status_changed', handler);

    return () => {
      currentSocket?.off('order:status_changed', handler);
      leaveRoom(`outlet:${user.outletId}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- socket ref intentionally omitted to prevent re-renders
  }, [isConnected, user?.outletId, joinRoom, leaveRoom]);

  return { lastEvent, isConnected };
}

/**
 * Listen for real-time inventory / stock changes and transfer status updates.
 */
export function useRealtimeInventory(options?: {
  onStockChanged?: (event: StockChangedEvent) => void;
  onStockUpdated?: (event: StockUpdatedEvent) => void;
  onTransferStatusChanged?: (event: TransferStatusEvent) => void;
}) {
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const [lastStockEvent, setLastStockEvent] = useState<StockChangedEvent | null>(null);
  const [lastTransferEvent, setLastTransferEvent] = useState<TransferStatusEvent | null>(null);
  const user = useAuthStore((s) => s.user);

  const cbStockChanged = useRef(options?.onStockChanged);
  const cbStockUpdated = useRef(options?.onStockUpdated);
  const cbTransfer = useRef(options?.onTransferStatusChanged);

  // Update refs when callbacks change
  useEffect(() => {
    cbStockChanged.current = options?.onStockChanged;
    cbStockUpdated.current = options?.onStockUpdated;
    cbTransfer.current = options?.onTransferStatusChanged;
  }, [options?.onStockChanged, options?.onStockUpdated, options?.onTransferStatusChanged]);

  useEffect(() => {
    if (!isConnected || !user?.outletId) return;

    joinRoom('outlet', { outletId: user.outletId });

    const stockChangedHandler = (data: StockChangedEvent) => {
      setLastStockEvent(data);
      cbStockChanged.current?.(data);
    };

    const stockUpdatedHandler = (data: StockUpdatedEvent) => {
      cbStockUpdated.current?.(data);
    };

    const transferHandler = (data: TransferStatusEvent) => {
      setLastTransferEvent(data);
      cbTransfer.current?.(data);
    };

    const currentSocket = socket.current;
    currentSocket?.on('inventory:stock_changed', stockChangedHandler);
    currentSocket?.on('inventory:stock_updated', stockUpdatedHandler);
    currentSocket?.on('transfer:status_changed', transferHandler);

    return () => {
      currentSocket?.off('inventory:stock_changed', stockChangedHandler);
      currentSocket?.off('inventory:stock_updated', stockUpdatedHandler);
      currentSocket?.off('transfer:status_changed', transferHandler);
      leaveRoom(`outlet:${user.outletId}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- socket ref intentionally omitted to prevent re-renders
  }, [isConnected, user?.outletId, joinRoom, leaveRoom]);

  return { lastStockEvent, lastTransferEvent, isConnected };
}

/**
 * Listen for real-time waiting list / queue changes.
 */
export function useRealtimeQueue(options?: {
  onCustomerAdded?: (event: QueueCustomerAddedEvent) => void;
  onCustomerCalled?: (event: QueueCustomerCalledEvent) => void;
  onCustomerSeated?: (event: QueueCustomerSeatedEvent) => void;
}) {
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const [queueEvents, setQueueEvents] = useState<Array<QueueCustomerAddedEvent | QueueCustomerCalledEvent | QueueCustomerSeatedEvent>>([]);
  const user = useAuthStore((s) => s.user);

  const cbAdded = useRef(options?.onCustomerAdded);
  const cbCalled = useRef(options?.onCustomerCalled);
  const cbSeated = useRef(options?.onCustomerSeated);

  // Update refs when callbacks change
  useEffect(() => {
    cbAdded.current = options?.onCustomerAdded;
    cbCalled.current = options?.onCustomerCalled;
    cbSeated.current = options?.onCustomerSeated;
  }, [options?.onCustomerAdded, options?.onCustomerCalled, options?.onCustomerSeated]);

  useEffect(() => {
    if (!isConnected || !user?.outletId) return;

    joinRoom('outlet', { outletId: user.outletId });

    const addedHandler = (data: QueueCustomerAddedEvent) => {
      setQueueEvents(prev => [...prev.slice(-49), data]);
      cbAdded.current?.(data);
    };

    const calledHandler = (data: QueueCustomerCalledEvent) => {
      setQueueEvents(prev => [...prev.slice(-49), data]);
      cbCalled.current?.(data);
    };

    const seatedHandler = (data: QueueCustomerSeatedEvent) => {
      setQueueEvents(prev => [...prev.slice(-49), data]);
      cbSeated.current?.(data);
    };

    const currentSocket = socket.current;
    currentSocket?.on('queue:customer_added', addedHandler);
    currentSocket?.on('queue:customer_called', calledHandler);
    currentSocket?.on('queue:customer_seated', seatedHandler);

    return () => {
      currentSocket?.off('queue:customer_added', addedHandler);
      currentSocket?.off('queue:customer_called', calledHandler);
      currentSocket?.off('queue:customer_seated', seatedHandler);
      leaveRoom(`outlet:${user.outletId}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- socket ref intentionally omitted to prevent re-renders
  }, [isConnected, user?.outletId, joinRoom, leaveRoom]);

  return { queueEvents, isConnected };
}

/**
 * Listen for real-time transaction creation events.
 * Automatically updates the transaction Zustand store.
 */
export function useRealtimeTransactions(options?: {
  onTransactionCreated?: (event: TransactionCreatedEvent) => void;
}) {
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const [lastEvent, setLastEvent] = useState<TransactionCreatedEvent | null>(null);
  const user = useAuthStore((s) => s.user);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const callbackRef = useRef(options?.onTransactionCreated);

  useEffect(() => {
    callbackRef.current = options?.onTransactionCreated;
  }, [options?.onTransactionCreated]);

  useEffect(() => {
    if (!isConnected || !user?.outletId) return;

    joinRoom('outlet', { outletId: user.outletId });

    const handler = (data: TransactionCreatedEvent) => {
      setLastEvent(data);
      // Auto-update Zustand store with a partial Transaction object
      addTransaction({
        id: data.transactionId,
        transactionNumber: data.transactionNumber,
        status: 'completed',
        subtotal: data.totalAmount,
        discountAmount: 0,
        taxAmount: 0,
        serviceCharge: 0,
        totalAmount: data.totalAmount,
        paidAmount: data.totalAmount,
        changeAmount: 0,
        customerName: null,
        employeeName: data.employeeName,
        outletId: data.outletId,
        items: [],
        payments: [],
        createdAt: data.occurredOn,
        updatedAt: data.occurredOn,
      });
      callbackRef.current?.(data);
    };

    const currentSocket = socket.current;
    currentSocket?.on('transaction:created', handler);

    return () => {
      currentSocket?.off('transaction:created', handler);
      leaveRoom(`outlet:${user.outletId}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- socket ref intentionally omitted to prevent re-renders
  }, [isConnected, user?.outletId, joinRoom, leaveRoom, addTransaction]);

  return { lastEvent, isConnected };
}

/**
 * Listen for real-time shift start/end events.
 */
export function useRealtimeShifts(options?: {
  onShiftStarted?: (event: ShiftEvent) => void;
  onShiftEnded?: (event: ShiftEvent) => void;
}) {
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const [lastEvent, setLastEvent] = useState<ShiftEvent | null>(null);
  const user = useAuthStore((s) => s.user);

  const cbStarted = useRef(options?.onShiftStarted);
  const cbEnded = useRef(options?.onShiftEnded);

  useEffect(() => {
    cbStarted.current = options?.onShiftStarted;
    cbEnded.current = options?.onShiftEnded;
  }, [options?.onShiftStarted, options?.onShiftEnded]);

  useEffect(() => {
    if (!isConnected || !user?.outletId) return;

    joinRoom('outlet', { outletId: user.outletId });

    const startedHandler = (data: ShiftEvent) => {
      setLastEvent(data);
      cbStarted.current?.(data);
    };

    const endedHandler = (data: ShiftEvent) => {
      setLastEvent(data);
      cbEnded.current?.(data);
    };

    const currentSocket = socket.current;
    currentSocket?.on('shift:started', startedHandler);
    currentSocket?.on('shift:ended', endedHandler);

    return () => {
      currentSocket?.off('shift:started', startedHandler);
      currentSocket?.off('shift:ended', endedHandler);
      leaveRoom(`outlet:${user.outletId}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- socket ref intentionally omitted to prevent re-renders
  }, [isConnected, user?.outletId, joinRoom, leaveRoom]);

  return { lastEvent, isConnected };
}

/**
 * Listen for real-time notifications (notification bell).
 */
export function useRealtimeNotifications(options?: {
  onNotification?: (event: NotificationEvent) => void;
}) {
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const user = useAuthStore((s) => s.user);
  const callbackRef = useRef(options?.onNotification);

  useEffect(() => {
    callbackRef.current = options?.onNotification;
  }, [options?.onNotification]);

  useEffect(() => {
    if (!isConnected || !user?.outletId) return;

    joinRoom('outlet', { outletId: user.outletId });

    const handler = (data: NotificationEvent) => {
      setNotifications(prev => [data, ...prev].slice(0, 50));
      callbackRef.current?.(data);
    };

    const currentSocket = socket.current;
    currentSocket?.on('notification:new', handler);

    return () => {
      currentSocket?.off('notification:new', handler);
      leaveRoom(`outlet:${user.outletId}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- socket ref intentionally omitted to prevent re-renders
  }, [isConnected, user?.outletId, joinRoom, leaveRoom]);

  return { notifications, isConnected };
}

/**
 * Listen for real-time device sync status updates.
 */
export function useRealtimeDeviceSync(options?: {
  onSyncStatus?: (event: DeviceSyncStatusEvent) => void;
}) {
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const [deviceStatuses, setDeviceStatuses] = useState<Map<string, DeviceSyncStatusEvent>>(new Map());
  const user = useAuthStore((s) => s.user);
  const callbackRef = useRef(options?.onSyncStatus);

  useEffect(() => {
    callbackRef.current = options?.onSyncStatus;
  }, [options?.onSyncStatus]);

  useEffect(() => {
    if (!isConnected || !user?.businessId) return;

    joinRoom('business', { businessId: user.businessId });

    const handler = (data: DeviceSyncStatusEvent) => {
      setDeviceStatuses(prev => {
        const next = new Map(prev);
        next.set(data.deviceId, data);
        return next;
      });
      callbackRef.current?.(data);
    };

    const currentSocket = socket.current;
    currentSocket?.on('device:sync-status', handler);

    return () => {
      currentSocket?.off('device:sync-status', handler);
      leaveRoom(`business:${user.businessId}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- socket ref intentionally omitted to prevent re-renders
  }, [isConnected, user?.businessId, joinRoom, leaveRoom]);

  return { deviceStatuses, isConnected };
}

/**
 * Listen for shift sales updates in real-time (for active shift banner).
 */
export function useRealtimeShiftSales(options?: {
  onSalesUpdate?: (event: ShiftSalesUpdateEvent) => void;
}) {
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const [lastSalesEvent, setLastSalesEvent] = useState<ShiftSalesUpdateEvent | null>(null);
  const user = useAuthStore((s) => s.user);
  const callbackRef = useRef(options?.onSalesUpdate);

  useEffect(() => {
    callbackRef.current = options?.onSalesUpdate;
  }, [options?.onSalesUpdate]);

  useEffect(() => {
    if (!isConnected || !user?.outletId) return;

    joinRoom('outlet', { outletId: user.outletId });

    const handler = (data: ShiftSalesUpdateEvent) => {
      setLastSalesEvent(data);
      callbackRef.current?.(data);
    };

    const currentSocket = socket.current;
    currentSocket?.on('shift:sales_updated', handler);

    return () => {
      currentSocket?.off('shift:sales_updated', handler);
      leaveRoom(`outlet:${user.outletId}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- socket ref intentionally omitted to prevent re-renders
  }, [isConnected, user?.outletId, joinRoom, leaveRoom]);

  return { lastSalesEvent, isConnected };
}

/**
 * Combined hook that listens to all real-time events and auto-updates
 * the Zustand stores (transactions, orders, inventory).
 * Used by the RealtimeProvider to keep the app in sync.
 */
export function useRealtimeSync() {
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const user = useAuthStore((s) => s.user);

  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const updateOrderStatus = useOrderStore((s) => s.updateOrderStatus);
  const updateStockLevel = useInventoryStore((s) => s.updateStockLevel);

  useEffect(() => {
    if (!isConnected || !user?.outletId) return;

    joinRoom('outlet', { outletId: user.outletId });

    const currentSocket = socket.current;

    const onTransactionCreated = (data: TransactionCreatedEvent) => {
      addTransaction({
        id: data.transactionId,
        transactionNumber: data.transactionNumber,
        status: 'completed',
        subtotal: data.totalAmount,
        discountAmount: 0,
        taxAmount: 0,
        serviceCharge: 0,
        totalAmount: data.totalAmount,
        paidAmount: data.totalAmount,
        changeAmount: 0,
        customerName: null,
        employeeName: data.employeeName,
        outletId: data.outletId,
        items: [],
        payments: [],
        createdAt: data.occurredOn,
        updatedAt: data.occurredOn,
      });
    };

    const onOrderStatusChanged = (data: OrderStatusEvent) => {
      updateOrderStatus(data.orderId, data.newStatus as import('@/types/order.types').OrderStatus);
    };

    const onStockLevelChanged = (data: StockChangedEvent) => {
      updateStockLevel(data.productId, data.outletId, data.newQuantity);
    };

    currentSocket?.on('transaction:created', onTransactionCreated);
    currentSocket?.on('order:status_changed', onOrderStatusChanged);
    currentSocket?.on('inventory:stock_changed', onStockLevelChanged);

    return () => {
      currentSocket?.off('transaction:created', onTransactionCreated);
      currentSocket?.off('order:status_changed', onOrderStatusChanged);
      currentSocket?.off('inventory:stock_changed', onStockLevelChanged);
      leaveRoom(`outlet:${user.outletId}`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- socket ref intentionally omitted to prevent re-renders
  }, [isConnected, user?.outletId, joinRoom, leaveRoom, addTransaction, updateOrderStatus, updateStockLevel]);

  return { isConnected };
}

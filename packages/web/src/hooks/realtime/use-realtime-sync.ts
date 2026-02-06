/**
 * Real-time Sync Hook
 *
 * Combined hook that listens to all real-time events and auto-updates
 * the Zustand stores (transactions, orders, inventory).
 * Used by the RealtimeProvider to keep the app in sync.
 */

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useTransactionStore } from '@/stores/transaction.store';
import { useOrderStore } from '@/stores/order.store';
import { useInventoryStore } from '@/stores/inventory.store';
import { useSocket } from './use-socket';
import type {
  TransactionCreatedEvent,
  OrderStatusEvent,
  StockChangedEvent,
} from './types';

export interface UseRealtimeSyncReturn {
  isConnected: boolean;
}

/**
 * Combined hook that listens to all real-time events and auto-updates
 * the Zustand stores (transactions, orders, inventory).
 *
 * This hook is typically used by the RealtimeProvider to keep the entire
 * app in sync with real-time updates.
 *
 * @returns Connection state
 *
 * @example
 * ```tsx
 * // In RealtimeProvider
 * function RealtimeProvider({ children }) {
 *   const { isConnected } = useRealtimeSync();
 *   return <>{children}</>;
 * }
 * ```
 */
export function useRealtimeSync(): UseRealtimeSyncReturn {
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
      updateOrderStatus(
        data.orderId,
        data.newStatus as import('@/types/order.types').OrderStatus
      );
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

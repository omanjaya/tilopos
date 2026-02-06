/**
 * Real-time Transactions Hook
 *
 * Listen for real-time transaction creation events via WebSocket.
 * Automatically updates the transaction Zustand store.
 */

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useTransactionStore } from '@/stores/transaction.store';
import { useSocket } from './use-socket';
import type { TransactionCreatedEvent } from './types';

export interface UseRealtimeTransactionsOptions {
  onTransactionCreated?: (event: TransactionCreatedEvent) => void;
}

export interface UseRealtimeTransactionsReturn {
  lastEvent: TransactionCreatedEvent | null;
  isConnected: boolean;
}

/**
 * Listen for real-time transaction creation events.
 * Automatically updates the transaction Zustand store.
 *
 * @param options - Optional callback for transaction created events
 * @returns Last event and connection state
 *
 * @example
 * ```tsx
 * const { lastEvent, isConnected } = useRealtimeTransactions({
 *   onTransactionCreated: (event) => {
 *     console.log('New transaction created:', event);
 *     // Show toast notification
 *   }
 * });
 * ```
 */
export function useRealtimeTransactions(
  options?: UseRealtimeTransactionsOptions
): UseRealtimeTransactionsReturn {
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

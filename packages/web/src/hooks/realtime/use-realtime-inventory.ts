/**
 * Real-time Inventory Hook
 *
 * Listen for real-time inventory/stock changes and transfer status updates via WebSocket.
 */

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useSocket } from './use-socket';
import type {
  StockChangedEvent,
  StockUpdatedEvent,
  TransferStatusEvent,
} from './types';

export interface UseRealtimeInventoryOptions {
  onStockChanged?: (event: StockChangedEvent) => void;
  onStockUpdated?: (event: StockUpdatedEvent) => void;
  onTransferStatusChanged?: (event: TransferStatusEvent) => void;
}

export interface UseRealtimeInventoryReturn {
  lastStockEvent: StockChangedEvent | null;
  lastTransferEvent: TransferStatusEvent | null;
  isConnected: boolean;
}

/**
 * Listen for real-time inventory/stock changes and transfer status updates.
 *
 * @param options - Optional callbacks for inventory events
 * @returns Last events and connection state
 *
 * @example
 * ```tsx
 * const { lastStockEvent, lastTransferEvent, isConnected } = useRealtimeInventory({
 *   onStockChanged: (event) => {
 *     console.log('Stock changed:', event);
 *     // Refetch stock levels
 *   },
 *   onTransferStatusChanged: (event) => {
 *     console.log('Transfer status changed:', event);
 *     // Update transfer list
 *   }
 * });
 * ```
 */
export function useRealtimeInventory(
  options?: UseRealtimeInventoryOptions
): UseRealtimeInventoryReturn {
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

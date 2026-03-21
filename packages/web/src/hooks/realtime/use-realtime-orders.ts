/**
 * Real-time Orders Hook
 *
 * Listen for real-time order status changes via WebSocket.
 */

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useSocket } from './use-socket';
import type { OrderStatusEvent } from './types';

export interface UseRealtimeOrdersOptions {
  onStatusChanged?: (event: OrderStatusEvent) => void;
}

export interface UseRealtimeOrdersReturn {
  lastEvent: OrderStatusEvent | null;
  isConnected: boolean;
}

/**
 * Listen for real-time order status changes.
 *
 * @param options - Optional callback for status change events
 * @returns Last event and connection state
 *
 * @example
 * ```tsx
 * const { lastEvent, isConnected } = useRealtimeOrders({
 *   onStatusChanged: (event) => {
 *     console.log('Order status changed:', event);
 *     // Refetch orders or update UI
 *   }
 * });
 * ```
 */
export function useRealtimeOrders(
  options?: UseRealtimeOrdersOptions
): UseRealtimeOrdersReturn {
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const [lastEvent, setLastEvent] = useState<OrderStatusEvent | null>(null);
  const user = useAuthStore((s) => s.user);
  const callbackRef = useRef(options?.onStatusChanged);
  const boundSocketRef = useRef<typeof socket.current>(null);

  // Update ref when callback changes
  useEffect(() => {
    callbackRef.current = options?.onStatusChanged;
  }, [options?.onStatusChanged]);

  useEffect(() => {
    if (!isConnected || !user?.outletId) return;

    // Capture current socket at setup time for consistent cleanup
    const currentSocket = socket.current;
    if (!currentSocket) return;

    // Track which socket instance we bound to
    boundSocketRef.current = currentSocket;

    joinRoom('outlet', { outletId: user.outletId });

    const handler = (data: OrderStatusEvent) => {
      setLastEvent(data);
      callbackRef.current?.(data);
    };

    currentSocket.on('order:status_changed', handler);

    return () => {
      // Always clean up the exact socket instance we attached listeners to
      currentSocket.off('order:status_changed', handler);
      boundSocketRef.current = null;
      leaveRoom('outlet');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- socket ref intentionally omitted to prevent re-renders
  }, [isConnected, user?.outletId, joinRoom, leaveRoom]);

  return { lastEvent, isConnected };
}

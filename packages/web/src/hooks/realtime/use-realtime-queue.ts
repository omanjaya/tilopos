/**
 * Real-time Queue Hook
 *
 * Listen for real-time waiting list/queue changes via WebSocket.
 */

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useSocket } from './use-socket';
import type {
  QueueCustomerAddedEvent,
  QueueCustomerCalledEvent,
  QueueCustomerSeatedEvent,
  QueueEvent,
} from './types';

export interface UseRealtimeQueueOptions {
  onCustomerAdded?: (event: QueueCustomerAddedEvent) => void;
  onCustomerCalled?: (event: QueueCustomerCalledEvent) => void;
  onCustomerSeated?: (event: QueueCustomerSeatedEvent) => void;
}

export interface UseRealtimeQueueReturn {
  queueEvents: QueueEvent[];
  isConnected: boolean;
}

/**
 * Listen for real-time waiting list/queue changes.
 *
 * @param options - Optional callbacks for queue events
 * @returns Queue events history and connection state
 *
 * @example
 * ```tsx
 * const { queueEvents, isConnected } = useRealtimeQueue({
 *   onCustomerAdded: (event) => {
 *     console.log('Customer added to queue:', event);
 *     // Show notification
 *   },
 *   onCustomerCalled: (event) => {
 *     console.log('Customer called:', event);
 *     // Update queue display
 *   }
 * });
 * ```
 */
export function useRealtimeQueue(
  options?: UseRealtimeQueueOptions
): UseRealtimeQueueReturn {
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const [queueEvents, setQueueEvents] = useState<QueueEvent[]>([]);
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
      setQueueEvents((prev) => [...prev.slice(-49), data]);
      cbAdded.current?.(data);
    };

    const calledHandler = (data: QueueCustomerCalledEvent) => {
      setQueueEvents((prev) => [...prev.slice(-49), data]);
      cbCalled.current?.(data);
    };

    const seatedHandler = (data: QueueCustomerSeatedEvent) => {
      setQueueEvents((prev) => [...prev.slice(-49), data]);
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

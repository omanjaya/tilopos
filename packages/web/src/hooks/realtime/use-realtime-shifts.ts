/**
 * Real-time Shifts Hook
 *
 * Listen for real-time shift start/end events and sales updates via WebSocket.
 */

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useSocket } from './use-socket';
import type { ShiftEvent, ShiftSalesUpdateEvent } from './types';

export interface UseRealtimeShiftsOptions {
  onShiftStarted?: (event: ShiftEvent) => void;
  onShiftEnded?: (event: ShiftEvent) => void;
}

export interface UseRealtimeShiftsReturn {
  lastEvent: ShiftEvent | null;
  isConnected: boolean;
}

/**
 * Listen for real-time shift start/end events.
 *
 * @param options - Optional callbacks for shift events
 * @returns Last event and connection state
 *
 * @example
 * ```tsx
 * const { lastEvent, isConnected } = useRealtimeShifts({
 *   onShiftStarted: (event) => {
 *     console.log('Shift started:', event);
 *   },
 *   onShiftEnded: (event) => {
 *     console.log('Shift ended:', event);
 *   }
 * });
 * ```
 */
export function useRealtimeShifts(
  options?: UseRealtimeShiftsOptions
): UseRealtimeShiftsReturn {
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

// -------------------------------------------------------------------
// Shift Sales Hook
// -------------------------------------------------------------------

export interface UseRealtimeShiftSalesOptions {
  onSalesUpdate?: (event: ShiftSalesUpdateEvent) => void;
}

export interface UseRealtimeShiftSalesReturn {
  lastSalesEvent: ShiftSalesUpdateEvent | null;
  isConnected: boolean;
}

/**
 * Listen for shift sales updates in real-time (for active shift banner).
 *
 * @param options - Optional callback for sales update events
 * @returns Last sales event and connection state
 *
 * @example
 * ```tsx
 * const { lastSalesEvent, isConnected } = useRealtimeShiftSales({
 *   onSalesUpdate: (event) => {
 *     console.log('Shift sales updated:', event);
 *     // Update shift banner
 *   }
 * });
 * ```
 */
export function useRealtimeShiftSales(
  options?: UseRealtimeShiftSalesOptions
): UseRealtimeShiftSalesReturn {
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

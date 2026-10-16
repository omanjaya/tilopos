/**
 * Real-time Notifications Hook
 *
 * Listen for real-time notifications (notification bell) via WebSocket.
 */

import { useEffect, useRef, useState } from 'react';
import { useSocket, useEffectiveOutletId } from './use-socket';
import type { NotificationEvent } from './types';

export interface UseRealtimeNotificationsOptions {
  onNotification?: (event: NotificationEvent) => void;
}

export interface UseRealtimeNotificationsReturn {
  notifications: NotificationEvent[];
  isConnected: boolean;
}

/**
 * Listen for real-time notifications (notification bell).
 * Maintains a list of the last 50 notifications.
 *
 * @param options - Optional callback for notification events
 * @returns Notifications list and connection state
 *
 * @example
 * ```tsx
 * const { notifications, isConnected } = useRealtimeNotifications({
 *   onNotification: (event) => {
 *     console.log('New notification:', event);
 *     // Show toast or update bell badge
 *   }
 * });
 * ```
 */
export function useRealtimeNotifications(
  options?: UseRealtimeNotificationsOptions
): UseRealtimeNotificationsReturn {
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const outletId = useEffectiveOutletId();
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const callbackRef = useRef(options?.onNotification);

  useEffect(() => {
    callbackRef.current = options?.onNotification;
  }, [options?.onNotification]);

  useEffect(() => {
    if (!isConnected || !outletId) return;

    joinRoom('outlet', { outletId: outletId });

    const handler = (data: NotificationEvent) => {
      setNotifications((prev) => [data, ...prev].slice(0, 50));
      callbackRef.current?.(data);
    };

    const currentSocket = socket.current;
    currentSocket?.on('notification:new', handler);

    return () => {
      currentSocket?.off('notification:new', handler);
      leaveRoom('outlet');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- socket ref intentionally omitted to prevent re-renders
  }, [isConnected, outletId, joinRoom, leaveRoom]);

  return { notifications, isConnected };
}

/**
 * Real-time Device Sync Hook
 *
 * Listen for real-time device sync status updates via WebSocket.
 */

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useSocket } from './use-socket';
import type { DeviceSyncStatusEvent } from './types';

export interface UseRealtimeDeviceSyncOptions {
  onSyncStatus?: (event: DeviceSyncStatusEvent) => void;
}

export interface UseRealtimeDeviceSyncReturn {
  deviceStatuses: Map<string, DeviceSyncStatusEvent>;
  isConnected: boolean;
}

/**
 * Listen for real-time device sync status updates.
 * Maintains a map of device statuses keyed by device ID.
 *
 * @param options - Optional callback for sync status events
 * @returns Device statuses map and connection state
 *
 * @example
 * ```tsx
 * const { deviceStatuses, isConnected } = useRealtimeDeviceSync({
 *   onSyncStatus: (event) => {
 *     console.log('Device sync status:', event);
 *     // Update device status indicator
 *   }
 * });
 *
 * // Access device status
 * const device1Status = deviceStatuses.get('device-1');
 * ```
 */
export function useRealtimeDeviceSync(
  options?: UseRealtimeDeviceSyncOptions
): UseRealtimeDeviceSyncReturn {
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const [deviceStatuses, setDeviceStatuses] = useState<Map<string, DeviceSyncStatusEvent>>(
    new Map()
  );
  const user = useAuthStore((s) => s.user);
  const callbackRef = useRef(options?.onSyncStatus);

  useEffect(() => {
    callbackRef.current = options?.onSyncStatus;
  }, [options?.onSyncStatus]);

  useEffect(() => {
    if (!isConnected || !user?.businessId) return;

    joinRoom('business', { businessId: user.businessId });

    const handler = (data: DeviceSyncStatusEvent) => {
      setDeviceStatuses((prev) => {
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

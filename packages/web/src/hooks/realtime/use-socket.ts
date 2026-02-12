/**
 * Base WebSocket Hook
 *
 * Low-level hook that manages Socket.io connection lifecycle and room membership.
 * Used as a foundation by all feature-specific hooks.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';
import { getSharedSocket, releaseSharedSocket } from './socket.util';
import type { RoomOptions } from './types';

export interface UseSocketReturn {
  socket: React.MutableRefObject<Socket | null>;
  isConnected: boolean;
  joinRoom: (room: string, options?: RoomOptions) => void;
  leaveRoom: (room: string) => void;
}

/**
 * Base hook that manages Socket.io connection and room membership.
 *
 * @returns Socket reference, connection state, and room management functions
 */
export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  // Initialize socket connection only when authenticated
  useEffect(() => {
    if (!token) {
      setIsConnected(false);
      return;
    }

    const socket = getSharedSocket();
    if (!socket) return;

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
  }, [token]);

  // Join a WebSocket room
  const joinRoom = useCallback(
    (room: string, options?: RoomOptions) => {
      socketRef.current?.emit('joinRoom', {
        room,
        businessId: options?.businessId || user?.businessId,
        outletId: options?.outletId || user?.outletId,
      });
    },
    [user?.businessId, user?.outletId]
  );

  // Leave a WebSocket room
  const leaveRoom = useCallback((room: string) => {
    socketRef.current?.emit('leaveRoom', { room });
  }, []);

  return { socket: socketRef, isConnected, joinRoom, leaveRoom };
}

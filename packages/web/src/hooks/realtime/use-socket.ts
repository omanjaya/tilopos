/**
 * Base WebSocket Hook
 *
 * Low-level hook that manages Socket.io connection lifecycle and room membership.
 * Used as a foundation by all feature-specific hooks.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { getSharedSocket, releaseSharedSocket, resolveRoom, acquireRoom, releaseRoom } from './socket.util';
import type { RoomOptions } from './types';

export interface UseSocketReturn {
  socket: React.MutableRefObject<Socket | null>;
  isConnected: boolean;
  /** Join 'outlet' | 'business' | 'kds' (or 'outlet:<id>' ...); ref-counted across hooks */
  joinRoom: (room: string, options?: RoomOptions) => void;
  /** Leave a room previously joined with the same `room` argument */
  leaveRoom: (room: string) => void;
}

/**
 * Outlet whose realtime events the current user should receive: the outlet picked in
 * the outlet selector (owners/managers) or the user's assigned outlet.
 */
export function useEffectiveOutletId(): string | null {
  const selectedOutletId = useUIStore((s) => s.selectedOutletId);
  const userOutletId = useAuthStore((s) => s.user?.outletId ?? null);
  return selectedOutletId || userOutletId;
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
  const outletId = useEffectiveOutletId();
  // Rooms joined by this hook instance: requested name -> resolved server-side name
  const joinedRef = useRef(new Map<string, string>());

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

    const joined = joinedRef.current;
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      joined.forEach((name) => releaseRoom(socket, name));
      joined.clear();
      releaseSharedSocket();
      socketRef.current = null;
    };
  }, [token]);

  // Join a WebSocket room (ref-counted, so another hook leaving does not drop it)
  const joinRoom = useCallback(
    (room: string, options?: RoomOptions) => {
      const socket = socketRef.current;
      if (!socket || joinedRef.current.has(room)) return;
      const resolved = resolveRoom(room, {
        businessId: options?.businessId || user?.businessId,
        outletId: options?.outletId || outletId,
      });
      joinedRef.current.set(room, acquireRoom(socket, resolved));
    },
    [user?.businessId, outletId]
  );

  // Leave a WebSocket room joined by this hook
  const leaveRoom = useCallback((room: string) => {
    const name = joinedRef.current.get(room);
    if (!name) return;
    joinedRef.current.delete(room);
    releaseRoom(socketRef.current, name);
  }, []);

  return { socket: socketRef, isConnected, joinRoom, leaveRoom };
}

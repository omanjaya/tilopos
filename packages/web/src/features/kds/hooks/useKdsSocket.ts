import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';

const SOCKET_URL = import.meta.env.VITE_WS_URL || '';

/**
 * Connects to the /kds WebSocket namespace and triggers
 * immediate refetch of KDS orders when new/updated orders arrive.
 */
export function useKdsSocket(outletId: string) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!outletId) return;

    const token = localStorage.getItem('token');
    const socket = io(`${SOCKET_URL}/kds`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: token ? { token } : undefined,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinOutlet', { outletId });
    });

    // New order created — refetch immediately
    socket.on('order:new', () => {
      queryClient.invalidateQueries({ queryKey: ['kds-orders', outletId] });
    });

    // Any order status change — refetch immediately
    socket.on('order:status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['kds-orders', outletId] });
    });

    // Order ready
    socket.on('order:ready', () => {
      queryClient.invalidateQueries({ queryKey: ['kds-orders', outletId] });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [outletId, queryClient, user?.businessId]);
}

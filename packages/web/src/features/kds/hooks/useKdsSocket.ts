import { recoverSocketSession } from '@/hooks/realtime/socket-session';
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';

const SOCKET_URL = import.meta.env.VITE_WS_URL || '';

/**
 * Connects to the /kds WebSocket namespace and triggers
 * immediate refetch of KDS orders when new/updated orders arrive.
 * Returns the realtime error (null when connected) so the page can show that
 * it has fallen back to polling.
 */
export function useKdsSocket(outletId: string) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<Socket | null>(null);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);

  useEffect(() => {
    if (!outletId || !token) return;
    const socket = io(`${SOCKET_URL}/kds`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: (cb) => cb({ token: useAuthStore.getState().token }),
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinOutlet', { outletId }, (ack?: { error?: string }) => {
        if (ack?.error) {
          console.warn('[KDS] joinOutlet rejected:', ack.error);
          setRealtimeError(ack.error);
        } else {
          setRealtimeError(null);
        }
      });
    });

    socket.on('connect_error', (err: Error) => {
      console.warn('[KDS] socket connect_error:', err.message);
      setRealtimeError(err.message || 'Koneksi realtime gagal');
    });

    socket.on('disconnect', (reason: string) => {
      setRealtimeError(`Terputus (${reason})`);
      if (reason === 'io server disconnect') recoverSocketSession(socket, () => socketRef.current === socket);
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
  }, [outletId, queryClient, user?.businessId, user?.id, token]);

  return { realtimeError };
}

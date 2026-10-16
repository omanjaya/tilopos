/**
 * Real-time Sync Hook
 *
 * Listens to outlet events and invalidates the React Query caches that show the
 * affected data, so open screens refetch server truth (no parallel client stores).
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket, useEffectiveOutletId } from './use-socket';

export interface UseRealtimeSyncReturn {
  isConnected: boolean;
}

/**
 * Mount once (RealtimeProvider). Refreshes transactions, orders and stock views
 * when the backend broadcasts changes for the active outlet.
 */
export function useRealtimeSync(): UseRealtimeSyncReturn {
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const outletId = useEffectiveOutletId();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isConnected || !outletId) return;

    joinRoom('outlet', { outletId });

    const currentSocket = socket.current;

    const onTransactionCreated = () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['today-transactions'] });
    };
    const onOrderStatusChanged = () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    };
    const onStockLevelChanged = () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory'] });
    };

    currentSocket?.on('transaction:created', onTransactionCreated);
    currentSocket?.on('order:status_changed', onOrderStatusChanged);
    currentSocket?.on('inventory:stock_changed', onStockLevelChanged);

    return () => {
      currentSocket?.off('transaction:created', onTransactionCreated);
      currentSocket?.off('order:status_changed', onOrderStatusChanged);
      currentSocket?.off('inventory:stock_changed', onStockLevelChanged);
      leaveRoom('outlet');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- socket ref intentionally omitted to prevent re-renders
  }, [isConnected, outletId, joinRoom, leaveRoom, queryClient]);

  return { isConnected };
}

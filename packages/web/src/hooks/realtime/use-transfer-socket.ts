/**
 * Transfer WebSocket Hook
 *
 * Provides real-time updates for stock transfers.
 * Listens to transfer status changes and notifies components.
 */

import { useEffect, useCallback } from 'react';
import { useSocket } from './use-socket';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/lib/toast-utils';
import type { TransferStatus } from '@/types/inventory.types';

export interface TransferStatusChangedPayload {
  transferId: string;
  sourceOutletId: string;
  destinationOutletId: string;
  businessId: string;
  previousStatus: TransferStatus;
  newStatus: TransferStatus;
  updatedBy: string;
  occurredOn: string;
}

export interface UseTransferSocketOptions {
  /** Callback when transfer status changes */
  onStatusChange?: (payload: TransferStatusChangedPayload) => void;
  /** Show toast notifications for status changes */
  showNotifications?: boolean;
  /** Auto-join outlet room */
  autoJoinOutlet?: boolean;
}

const STATUS_LABELS: Record<TransferStatus, string> = {
  requested: 'Diminta',
  approved: 'Disetujui',
  shipped: 'Dikirim',
  in_transit: 'Dalam Pengiriman',
  received: 'Diterima',
  cancelled: 'Dibatalkan',
};

/**
 * Hook for real-time stock transfer updates.
 *
 * @param options Configuration options
 * @returns Socket connection state and utility functions
 */
export function useTransferSocket(options: UseTransferSocketOptions = {}) {
  const {
    onStatusChange,
    showNotifications = true,
    autoJoinOutlet = true,
  } = options;

  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const user = useAuthStore((s) => s.user);

  // Handle transfer status change events
  const handleTransferStatusChanged = useCallback(
    (payload: TransferStatusChangedPayload) => {
      // Call custom callback if provided
      if (onStatusChange) {
        onStatusChange(payload);
      }

      // Show toast notification
      if (showNotifications && user) {
        const statusLabel = STATUS_LABELS[payload.newStatus] || payload.newStatus;
        const isSourceOutlet = user.outletId === payload.sourceOutletId;
        const isDestinationOutlet = user.outletId === payload.destinationOutletId;

        let title = '';
        let description = '';

        // Customize message based on status and outlet role
        switch (payload.newStatus) {
          case 'requested':
            if (isDestinationOutlet) {
              title = '📦 Transfer Baru Masuk';
              description = 'Transfer stok baru memerlukan persetujuan';
            }
            break;

          case 'approved':
            if (isSourceOutlet) {
              title = '✅ Transfer Disetujui';
              description = 'Transfer telah disetujui dan siap dikirim';
            }
            break;

          case 'shipped':
          case 'in_transit':
            if (isDestinationOutlet) {
              title = '🚚 Transfer Dalam Perjalanan';
              description = 'Barang sedang dalam pengiriman ke outlet Anda';
            } else if (isSourceOutlet) {
              title = '✓ Transfer Telah Dikirim';
              description = 'Barang telah dikirim ke outlet tujuan';
            }
            break;

          case 'received':
            if (isSourceOutlet) {
              title = '✓ Transfer Diterima';
              description = 'Barang telah diterima di outlet tujuan';
            } else if (isDestinationOutlet) {
              title = '📦 Transfer Diterima';
              description = 'Barang telah masuk ke stok outlet';
            }
            break;

          case 'cancelled':
            title = '❌ Transfer Dibatalkan';
            description = 'Transfer telah dibatalkan';
            break;
        }

        if (title) {
          toast.info({
            title,
            description,
          });
        }
      }
    },
    [onStatusChange, showNotifications, user]
  );

  // Setup WebSocket event listeners
  useEffect(() => {
    const socketInstance = socket.current;
    if (!socketInstance || !isConnected) return;

    // Join outlet room automatically if enabled
    if (autoJoinOutlet && user?.outletId) {
      joinRoom(`outlet:${user.outletId}`, {
        outletId: user.outletId,
        businessId: user.businessId,
      });
    }

    // Also join business room for global updates
    if (user?.businessId) {
      joinRoom(`business:${user.businessId}`, {
        businessId: user.businessId,
      });
    }

    // Listen to transfer status change events
    socketInstance.on('transfer:status_changed', handleTransferStatusChanged);
    socketInstance.on('inventory:transfer-status-changed', handleTransferStatusChanged);

    return () => {
      socketInstance.off('transfer:status_changed', handleTransferStatusChanged);
      socketInstance.off('inventory:transfer-status-changed', handleTransferStatusChanged);

      // Leave rooms on cleanup
      if (autoJoinOutlet && user?.outletId) {
        leaveRoom(`outlet:${user.outletId}`);
      }
      if (user?.businessId) {
        leaveRoom(`business:${user.businessId}`);
      }
    };
  }, [
    socket,
    isConnected,
    handleTransferStatusChanged,
    autoJoinOutlet,
    user,
    joinRoom,
    leaveRoom,
  ]);

  return {
    isConnected,
    joinRoom,
    leaveRoom,
  };
}

/**
 * Transfer WebSocket Hook
 *
 * Provides real-time updates for stock transfers.
 * Listens to transfer status changes and notifies components.
 */

import { useEffect, useCallback, useState } from 'react';
import { useSocket, useEffectiveOutletId } from './use-socket';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/lib/toast-utils';
import type { StockTransferStatus as TransferStatus } from '@/api/endpoints/inventory.api';

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
  /**
   * @deprecated Transfer events are received through the business room (one delivery per
   * change); kept for call-site compatibility.
   */
  autoJoinOutlet?: boolean;
}

/**
 * Hook for real-time stock transfer updates.
 *
 * @param options Configuration options
 * @returns Socket connection state and utility functions
 */
// The shared socket may be in the business room and in outlet rooms at once, and the
// gateway emits the same change to each of them: drop repeated deliveries.
const recentDeliveries = new Map<string, number>();
const DEDUPE_WINDOW_MS = 10_000;
let nextHookId = 0;

function isDuplicateDelivery(payload: TransferStatusChangedPayload, hookId: number): boolean {
  const now = Date.now();
  recentDeliveries.forEach((at, key) => {
    if (now - at > DEDUPE_WINDOW_MS) recentDeliveries.delete(key);
  });
  const key = `${hookId}|${payload.transferId}|${payload.newStatus}|${payload.occurredOn}`;
  if (recentDeliveries.has(key)) return true;
  recentDeliveries.set(key, now);
  return false;
}

export function useTransferSocket(options: UseTransferSocketOptions = {}) {
  const { onStatusChange, showNotifications = true } = options;

  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const outletId = useEffectiveOutletId();
  const businessId = useAuthStore((s) => s.user?.businessId ?? null);
  const [hookId] = useState(() => ++nextHookId);

  const handleTransferStatusChanged = useCallback(
    (payload: TransferStatusChangedPayload) => {
      if (isDuplicateDelivery(payload, hookId)) return;
      onStatusChange?.(payload);

      if (!showNotifications) return;

      const isSourceOutlet = outletId === payload.sourceOutletId;
      const isDestinationOutlet = outletId === payload.destinationOutletId;
      // Owners without a selected outlet see every transfer of the business
      const isRelevant = !outletId || isSourceOutlet || isDestinationOutlet;
      if (!isRelevant) return;

      let title = '';
      let description = '';

      switch (payload.newStatus) {
        case 'pending':
          if (isDestinationOutlet || isSourceOutlet || !outletId) {
            title = 'Permintaan Transfer Baru';
            description = 'Transfer stok baru menunggu persetujuan';
          }
          break;
        case 'approved':
          title = 'Transfer Disetujui';
          description = 'Transfer telah disetujui dan siap dikirim';
          break;
        case 'in_transit':
          title = 'Transfer Dalam Pengiriman';
          description = isDestinationOutlet
            ? 'Barang sedang dalam pengiriman ke outlet Anda'
            : 'Barang telah dikirim ke outlet tujuan';
          break;
        case 'received':
          title = 'Transfer Diterima';
          description = isDestinationOutlet
            ? 'Barang telah masuk ke stok outlet'
            : 'Barang telah diterima di outlet tujuan';
          break;
        case 'rejected':
          title = 'Transfer Ditolak';
          description = 'Permintaan transfer ditolak';
          break;
        case 'cancelled':
          title = 'Transfer Dibatalkan';
          description = 'Transfer telah dibatalkan';
          break;
      }

      if (title) {
        toast.info({ title, description });
      }
    },
    [onStatusChange, showNotifications, outletId, hookId],
  );

  useEffect(() => {
    const socketInstance = socket.current;
    if (!socketInstance || !isConnected || !businessId) return;

    // The gateway emits every transfer change to the business room (and additionally to
    // both outlet rooms). Joining only the business room gives exactly one delivery.
    joinRoom('business', { businessId });
    socketInstance.on('transfer:status_changed', handleTransferStatusChanged);

    return () => {
      socketInstance.off('transfer:status_changed', handleTransferStatusChanged);
      leaveRoom('business');
    };
  }, [socket, isConnected, businessId, handleTransferStatusChanged, joinRoom, leaveRoom]);

  return {
    isConnected,
    joinRoom,
    leaveRoom,
  };
}

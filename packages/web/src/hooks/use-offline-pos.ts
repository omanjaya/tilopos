/**
 * useOfflinePOS
 *
 * Provides offline-first POS transaction handling:
 * - Detects online/offline network state
 * - Queues POS transactions to IndexedDB (falls back to localStorage)
 * - Auto-syncs queued transactions when the device comes back online
 * - Exposes an offline indicator with the number of pending transactions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { syncEngine } from '@/services/sync-engine.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OfflineSyncStatus = 'idle' | 'syncing' | 'error';

export interface OfflinePOSTransaction {
  id: string;
  outletId: string;
  employeeId: string;
  shiftId: string;
  orderType: string;
  items: OfflineTransactionItem[];
  payments: OfflinePayment[];
  customerId?: string;
  tableId?: string;
  notes?: string;
  createdAt: number;
}

interface OfflineTransactionItem {
  productId: string;
  variantId?: string;
  quantity: number;
  modifierIds: string[];
  notes?: string;
}

interface OfflinePayment {
  method: string;
  amount: number;
  referenceNumber?: string;
}

interface UseOfflinePOSReturn {
  /** Whether the browser is currently offline */
  isOffline: boolean;
  /** Number of transactions waiting to be synced */
  pendingCount: number;
  /** Current sync status */
  syncStatus: OfflineSyncStatus;
  /** Manually trigger a sync of queued transactions */
  manualSync: () => Promise<void>;
  /** Queue a transaction locally (used when offline) */
  queueTransaction: (tx: Omit<OfflinePOSTransaction, 'id' | 'createdAt'>) => Promise<string>;
}

// ---------------------------------------------------------------------------
// LocalStorage fallback helpers
// ---------------------------------------------------------------------------

const LS_KEY = 'tilopos-offline-queue';

function getLSQueue(): OfflinePOSTransaction[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as OfflinePOSTransaction[]) : [];
  } catch {
    return [];
  }
}

function setLSQueue(queue: OfflinePOSTransaction[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(queue));
  } catch {
    // Storage full -- ignore
  }
}

function appendToLSQueue(tx: OfflinePOSTransaction): void {
  const queue = getLSQueue();
  queue.push(tx);
  setLSQueue(queue);
}

function removeFromLSQueue(id: string): void {
  const queue = getLSQueue().filter((t) => t.id !== id);
  setLSQueue(queue);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOfflinePOS(): UseOfflinePOSReturn {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<OfflineSyncStatus>('idle');
  const isSyncingRef = useRef(false);
  const dbReadyRef = useRef(false);

  // ---- Network listeners ----
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => {
      setIsOffline(false);
      // Auto-sync when connectivity returns
      void syncPending();
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- syncPending is stable via ref
  }, []);

  // ---- Initialize sync engine & count pending items ----
  useEffect(() => {
    const init = async () => {
      try {
        await syncEngine.initialize();
        dbReadyRef.current = true;
      } catch {
        // IndexedDB unavailable; fall back to localStorage
        dbReadyRef.current = false;
      }
      await refreshPendingCount();
    };

    void init();

    // Subscribe to sync engine events
    const handleQueued = () => void refreshPendingCount();
    const handleProcessed = () => void refreshPendingCount();
    const handleError = () => {
      setSyncStatus('error');
      void refreshPendingCount();
    };

    syncEngine.on('queued', handleQueued);
    syncEngine.on('queueProcessed', handleProcessed);
    syncEngine.on('syncError', handleError);

    return () => {
      syncEngine.off('queued', handleQueued);
      syncEngine.off('queueProcessed', handleProcessed);
      syncEngine.off('syncError', handleError);
    };
  }, []);

  // ---- Refresh pending count ----
  const refreshPendingCount = useCallback(async () => {
    if (dbReadyRef.current) {
      try {
        const status = await syncEngine.getQueueStatus();
        setPendingCount(status.pending + status.failed);
      } catch {
        // Fall through to localStorage count
        setPendingCount(getLSQueue().length);
      }
    } else {
      setPendingCount(getLSQueue().length);
    }
  }, []);

  // ---- Queue a transaction ----
  const queueTransaction = useCallback(
    async (tx: Omit<OfflinePOSTransaction, 'id' | 'createdAt'>): Promise<string> => {
      const id = `offline-tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const fullTx: OfflinePOSTransaction = {
        ...tx,
        id,
        createdAt: Date.now(),
      };

      if (dbReadyRef.current) {
        try {
          await syncEngine.queueOperation('transactions', id, 'create', fullTx);
        } catch {
          // Fallback
          appendToLSQueue(fullTx);
        }
      } else {
        appendToLSQueue(fullTx);
      }

      await refreshPendingCount();
      return id;
    },
    [refreshPendingCount],
  );

  // ---- Sync pending transactions ----
  const syncPending = useCallback(async () => {
    if (isSyncingRef.current || !navigator.onLine) return;

    isSyncingRef.current = true;
    setSyncStatus('syncing');

    try {
      // Sync via sync engine (IndexedDB)
      if (dbReadyRef.current) {
        await syncEngine.processQueue();
      }

      // Also sync any localStorage fallback items
      const lsQueue = getLSQueue();
      for (const tx of lsQueue) {
        try {
          const response = await fetch('/api/v1/transactions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
            },
            body: JSON.stringify(tx),
          });
          if (response.ok) {
            removeFromLSQueue(tx.id);
          }
        } catch {
          // Will retry on next sync
        }
      }

      setSyncStatus('idle');
    } catch {
      setSyncStatus('error');
    } finally {
      isSyncingRef.current = false;
      await refreshPendingCount();
    }
  }, [refreshPendingCount]);

  const manualSync = useCallback(async () => {
    await syncPending();
  }, [syncPending]);

  return {
    isOffline,
    pendingCount,
    syncStatus,
    manualSync,
    queueTransaction,
  };
}

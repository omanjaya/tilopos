/**
 * useOfflinePOS
 *
 * Offline-first POS transaction handling on top of the sync engine:
 * - detects online/offline state
 * - queues sales (IndexedDB, localStorage fallback inside the engine) with a
 *   `clientTransactionId` so the backend can de-duplicate replays
 * - syncs automatically when connectivity returns (engine-level lock, no double send)
 * - exposes failed / conflicting sales with retry and discard actions
 */

import { useState, useEffect, useCallback } from 'react';
import {
  syncEngine,
  toOfflineTransactionPayload,
  type OfflineTransactionInput,
  type OfflineTransactionPayload,
  type SyncQueueItem,
} from '@/services/sync';

export type OfflineSyncStatus = 'idle' | 'syncing' | 'error';

export interface OfflineProblemItem {
  id: string;
  clientTransactionId: string;
  occurredAt: string;
  total: number;
  status: 'failed' | 'conflict';
  error?: string;
}

interface UseOfflinePOSReturn {
  /** Whether the browser is currently offline */
  isOffline: boolean;
  /** Sales waiting to be sent (pending) */
  pendingCount: number;
  /** Sales the server rejected; need retry or discard */
  failedItems: OfflineProblemItem[];
  /** Current sync status */
  syncStatus: OfflineSyncStatus;
  /** Manually trigger a sync of queued transactions */
  manualSync: () => Promise<void>;
  /**
   * Queue a sale locally. Resolves with the stored payload (incl. clientTransactionId)
   * only after it was persisted; rejects if it could not be saved.
   */
  queueTransaction: (tx: OfflineTransactionInput) => Promise<OfflineTransactionPayload>;
  retryItem: (id: string) => Promise<void>;
  discardItem: (id: string) => Promise<void>;
}

function toProblemItem(item: SyncQueueItem): OfflineProblemItem {
  const data = item.data as Partial<OfflineTransactionPayload>;
  const total = (data.payments ?? []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  return {
    id: item.id,
    clientTransactionId: item.entityId,
    occurredAt: data.occurredAt ?? new Date(item.createdAt).toISOString(),
    total,
    status: item.status === 'conflict' ? 'conflict' : 'failed',
    error: item.error,
  };
}

export function useOfflinePOS(): UseOfflinePOSReturn {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedItems, setFailedItems] = useState<OfflineProblemItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<OfflineSyncStatus>('idle');

  const refresh = useCallback(async () => {
    try {
      const status = await syncEngine.getQueueStatus();
      setPendingCount(status.pending);
      const problems = await syncEngine.getProblemItems();
      setFailedItems(problems.map(toProblemItem));
      setSyncStatus((prev) => (prev === 'syncing' ? prev : problems.length > 0 ? 'error' : 'idle'));
    } catch (error) {
      console.warn('[offline-pos] cannot read offline queue', error);
      setSyncStatus('error');
    }
  }, []);

  // Network listeners
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false); // the engine itself syncs on 'online'

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Initialize engine (idempotent) and subscribe to its events
  useEffect(() => {
    let cancelled = false;
    syncEngine
      .initialize()
      .then(() => {
        if (!cancelled) void refresh();
      })
      .catch((error: unknown) => {
        console.error('[offline-pos] offline queue unavailable', error);
        if (!cancelled) setSyncStatus('error');
      });

    const onChange = () => void refresh();
    syncEngine.on('queued', onChange);
    syncEngine.on('queueProcessed', onChange);
    syncEngine.on('syncError', onChange);
    syncEngine.on('conflict', onChange);

    return () => {
      cancelled = true;
      syncEngine.off('queued', onChange);
      syncEngine.off('queueProcessed', onChange);
      syncEngine.off('syncError', onChange);
      syncEngine.off('conflict', onChange);
    };
  }, [refresh]);

  const queueTransaction = useCallback(
    async (tx: OfflineTransactionInput): Promise<OfflineTransactionPayload> => {
      const payload = toOfflineTransactionPayload(tx);
      await syncEngine.queueOperation('transactions', payload.clientTransactionId, 'create', payload);
      await refresh();
      return payload;
    },
    [refresh],
  );

  const manualSync = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncStatus('syncing');
    try {
      await syncEngine.processQueue();
      setSyncStatus('idle');
    } catch (error) {
      console.error('[offline-pos] sync failed', error);
      setSyncStatus('error');
    } finally {
      await refresh();
    }
  }, [refresh]);

  const retryItem = useCallback(
    async (id: string) => {
      await syncEngine.retryItem(id);
      await refresh();
    },
    [refresh],
  );

  const discardItem = useCallback(
    async (id: string) => {
      await syncEngine.discardItem(id);
      await refresh();
    },
    [refresh],
  );

  return {
    isOffline,
    pendingCount,
    failedItems,
    syncStatus,
    manualSync,
    queueTransaction,
    retryItem,
    discardItem,
  };
}

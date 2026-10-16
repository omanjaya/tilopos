import { useState, useEffect, useCallback, useRef } from 'react';
import { syncEngine } from '@/services/sync';

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'offline' | 'error';

interface SyncState {
  syncStatus: SyncStatus;
  pendingCount: number;
  failedCount: number;
  conflicts: number;
  lastSyncTime: number | null;
  isOnline: boolean;
}

interface UseSyncReturn extends SyncState {
  triggerSync: () => Promise<void>;
  /** Put a failed / conflicting item back in the queue and sync it now */
  retryItem: (id: string) => Promise<void>;
  /** Permanently drop a queued item (explicit user decision) */
  discardItem: (id: string) => Promise<void>;
}

const PERIODIC_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useSync(): UseSyncReturn {
  const [state, setState] = useState<SyncState>({
    syncStatus: navigator.onLine ? 'synced' : 'offline',
    pendingCount: 0,
    failedCount: 0,
    conflicts: 0,
    lastSyncTime: null,
    isOnline: navigator.onLine,
  });

  const periodicTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncingRef = useRef(false);

  const refreshQueueStatus = useCallback(async () => {
    try {
      const queueStatus = await syncEngine.getQueueStatus();
      setState(prev => {
        let syncStatus: SyncStatus;
        if (!prev.isOnline) {
          syncStatus = 'offline';
        } else if (isSyncingRef.current) {
          syncStatus = 'syncing';
        } else if (queueStatus.conflicts > 0 || queueStatus.failed > 0) {
          syncStatus = 'error';
        } else if (queueStatus.pending > 0) {
          syncStatus = 'pending';
        } else {
          syncStatus = 'synced';
        }

        return {
          ...prev,
          pendingCount: queueStatus.pending,
          failedCount: queueStatus.failed,
          conflicts: queueStatus.conflicts,
          syncStatus,
        };
      });
    } catch (error) {
      console.warn('[sync] cannot read queue status', error);
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return;

    isSyncingRef.current = true;
    setState(prev => ({ ...prev, syncStatus: 'syncing' }));

    try {
      await syncEngine.processQueue();
      setState(prev => ({
        ...prev,
        lastSyncTime: Date.now(),
      }));
    } catch (error) {
      console.error('[sync] sync run failed', error);
    } finally {
      isSyncingRef.current = false;
      await refreshQueueStatus();
    }
  }, [refreshQueueStatus]);

  const retryItem = useCallback(async (id: string) => {
    await syncEngine.retryItem(id);
    await refreshQueueStatus();
  }, [refreshQueueStatus]);

  const discardItem = useCallback(async (id: string) => {
    await syncEngine.discardItem(id);
    await refreshQueueStatus();
  }, [refreshQueueStatus]);

  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      // Auto-sync on reconnection
      void triggerSync();
    };

    const handleOffline = () => {
      setState(prev => ({
        ...prev,
        isOnline: false,
        syncStatus: 'offline',
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync]);

  // Subscribe to sync engine events
  useEffect(() => {
    const handleEvent = () => {
      void refreshQueueStatus();
    };

    const handleSyncComplete = () => {
      isSyncingRef.current = false;
      setState(prev => ({
        ...prev,
        lastSyncTime: Date.now(),
      }));
      void refreshQueueStatus();
    };

    // Note: Don't listen to 'online' as handleSyncStart — it sets syncing=true
    // but if syncEngine is not initialized, processQueue does nothing and
    // the status is never cleared. Let triggerSync handle the syncing state.
    syncEngine.on('queued', handleEvent);
    syncEngine.on('queueProcessed', handleSyncComplete);
    syncEngine.on('syncError', handleEvent);
    syncEngine.on('conflict', handleEvent);
    syncEngine.on('offline', handleEvent);

    return () => {
      syncEngine.off('queued', handleEvent);
      syncEngine.off('queueProcessed', handleSyncComplete);
      syncEngine.off('syncError', handleEvent);
      syncEngine.off('conflict', handleEvent);
      syncEngine.off('offline', handleEvent);
    };
  }, [refreshQueueStatus]);

  // Periodic sync every 5 minutes when online
  useEffect(() => {
    periodicTimerRef.current = setInterval(() => {
      if (navigator.onLine && !isSyncingRef.current) {
        void triggerSync();
      }
    }, PERIODIC_SYNC_INTERVAL);

    return () => {
      if (periodicTimerRef.current) {
        clearInterval(periodicTimerRef.current);
      }
    };
  }, [triggerSync]);

  // Initialize the engine (idempotent) so queued offline sales also sync outside the POS screen
  useEffect(() => {
    syncEngine
      .initialize()
      .then(() => refreshQueueStatus())
      .catch((error: unknown) => {
        console.error('[sync] offline queue unavailable', error);
        setState(prev => ({ ...prev, syncStatus: 'error' }));
      });
  }, [refreshQueueStatus]);

  return {
    ...state,
    triggerSync,
    retryItem,
    discardItem,
  };
}

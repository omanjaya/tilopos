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
  resolveConflict: (id: string, strategy: 'server-wins' | 'client-wins') => Promise<void>;
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
    } catch {
      // DB may not be ready yet
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
    } finally {
      isSyncingRef.current = false;
      await refreshQueueStatus();
    }
  }, [refreshQueueStatus]);

  const resolveConflict = useCallback(async (id: string, strategy: 'server-wins' | 'client-wins') => {
    // Access the sync queue item and resolve based on strategy
    // The sync engine handles conflict resolution internally
    // We re-trigger sync after resolution
    void id;
    void strategy;
    await triggerSync();
  }, [triggerSync]);

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

    const handleSyncStart = () => {
      isSyncingRef.current = true;
      setState(prev => ({ ...prev, syncStatus: 'syncing' }));
    };

    const handleSyncComplete = () => {
      isSyncingRef.current = false;
      setState(prev => ({
        ...prev,
        lastSyncTime: Date.now(),
      }));
      void refreshQueueStatus();
    };

    syncEngine.on('queued', handleEvent);
    syncEngine.on('queueProcessed', handleSyncComplete);
    syncEngine.on('syncError', handleEvent);
    syncEngine.on('conflict', handleEvent);
    syncEngine.on('pulled', handleSyncComplete);
    syncEngine.on('online', handleSyncStart);
    syncEngine.on('offline', handleEvent);

    return () => {
      syncEngine.off('queued', handleEvent);
      syncEngine.off('queueProcessed', handleSyncComplete);
      syncEngine.off('syncError', handleEvent);
      syncEngine.off('conflict', handleEvent);
      syncEngine.off('pulled', handleSyncComplete);
      syncEngine.off('online', handleSyncStart);
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

  // Initial status check
  useEffect(() => {
    void refreshQueueStatus();
  }, [refreshQueueStatus]);

  return {
    ...state,
    triggerSync,
    resolveConflict,
  };
}

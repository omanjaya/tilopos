/**
 * Sync Engine Service (Main Orchestrator)
 *
 * Persists offline operations (offline POS sales) and pushes them to the
 * backend when online. Guarantees:
 * - one queue run at a time (concurrent callers share the in-flight run);
 * - an item is marked 'syncing' before it is sent and each sale carries a
 *   `clientTransactionId`, so a retry after a crash cannot create a duplicate;
 * - items are only sent with the session of the user who created them;
 * - nothing is deleted on logout / 401: items leave the queue only after the
 *   server accepted them or the user explicitly discarded them.
 */

import { openDB, deleteDB } from 'idb';
import type {
  TiloPOSDB,
  SyncEngineConfig,
  EntityType,
  SyncOperation,
  SyncEvent,
  SyncQueueStatus,
  SyncQueueItem,
} from './types/sync.types';
import { DEFAULT_SYNC_CONFIG, SYNC_EVENTS, SYNC_STATUS } from './constants/sync.constants';
import { IdbSyncQueueStore, SyncQueueService, type SyncQueueStore } from './sync-queue.service';
import { LocalStorageSyncQueueStore, migrateLegacyLocalQueue } from './local-storage-queue.store';
import { SyncExecutorService, apiClientTransport, type SyncTransport } from './sync-executor.service';
import { ConflictResolverService } from './conflict-resolver.service';
import { RetryManagerService } from './retry-manager.service';
import { useAuthStore } from '@/stores/auth.store';

export interface SyncEngineDeps {
  transport?: SyncTransport;
  /** Opens the queue storage; defaults to IndexedDB with a localStorage fallback */
  openStore?: () => Promise<SyncQueueStore>;
  /** Id of the logged-in user; items are only sent for that user */
  getCurrentUserId?: () => string | null;
  now?: () => number;
}

export interface SyncRunResult {
  synced: number;
  failed: number;
  conflicts: number;
  /** Items still pending (offline, auth, backoff, other users) */
  remaining: number;
}

class SyncEngine {
  private config: SyncEngineConfig;
  private deps: Required<Omit<SyncEngineDeps, 'openStore'>> & Pick<SyncEngineDeps, 'openStore'>;
  private isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Map<string, Set<(event: SyncEvent) => void>> = new Map();
  private initPromise: Promise<void> | null = null;
  private running: Promise<SyncRunResult> | null = null;
  private closeStore: (() => void) | null = null;

  private queueService: SyncQueueService | null = null;
  private executorService: SyncExecutorService;
  private conflictResolver: ConflictResolverService;
  private retryManager: RetryManagerService;

  private readonly onOnline = () => this.handleOnline();
  private readonly onOffline = () => this.handleOffline();

  constructor(config?: Partial<SyncEngineConfig>, deps: SyncEngineDeps = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    this.deps = {
      transport: deps.transport ?? apiClientTransport,
      openStore: deps.openStore,
      getCurrentUserId: deps.getCurrentUserId ?? (() => useAuthStore.getState().user?.id ?? null),
      now: deps.now ?? (() => Date.now()),
    };
    this.executorService = new SyncExecutorService(this.deps.transport);
    this.conflictResolver = new ConflictResolverService(this.config.conflictStrategy);
    this.retryManager = new RetryManagerService(this.config.maxRetries);
  }

  /**
   * Initialize storage and background sync. Safe to call many times.
   */
  initialize(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.doInitialize().catch((error: unknown) => {
        this.initPromise = null;
        throw error;
      });
    }
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    const store = await (this.deps.openStore ? this.deps.openStore() : this.openDefaultStore());
    this.queueService = new SyncQueueService(store);
    await this.queueService.resetStuckSyncing();
    await migrateLegacyLocalQueue(this.queueService, this.config.maxRetries);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onOnline);
      window.addEventListener('offline', this.onOffline);
    }
    this.startSyncTimer();
    this.emit(SYNC_EVENTS.INITIALIZED, { timestamp: this.deps.now() });
  }

  private async openDefaultStore(): Promise<SyncQueueStore> {
    try {
      const db = await openDB<TiloPOSDB>(this.config.dbName, this.config.dbVersion, {
        upgrade(database) {
          if (!database.objectStoreNames.contains('syncQueue')) {
            const syncStore = database.createObjectStore('syncQueue', { keyPath: 'id' });
            syncStore.createIndex('by-status', 'status');
            syncStore.createIndex('by-timestamp', 'createdAt');
            syncStore.createIndex('by-entity', 'entityType');
          }
        },
      });
      this.closeStore = () => db.close();
      return new IdbSyncQueueStore(db);
    } catch (error) {
      console.warn('[sync] IndexedDB unavailable, using localStorage queue', error);
      return new LocalStorageSyncQueueStore();
    }
  }

  private startSyncTimer(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = setInterval(() => {
      if (this.isOnline) void this.processQueue();
    }, this.config.syncInterval);
  }

  private stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.emit(SYNC_EVENTS.ONLINE, { timestamp: this.deps.now() });
    void this.processQueue();
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.emit(SYNC_EVENTS.OFFLINE, { timestamp: this.deps.now() });
  }

  private async requireQueue(): Promise<SyncQueueService> {
    await this.initialize();
    if (!this.queueService) throw new Error('Antrean offline belum siap');
    return this.queueService;
  }

  /**
   * Queue an operation. `entityId` is the stable idempotency key
   * (for sales: the clientTransactionId); queuing the same id twice is a no-op.
   */
  async queueOperation<T>(
    entityType: EntityType,
    entityId: string,
    operation: SyncOperation,
    data: T,
  ): Promise<string> {
    const queue = await this.requireQueue();
    const ownerUserId = this.deps.getCurrentUserId();
    if (!ownerUserId) throw new Error('Login diperlukan untuk menyimpan transaksi offline');
    const id = await queue.addToQueue({
      id: `${entityType}:${entityId}`,
      entityType,
      entityId,
      operation,
      data,
      maxRetries: this.config.maxRetries,
      createdAt: this.deps.now(),
      ownerUserId,
    });

    this.emit(SYNC_EVENTS.QUEUED, { id, entityType, operation });
    if (this.isOnline) void this.processQueue();
    return id;
  }

  /**
   * Push pending items. Concurrent calls share the same run.
   */
  processQueue(): Promise<SyncRunResult> {
    if (this.running) return this.running;
    this.running = this.runQueue().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async runQueue(): Promise<SyncRunResult> {
    const result: SyncRunResult = { synced: 0, failed: 0, conflicts: 0, remaining: 0 };
    if (!this.isOnline || !this.queueService) return result;

    const queue = this.queueService;
    const pending = await queue.getPendingItems();

    for (let index = 0; index < pending.length; index++) {
      const item = pending[index]!;

      const userId = this.deps.getCurrentUserId();
      // Never send another user's sale with this session
      if (!userId || !item.ownerUserId || item.ownerUserId !== userId) {
        result.remaining++;
        continue;
      }

      // Backoff after server errors
      if (item.retryCount > 0 && item.lastAttemptAt) {
        const readyAt = item.lastAttemptAt + this.retryManager.calculateRetryDelay(item.retryCount - 1);
        if (readyAt > this.deps.now()) {
          result.remaining++;
          continue;
        }
      }

      await queue.update(item.id, { status: SYNC_STATUS.SYNCING, lastAttemptAt: this.deps.now() });

      try {
        await this.executorService.executeSyncOperation(item);
        await queue.removeFromQueue(item.id);
        result.synced++;
      } catch (error) {
        const outcome = await this.handleError(queue, item, error);
        if (outcome === 'stop') {
          // Offline or session expired: leave this and the rest pending
          result.remaining += pending.length - index;
          break;
        }
        if (outcome === 'failed') result.failed++;
        else if (outcome === 'conflict') result.conflicts++;
        else if (outcome === 'pending') result.remaining++;
      }
    }

    await queue.clearCompleted();

    this.emit(SYNC_EVENTS.QUEUE_PROCESSED, { ...result, timestamp: this.deps.now() });
    return result;
  }

  private async handleError(
    queue: SyncQueueService,
    item: SyncQueueItem,
    error: unknown,
  ): Promise<'stop' | 'failed' | 'conflict' | 'pending' | 'resolved'> {
    const err = error instanceof Error ? error : new Error(String(error));
    const kind = this.retryManager.classify(error);
    const status = (error as { status?: number }).status;

    switch (kind) {
      case 'network':
      case 'auth':
        await queue.update(item.id, { status: SYNC_STATUS.PENDING, error: err.message, lastStatus: status });
        this.emit(SYNC_EVENTS.SYNC_ERROR, { item, error: err, kind });
        return 'stop';
      case 'conflict': {
        const serverData = (error as { serverData?: unknown }).serverData;
        const resolution = this.conflictResolver.resolveConflict(item, serverData);
        if (resolution.resolved) {
          await queue.removeFromQueue(item.id);
          return 'resolved';
        }
        await queue.update(item.id, {
          status: SYNC_STATUS.CONFLICT,
          conflictData: serverData,
          error: err.message,
          lastStatus: 409,
        });
        this.emit(SYNC_EVENTS.CONFLICT, { item, serverData });
        return 'conflict';
      }
      case 'retryable': {
        const retryCount = item.retryCount + 1;
        const exhausted = !this.retryManager.shouldRetry({ retryCount, maxRetries: item.maxRetries });
        await queue.update(item.id, {
          status: exhausted ? SYNC_STATUS.FAILED : SYNC_STATUS.PENDING,
          retryCount,
          error: err.message,
          lastStatus: status,
        });
        this.emit(SYNC_EVENTS.SYNC_ERROR, { item, error: err, kind });
        return exhausted ? 'failed' : 'pending';
      }
      default:
        await queue.update(item.id, { status: SYNC_STATUS.FAILED, error: err.message, lastStatus: status });
        this.emit(SYNC_EVENTS.SYNC_ERROR, { item, error: err, kind });
        return 'failed';
    }
  }

  /** Put a failed / conflict item back in the queue and sync now */
  async retryItem(id: string): Promise<void> {
    const queue = await this.requireQueue();
    await queue.update(id, {
      status: SYNC_STATUS.PENDING,
      retryCount: 0,
      error: undefined,
      conflictData: undefined,
      lastAttemptAt: undefined,
    });
    this.emit(SYNC_EVENTS.QUEUED, { id });
    if (this.isOnline) await this.processQueue();
  }

  /** Permanently drop a queued item (explicit user decision) */
  async discardItem(id: string): Promise<void> {
    const queue = await this.requireQueue();
    await queue.removeFromQueue(id);
    this.emit(SYNC_EVENTS.QUEUE_PROCESSED, { discarded: id, timestamp: this.deps.now() });
  }

  /** Failed and conflict items of the current user, for the UI */
  async getProblemItems(): Promise<SyncQueueItem[]> {
    const queue = await this.requireQueue();
    const userId = this.deps.getCurrentUserId();
    const items = await queue.getProblemItems();
    return items.filter((i) => !i.ownerUserId || i.ownerUserId === userId);
  }

  /** Queue status of the current user */
  async getQueueStatus(): Promise<SyncQueueStatus> {
    if (!this.queueService) return { pending: 0, failed: 0, conflicts: 0 };
    return this.queueService.getQueueStatus(this.deps.getCurrentUserId() ?? undefined);
  }

  /** Items of any user that have not reached the server */
  async countUnsynced(): Promise<number> {
    const queue = await this.requireQueue();
    return queue.countUnsynced();
  }

  /**
   * Delete the offline database, but only when nothing is left to sync.
   * Returns false (and keeps everything) if unsynced items remain.
   */
  async purgeIfEmpty(): Promise<boolean> {
    const unsynced = await this.countUnsynced();
    if (unsynced > 0) return false;
    await this.deleteStorage();
    return true;
  }

  /** Explicit discard of every queued item followed by deletion of the offline database */
  async discardAll(): Promise<void> {
    const queue = await this.requireQueue();
    await queue.clearQueue();
    await this.deleteStorage();
  }

  private async deleteStorage(): Promise<void> {
    this.teardown();
    if (typeof indexedDB !== 'undefined') {
      await deleteDB(this.config.dbName);
    }
    LocalStorageSyncQueueStore.clearAll();
  }

  get online(): boolean {
    return this.isOnline;
  }

  on(event: string, callback: (event: SyncEvent) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (event: SyncEvent) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: Record<string, unknown>): void {
    const syncEvent: SyncEvent = { type: event, ...data };
    this.listeners.get(event)?.forEach((cb) => cb(syncEvent));
    this.listeners.get(SYNC_EVENTS.ALL)?.forEach((cb) => cb(syncEvent));
  }

  private teardown(): void {
    this.stopSyncTimer();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onOnline);
      window.removeEventListener('offline', this.onOffline);
    }
    this.closeStore?.();
    this.closeStore = null;
    this.queueService = null;
    this.initPromise = null;
  }

  destroy(): void {
    this.teardown();
    this.listeners.clear();
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();

export { SyncEngine };

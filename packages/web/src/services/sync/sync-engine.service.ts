/**
 * Sync Engine Service (Main Orchestrator)
 *
 * Coordinates sync operations between local IndexedDB and backend API.
 * Manages online/offline state and delegates to specialized services.
 */

import { openDB, IDBPDatabase } from 'idb';
import {
  TiloPOSDB,
  SyncEngineConfig,
  EntityType,
  SyncOperation,
  SyncEvent,
  SyncQueueStatus,
  SyncMetadata,
  SyncQueueItem,
} from './types/sync.types';
import { DEFAULT_SYNC_CONFIG, SYNC_EVENTS, VALID_STORE_NAMES } from './constants/sync.constants';
import { SyncQueueService } from './sync-queue.service';
import { SyncExecutorService, ConflictError } from './sync-executor.service';
import { ConflictResolverService } from './conflict-resolver.service';
import { RetryManagerService } from './retry-manager.service';

class SyncEngine {
  private db: IDBPDatabase<TiloPOSDB> | null = null;
  private config: SyncEngineConfig;
  private isOnline = navigator.onLine;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Map<string, Set<(event: SyncEvent) => void>> = new Map();

  // Specialized services
  private queueService!: SyncQueueService;
  private executorService!: SyncExecutorService;
  private conflictResolver!: ConflictResolverService;
  private retryManager!: RetryManagerService;

  constructor(config?: Partial<SyncEngineConfig>) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  /**
   * Initialize the database and services
   */
  async initialize(): Promise<void> {
    this.db = await this.initializeDatabase();

    // Initialize specialized services
    this.queueService = new SyncQueueService(this.db);
    this.executorService = new SyncExecutorService(this.db, {
      apiBaseUrl: this.config.apiBaseUrl,
    });
    this.conflictResolver = new ConflictResolverService(
      this.executorService,
      this.config.conflictStrategy
    );
    this.retryManager = new RetryManagerService(this.config.maxRetries);

    // Start background sync
    this.startSyncTimer();

    this.emit(SYNC_EVENTS.INITIALIZED, { timestamp: Date.now() });
  }

  /**
   * Initialize IndexedDB
   */
  private async initializeDatabase(): Promise<IDBPDatabase<TiloPOSDB>> {
    return openDB<TiloPOSDB>(this.config.dbName, this.config.dbVersion, {
      upgrade(db) {
        // Sync Queue
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('by-status', 'status');
          syncStore.createIndex('by-timestamp', 'createdAt');
          syncStore.createIndex('by-entity', 'entityType');
        }

        // Products
        if (!db.objectStoreNames.contains('products')) {
          const productsStore = db.createObjectStore('products', { keyPath: 'id' });
          productsStore.createIndex('by-outlet', 'data.outletId');
          productsStore.createIndex('by-category', 'data.categoryId');
        }

        // Categories
        if (!db.objectStoreNames.contains('categories')) {
          const categoriesStore = db.createObjectStore('categories', { keyPath: 'id' });
          categoriesStore.createIndex('by-outlet', 'data.outletId');
        }

        // Transactions
        if (!db.objectStoreNames.contains('transactions')) {
          const transactionsStore = db.createObjectStore('transactions', { keyPath: 'id' });
          transactionsStore.createIndex('by-outlet', 'data.outletId');
          transactionsStore.createIndex('by-status', 'data.status');
          transactionsStore.createIndex('by-date', 'data.createdAt');
        }

        // Customers
        if (!db.objectStoreNames.contains('customers')) {
          const customersStore = db.createObjectStore('customers', { keyPath: 'id' });
          customersStore.createIndex('by-phone', 'data.phone');
        }

        // Settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Metadata
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'entityType' });
        }
      },
    });
  }

  /**
   * Start background sync timer
   */
  private startSyncTimer(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);

    this.syncTimer = setInterval(() => {
      if (this.isOnline) this.processQueue();
    }, this.config.syncInterval);
  }

  /**
   * Stop sync timer
   */
  private stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    this.isOnline = true;
    this.emit(SYNC_EVENTS.ONLINE, { timestamp: Date.now() });
    this.processQueue();
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    this.isOnline = false;
    this.emit(SYNC_EVENTS.OFFLINE, { timestamp: Date.now() });
  }

  /**
   * Queue operation for sync
   */
  async queueOperation<T>(
    entityType: EntityType,
    entityId: string,
    operation: SyncOperation,
    data: T
  ): Promise<string> {
    const id = await this.queueService.addToQueue(
      entityType,
      entityId,
      operation,
      data,
      this.config.maxRetries
    );

    this.emit(SYNC_EVENTS.QUEUED, { id, entityType, operation });

    if (this.isOnline) this.processQueue();

    return id;
  }

  /**
   * Process sync queue
   */
  async processQueue(): Promise<void> {
    if (!this.isOnline) return;

    const pendingItems = await this.queueService.getPendingItems();

    for (const item of pendingItems) {
      try {
        await this.retryManager.executeWithRetry(
          async () => {
            await this.executorService.executeSyncOperation(item);
          },
          item,
          (attempt, delay) => {
            console.log(`Retry attempt ${attempt} for ${item.id} in ${delay}ms`);
          }
        );

        await this.queueService.updateItemStatus(item.id, 'completed');
      } catch (error) {
        if (error instanceof ConflictError) {
          await this.handleConflict(item, error.serverData);
        } else {
          await this.handleSyncError(item, error);
        }
      }
    }

    this.emit(SYNC_EVENTS.QUEUE_PROCESSED, {
      processed: pendingItems.length,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle sync conflict
   */
  private async handleConflict(item: SyncQueueItem, serverData: unknown): Promise<void> {
    const resolution = await this.conflictResolver.resolveConflict(item, serverData);

    if (resolution.resolved) {
      await this.queueService.updateItemStatus(item.id, 'completed');
    } else {
      await this.queueService.markAsConflict(item.id, serverData);
      this.emit(SYNC_EVENTS.CONFLICT, { item, serverData });
    }
  }

  /**
   * Handle sync error
   */
  private async handleSyncError(item: SyncQueueItem, error: unknown): Promise<void> {
    const err = error instanceof Error ? error : new Error(String(error));

    if (this.retryManager.isRetryableError(err)) {
      const retryCount = await this.queueService.incrementRetryCount(item.id);

      if (retryCount >= item.maxRetries) {
        await this.queueService.updateItemStatus(item.id, 'failed', err.message);
      }
    } else {
      await this.queueService.updateItemStatus(item.id, 'failed', err.message);
    }

    this.emit(SYNC_EVENTS.SYNC_ERROR, { item, error: err });
  }

  /**
   * Pull changes from server
   */
  async pullChanges(entityType: EntityType, outletId?: string): Promise<void> {
    if (!this.db || !this.isOnline) return;

    const metadata = await this.db.get('metadata', entityType);
    const since = metadata?.lastSyncAt || 0;

    const items = await this.executorService.pullChangesFromServer(
      entityType,
      since,
      outletId
    );

    // Update local cache
    const validStores = VALID_STORE_NAMES;
    if (validStores.includes(entityType as typeof validStores[number])) {
      await this.executorService.batchUpdateLocalCache(
        entityType as 'products' | 'categories' | 'transactions' | 'customers',
        items
      );
    }

    // Update metadata
    await this.db.put('metadata', {
      entityType,
      lastSyncAt: Date.now(),
      syncInProgress: false,
    } as SyncMetadata);

    this.emit(SYNC_EVENTS.PULLED, { entityType, count: items.length });
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<SyncQueueStatus> {
    return this.queueService.getQueueStatus();
  }

  /**
   * Get cached data (offline-first)
   */
  async getCached<T>(
    entityType: 'products' | 'categories' | 'transactions' | 'customers',
    id: string
  ): Promise<T | null> {
    if (!this.db) return null;

    const cached = await this.db.get(entityType, id);
    if (!cached || cached.isDeleted) return null;

    return cached.data as T;
  }

  /**
   * Get all cached entities
   */
  async getAllCached<T>(
    entityType: 'products' | 'categories' | 'transactions' | 'customers',
    filter?: { outletId?: string }
  ): Promise<T[]> {
    if (!this.db) return [];

    let items;

    if (filter?.outletId) {
      const allItems = await this.db.getAll(entityType);
      items = allItems.filter(
        (item) =>
          !item.isDeleted &&
          (item.data as { outletId?: string }).outletId === filter.outletId
      );
    } else {
      items = await this.db.getAll(entityType);
    }

    return items.filter((item) => !item.isDeleted).map((item) => item.data as T);
  }

  /**
   * Save entity locally with queue for sync
   */
  async saveLocal<T extends { id?: string }>(
    entityType: 'products' | 'categories' | 'transactions' | 'customers',
    data: T,
    operation: 'create' | 'update' = 'update'
  ): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = data.id || `local-${Date.now()}`;
    const cached = {
      id,
      data: { ...data, id },
      syncedAt: 0,
      localUpdatedAt: Date.now(),
      isDirty: true,
      isDeleted: false,
      version: Date.now(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.db.put(entityType, cached as any);
    await this.queueOperation(entityType, id, operation, data);

    return id;
  }

  /**
   * Delete entity locally with queue for sync
   */
  async deleteLocal(
    entityType: 'products' | 'categories' | 'transactions' | 'customers',
    id: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const cached = await this.db.get(entityType, id);
    if (cached) {
      cached.isDeleted = true;
      cached.localUpdatedAt = Date.now();
      cached.isDirty = true;
      await this.db.put(entityType, cached);
      await this.queueOperation(entityType, id, 'delete', null);
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    if (!this.db) return;

    const stores = ['products', 'categories', 'transactions', 'customers'] as const;
    for (const store of stores) {
      await this.db.clear(store);
    }
    await this.db.clear('metadata');
  }

  /**
   * Get online status
   */
  get online(): boolean {
    return this.isOnline;
  }

  /**
   * Event listeners
   */
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

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopSyncTimer();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.db?.close();
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();

export { SyncEngine };

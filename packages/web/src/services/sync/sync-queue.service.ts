/**
 * Sync Queue Service
 *
 * Persists offline operations (IndexedDB `syncQueue` store).
 * `SyncQueueStore` is the storage contract used by the SyncEngine so the
 * engine can be unit-tested with an in-memory implementation.
 */

import type { IDBPDatabase } from 'idb';
import type {
  TiloPOSDB,
  SyncQueueItem,
  SyncQueueStatus,
  SyncStatus,
} from './types/sync.types';
import { SYNC_STATUS } from './constants/sync.constants';

export interface SyncQueueStore {
  put(item: SyncQueueItem): Promise<void>;
  get(id: string): Promise<SyncQueueItem | undefined>;
  delete(id: string): Promise<void>;
  listByStatus(status: SyncStatus): Promise<SyncQueueItem[]>;
  listAll(): Promise<SyncQueueItem[]>;
  clear(): Promise<void>;
}

export class IdbSyncQueueStore implements SyncQueueStore {
  constructor(private db: IDBPDatabase<TiloPOSDB>) {}

  async put(item: SyncQueueItem): Promise<void> {
    await this.db.put('syncQueue', item);
  }

  get(id: string): Promise<SyncQueueItem | undefined> {
    return this.db.get('syncQueue', id);
  }

  delete(id: string): Promise<void> {
    return this.db.delete('syncQueue', id);
  }

  listByStatus(status: SyncStatus): Promise<SyncQueueItem[]> {
    return this.db.getAllFromIndex('syncQueue', 'by-status', status);
  }

  listAll(): Promise<SyncQueueItem[]> {
    return this.db.getAll('syncQueue');
  }

  clear(): Promise<void> {
    return this.db.clear('syncQueue');
  }
}

export class SyncQueueService {
  constructor(private store: SyncQueueStore) {}

  /**
   * Add a queue item. `id` must be unique and stable (for transactions: the clientTransactionId).
   */
  async addToQueue(item: Omit<SyncQueueItem, 'status' | 'retryCount'>): Promise<string> {
    const existing = await this.store.get(item.id);
    if (existing) return existing.id; // already queued (double tap) — idempotent
    await this.store.put({ ...item, status: SYNC_STATUS.PENDING, retryCount: 0 });
    return item.id;
  }

  /** Pending items, oldest first */
  async getPendingItems(): Promise<SyncQueueItem[]> {
    const items = await this.store.listByStatus(SYNC_STATUS.PENDING);
    return items.sort((a, b) => a.createdAt - b.createdAt);
  }

  getItem(id: string): Promise<SyncQueueItem | undefined> {
    return this.store.get(id);
  }

  async update(id: string, patch: Partial<SyncQueueItem>): Promise<SyncQueueItem | undefined> {
    const item = await this.store.get(id);
    if (!item) return undefined;
    const next = { ...item, ...patch };
    await this.store.put(next);
    return next;
  }

  /** Items that need user attention (failed or conflict) */
  async getProblemItems(): Promise<SyncQueueItem[]> {
    const [failed, conflicts] = await Promise.all([
      this.store.listByStatus(SYNC_STATUS.FAILED),
      this.store.listByStatus(SYNC_STATUS.CONFLICT),
    ]);
    return [...failed, ...conflicts].sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Items left in 'syncing' by a crashed/closed tab go back to 'pending'.
   * Safe because the backend de-duplicates on clientTransactionId.
   */
  async resetStuckSyncing(): Promise<void> {
    const stuck = await this.store.listByStatus(SYNC_STATUS.SYNCING);
    for (const item of stuck) {
      await this.store.put({ ...item, status: SYNC_STATUS.PENDING });
    }
  }

  removeFromQueue(id: string): Promise<void> {
    return this.store.delete(id);
  }

  async clearCompleted(): Promise<void> {
    const completed = await this.store.listByStatus(SYNC_STATUS.COMPLETED);
    for (const item of completed) {
      await this.store.delete(item.id);
    }
  }

  clearQueue(): Promise<void> {
    return this.store.clear();
  }

  /**
   * Status summary. `ownerUserId` limits the count to one user's items.
   * Items in 'syncing' count as pending.
   */
  async getQueueStatus(ownerUserId?: string): Promise<SyncQueueStatus> {
    const all = await this.store.listAll();
    const mine = ownerUserId ? all.filter((i) => !i.ownerUserId || i.ownerUserId === ownerUserId) : all;
    return {
      pending: mine.filter((i) => i.status === SYNC_STATUS.PENDING || i.status === SYNC_STATUS.SYNCING).length,
      failed: mine.filter((i) => i.status === SYNC_STATUS.FAILED).length,
      conflicts: mine.filter((i) => i.status === SYNC_STATUS.CONFLICT).length,
    };
  }

  /** Number of items (any user) not yet on the server */
  async countUnsynced(): Promise<number> {
    const all = await this.store.listAll();
    return all.filter((i) => i.status !== SYNC_STATUS.COMPLETED).length;
  }
}

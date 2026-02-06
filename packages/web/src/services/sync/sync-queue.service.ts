/**
 * Sync Queue Service
 *
 * Manages the sync queue for offline operations.
 * Handles adding, retrieving, updating, and removing queue items.
 */

import { IDBPDatabase } from 'idb';
import {
  TiloPOSDB,
  SyncQueueItem,
  EntityType,
  SyncOperation,
  SyncQueueStatus,
} from './types/sync.types';
import { SYNC_STATUS } from './constants/sync.constants';

export class SyncQueueService {
  constructor(private db: IDBPDatabase<TiloPOSDB>) {}

  /**
   * Add operation to sync queue
   */
  async addToQueue<T>(
    entityType: EntityType,
    entityId: string,
    operation: SyncOperation,
    data: T,
    maxRetries: number
  ): Promise<string> {
    const id = `${entityType}-${entityId}-${Date.now()}`;
    const item: SyncQueueItem = {
      id,
      entityType,
      entityId,
      operation,
      data,
      status: SYNC_STATUS.PENDING,
      retryCount: 0,
      maxRetries,
      createdAt: Date.now(),
    };

    await this.db.put('syncQueue', item);
    return id;
  }

  /**
   * Get all pending queue items
   */
  async getPendingItems(): Promise<SyncQueueItem[]> {
    const tx = this.db.transaction('syncQueue', 'readonly');
    const index = tx.store.index('by-status');
    return index.getAll(SYNC_STATUS.PENDING);
  }

  /**
   * Get all failed queue items
   */
  async getFailedItems(): Promise<SyncQueueItem[]> {
    const tx = this.db.transaction('syncQueue', 'readonly');
    const index = tx.store.index('by-status');
    return index.getAll(SYNC_STATUS.FAILED);
  }

  /**
   * Get all conflict queue items
   */
  async getConflictItems(): Promise<SyncQueueItem[]> {
    const tx = this.db.transaction('syncQueue', 'readonly');
    const index = tx.store.index('by-status');
    return index.getAll(SYNC_STATUS.CONFLICT);
  }

  /**
   * Get queue item by ID
   */
  async getQueueItem(id: string): Promise<SyncQueueItem | undefined> {
    return this.db.get('syncQueue', id);
  }

  /**
   * Update queue item status
   */
  async updateItemStatus(
    id: string,
    status: SyncQueueItem['status'],
    error?: string
  ): Promise<void> {
    const item = await this.getQueueItem(id);
    if (!item) return;

    item.status = status;
    if (status === SYNC_STATUS.COMPLETED) {
      item.syncedAt = Date.now();
    }
    if (error) {
      item.error = error;
    }

    await this.db.put('syncQueue', item);
  }

  /**
   * Update queue item with conflict data
   */
  async markAsConflict(id: string, conflictData: unknown): Promise<void> {
    const item = await this.getQueueItem(id);
    if (!item) return;

    item.status = SYNC_STATUS.CONFLICT;
    item.conflictData = conflictData;

    await this.db.put('syncQueue', item);
  }

  /**
   * Increment retry count for queue item
   */
  async incrementRetryCount(id: string): Promise<number> {
    const item = await this.getQueueItem(id);
    if (!item) return 0;

    item.retryCount++;
    await this.db.put('syncQueue', item);

    return item.retryCount;
  }

  /**
   * Remove item from queue
   */
  async removeFromQueue(id: string): Promise<void> {
    await this.db.delete('syncQueue', id);
  }

  /**
   * Clear completed items from queue
   */
  async clearCompleted(): Promise<void> {
    const tx = this.db.transaction('syncQueue', 'readwrite');
    const index = tx.store.index('by-status');
    const completedItems = await index.getAll(SYNC_STATUS.COMPLETED);

    for (const item of completedItems) {
      await tx.store.delete(item.id);
    }

    await tx.done;
  }

  /**
   * Get queue status summary
   */
  async getQueueStatus(): Promise<SyncQueueStatus> {
    const pending = await this.db.countFromIndex(
      'syncQueue',
      'by-status',
      SYNC_STATUS.PENDING
    );
    const failed = await this.db.countFromIndex(
      'syncQueue',
      'by-status',
      SYNC_STATUS.FAILED
    );
    const conflicts = await this.db.countFromIndex(
      'syncQueue',
      'by-status',
      SYNC_STATUS.CONFLICT
    );

    return { pending, failed, conflicts };
  }

  /**
   * Get all queue items for specific entity type
   */
  async getItemsByEntityType(entityType: EntityType): Promise<SyncQueueItem[]> {
    const tx = this.db.transaction('syncQueue', 'readonly');
    const index = tx.store.index('by-entity');
    return index.getAll(entityType);
  }

  /**
   * Clear all queue items
   */
  async clearQueue(): Promise<void> {
    await this.db.clear('syncQueue');
  }

  /**
   * Get queue item count
   */
  async getQueueCount(): Promise<number> {
    const tx = this.db.transaction('syncQueue', 'readonly');
    return tx.store.count();
  }
}

/**
 * Sync Executor Service
 *
 * Executes sync operations by sending them to the backend API.
 * Handles HTTP requests and response processing.
 */

import { IDBPDatabase } from 'idb';
import {
  TiloPOSDB,
  SyncQueueItem,
  CachedEntity,
  EntityType,
} from './types/sync.types';
import { HTTP_STATUS, VALID_STORE_NAMES } from './constants/sync.constants';

export interface SyncExecutorConfig {
  apiBaseUrl: string;
}

export class SyncExecutorService {
  constructor(
    private db: IDBPDatabase<TiloPOSDB>,
    private config: SyncExecutorConfig
  ) {}

  /**
   * Execute sync operation for a queue item
   */
  async executeSyncOperation(item: SyncQueueItem): Promise<void> {
    const endpoint = `${this.config.apiBaseUrl}/${item.entityType}`;

    const options: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    switch (item.operation) {
      case 'create':
        options.method = 'POST';
        options.body = JSON.stringify(item.data);
        break;
      case 'update':
        options.method = 'PUT';
        options.body = JSON.stringify(item.data);
        break;
      case 'delete':
        options.method = 'DELETE';
        break;
    }

    const url =
      item.operation === 'create'
        ? endpoint
        : `${endpoint}/${item.entityId}`;

    const response = await fetch(url, options);

    if (!response.ok) {
      // Check for conflict (409)
      if (response.status === HTTP_STATUS.CONFLICT) {
        const serverData = await response.json();
        throw new ConflictError('Sync conflict detected', serverData);
      }

      throw new Error(`Sync failed: ${response.statusText}`);
    }

    // Update local cache with server response if available
    if (response.status !== HTTP_STATUS.NO_CONTENT) {
      try {
        const serverData = await response.json();
        await this.updateLocalCache(item.entityType, item.entityId, serverData);
      } catch {
        // Response might not have JSON body, ignore
      }
    }
  }

  /**
   * Force push local version to server (for client-wins strategy)
   */
  async forcePushToServer(item: SyncQueueItem): Promise<void> {
    const endpoint = `${this.config.apiBaseUrl}/${item.entityType}/${item.entityId}`;

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Force-Update': 'true',
      },
      body: JSON.stringify(item.data),
    });

    if (!response.ok) {
      throw new Error(`Force push failed: ${response.statusText}`);
    }
  }

  /**
   * Pull changes from server
   */
  async pullChangesFromServer(
    entityType: EntityType,
    since: number,
    outletId?: string
  ): Promise<unknown[]> {
    const params = new URLSearchParams();
    params.set('since', new Date(since).toISOString());
    if (outletId) {
      params.set('outletId', outletId);
    }

    const response = await fetch(
      `${this.config.apiBaseUrl}/${entityType}?${params}`,
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to pull ${entityType}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update local cache with server data
   */
  async updateLocalCache(
    entityType: EntityType,
    entityId: string,
    data: unknown
  ): Promise<void> {
    // Only update cache for valid entity stores
    const validStores = VALID_STORE_NAMES;
    if (!validStores.includes(entityType as typeof validStores[number])) {
      return;
    }

    const cached: CachedEntity<unknown> = {
      id: entityId,
      data,
      syncedAt: Date.now(),
      isDirty: false,
      isDeleted: false,
      version: Date.now(),
    };

    // Put operation with type assertion for dynamic entity type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.db.put(entityType as any, cached as any);
  }

  /**
   * Batch update local cache with multiple items
   */
  async batchUpdateLocalCache(
    entityType: 'products' | 'categories' | 'transactions' | 'customers',
    items: unknown[]
  ): Promise<void> {
    const tx = this.db.transaction(entityType, 'readwrite');

    for (const item of items) {
      const itemWithId = item as { id: string };
      const cached: CachedEntity<unknown> = {
        id: itemWithId.id,
        data: item,
        syncedAt: Date.now(),
        isDirty: false,
        isDeleted: false,
        version: Date.now(),
      };
      // Put operation with type assertion for dynamic entity type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await tx.store.put(cached as any);
    }

    await tx.done;
  }

  /**
   * Check server connectivity
   */
  async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Custom error for sync conflicts
 */
export class ConflictError extends Error {
  constructor(
    message: string,
    public serverData: unknown
  ) {
    super(message);
    this.name = 'ConflictError';
  }
}

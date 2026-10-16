/**
 * Sync Engine Type Definitions
 */

import { DBSchema } from 'idb';

// Entity Types
export type EntityType =
  | 'products'
  | 'categories'
  | 'transactions'
  | 'customers'
  | 'orders'
  | 'settings';

export type SyncOperation = 'create' | 'update' | 'delete';

export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed' | 'conflict';

/**
 * How a 409 from the server is handled.
 * - 'server-wins': drop the local update/delete (never applied to creates, see ConflictResolverService)
 * - 'manual': keep the item as 'conflict' until the user retries or discards it
 */
export type ConflictStrategy = 'server-wins' | 'manual';

// Sync Queue Item
export interface SyncQueueItem {
  id: string;
  entityType: EntityType;
  entityId: string;
  operation: SyncOperation;
  data: unknown;
  status: SyncStatus;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  /** User (auth user id) that created the item; only that user's session may sync it */
  ownerUserId?: string;
  lastAttemptAt?: number;
  syncedAt?: number;
  error?: string;
  /** HTTP status of the last failed attempt, if any */
  lastStatus?: number;
  conflictData?: unknown;
}

// Database Schema
export interface TiloPOSDB extends DBSchema {
  // Sync queue for offline operations
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-status': string;
      'by-timestamp': number;
      'by-entity': string;
    };
  };
}

// Sync Engine Configuration
export interface SyncEngineConfig {
  dbName: string;
  dbVersion: number;
  syncInterval: number; // ms
  maxRetries: number;
  conflictStrategy: ConflictStrategy;
}

// Sync Events
export interface SyncEvent {
  type: string;
  [key: string]: unknown;
}

// Sync Queue Status
export interface SyncQueueStatus {
  pending: number;
  failed: number;
  conflicts: number;
}

// Conflict Resolution Result
export interface ConflictResolution {
  resolved: boolean;
  strategy: ConflictStrategy;
  data?: unknown;
}

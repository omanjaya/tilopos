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

export type ConflictStrategy = 'server-wins' | 'client-wins' | 'manual';

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
  syncedAt?: number;
  error?: string;
  conflictData?: unknown;
}

// Cached Entity
export interface CachedEntity<T> {
  id: string;
  data: T;
  syncedAt: number;
  localUpdatedAt?: number;
  isDirty: boolean;
  isDeleted: boolean;
  version: number;
}

// Sync Metadata
export interface SyncMetadata {
  entityType: EntityType;
  lastSyncAt: number;
  lastSyncCursor?: string;
  syncInProgress: boolean;
}

// Entity Interfaces
export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  categoryId?: string;
  outletId: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  outletId: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  outletId: string;
  status: string;
  total: number;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
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

  // Cached entities
  products: {
    key: string;
    value: CachedEntity<Product>;
    indexes: {
      'by-outlet': string;
      'by-category': string;
    };
  };

  categories: {
    key: string;
    value: CachedEntity<Category>;
    indexes: {
      'by-outlet': string;
    };
  };

  transactions: {
    key: string;
    value: CachedEntity<Transaction>;
    indexes: {
      'by-outlet': string;
      'by-status': string;
      'by-date': string;
    };
  };

  customers: {
    key: string;
    value: CachedEntity<Customer>;
    indexes: {
      'by-phone': string;
    };
  };

  // Settings & metadata
  settings: {
    key: string;
    value: unknown;
  };

  metadata: {
    key: string;
    value: SyncMetadata;
  };
}

// Sync Engine Configuration
export interface SyncEngineConfig {
  dbName: string;
  dbVersion: number;
  syncInterval: number; // ms
  maxRetries: number;
  conflictStrategy: ConflictStrategy;
  apiBaseUrl: string;
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

// Retry Options
export interface RetryOptions {
  maxRetries: number;
  backoffFactor: number;
  maxBackoff: number;
}

// Conflict Resolution Result
export interface ConflictResolution {
  resolved: boolean;
  strategy: ConflictStrategy;
  data?: unknown;
}

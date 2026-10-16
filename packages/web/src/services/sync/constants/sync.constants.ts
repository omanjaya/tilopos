/**
 * Sync Engine Constants
 */

import type { EntityType, SyncEngineConfig } from '../types/sync.types';

// Default Configuration
export const DEFAULT_SYNC_CONFIG: SyncEngineConfig = {
  dbName: 'tilopos-offline',
  dbVersion: 1,
  syncInterval: 30000, // 30 seconds
  maxRetries: 3,
  // Offline sales are creates; a 409 must never silently discard them.
  conflictStrategy: 'manual',
};

/**
 * Name of the IndexedDB database used for the offline queue.
 * Deleted only after a successful full sync or an explicit discard (never on logout / 401).
 */
export const OFFLINE_DB_NAME = DEFAULT_SYNC_CONFIG.dbName;

/**
 * Backend endpoints (relative to apiClient baseURL, e.g. /api/v1) that accept queued creates.
 * Only entity types listed here can be synced.
 */
export const SYNC_CREATE_ENDPOINTS: Partial<Record<EntityType, string>> = {
  transactions: '/pos/transactions',
};

// Retry Configuration
export const RETRY_CONFIG = {
  BACKOFF_FACTOR: 2, // Exponential backoff multiplier
  MAX_BACKOFF: 60000, // Max 60 seconds between retries
  INITIAL_DELAY: 1000, // Start with 1 second delay
};

// Entity Type Constants
export const ENTITY_TYPES = {
  PRODUCTS: 'products' as const,
  CATEGORIES: 'categories' as const,
  TRANSACTIONS: 'transactions' as const,
  CUSTOMERS: 'customers' as const,
  ORDERS: 'orders' as const,
  SETTINGS: 'settings' as const,
};

// Sync Status Constants
export const SYNC_STATUS = {
  PENDING: 'pending' as const,
  SYNCING: 'syncing' as const,
  COMPLETED: 'completed' as const,
  FAILED: 'failed' as const,
  CONFLICT: 'conflict' as const,
};

// Sync Event Types
export const SYNC_EVENTS = {
  INITIALIZED: 'initialized',
  ONLINE: 'online',
  OFFLINE: 'offline',
  QUEUED: 'queued',
  QUEUE_PROCESSED: 'queueProcessed',
  SYNC_ERROR: 'syncError',
  CONFLICT: 'conflict',
  ALL: '*',
};

// HTTP Status Codes
export const HTTP_STATUS = {
  CONFLICT: 409,
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

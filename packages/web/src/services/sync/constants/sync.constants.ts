/**
 * Sync Engine Constants
 */

import { SyncEngineConfig } from '../types/sync.types';

// Default Configuration
export const DEFAULT_SYNC_CONFIG: SyncEngineConfig = {
  dbName: 'tilopos-offline',
  dbVersion: 1,
  syncInterval: 30000, // 30 seconds
  maxRetries: 3,
  conflictStrategy: 'server-wins',
  apiBaseUrl: '/api',
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
  PULLED: 'pulled',
  ALL: '*',
};

// Valid Store Names for Cache Operations
export const VALID_STORE_NAMES = [
  'products',
  'categories',
  'transactions',
  'customers',
] as const;

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

// Conflict Strategy Headers
export const CONFLICT_HEADERS = {
  FORCE_UPDATE: 'X-Force-Update',
};

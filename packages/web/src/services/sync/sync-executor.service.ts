/**
 * Sync Executor Service
 *
 * Sends one queue item to the backend. HTTP goes through a `SyncTransport`
 * whose default implementation uses `apiClient` (same base URL and Bearer
 * token as the rest of the app) with the global error handler disabled, so a
 * background sync never shows toasts or forces a logout.
 */

import type { SyncQueueItem } from './types/sync.types';
import { HTTP_STATUS, SYNC_CREATE_ENDPOINTS } from './constants/sync.constants';

export interface SyncTransportResponse {
  status: number;
  data: unknown;
}

/**
 * Performs an HTTP request relative to the API base URL.
 * Must resolve for every HTTP status and reject only on network failure.
 */
export interface SyncTransport {
  post(path: string, body: unknown, ownerUserId?: string): Promise<SyncTransportResponse>;
}

/** Error with the HTTP status of a failed sync attempt */
export class SyncHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'SyncHttpError';
  }

  /** Server errors, timeouts and rate limits are worth retrying automatically */
  get retryable(): boolean {
    return this.status >= 500 || this.status === 408 || this.status === 429;
  }

  /** Session problem: keep the item pending until the owner logs in again */
  get isAuthError(): boolean {
    return this.status === HTTP_STATUS.UNAUTHORIZED;
  }
}

/** The request never reached the server (offline, DNS, CORS, timeout) */
export class SyncNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncNetworkError';
  }
}

/** Custom error for sync conflicts (HTTP 409) */
export class ConflictError extends Error {
  constructor(
    message: string,
    public serverData: unknown,
  ) {
    super(message);
    this.name = 'ConflictError';
  }
}

function extractMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'message' in data) {
    const msg = (data as { message: unknown }).message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
  }
  return fallback;
}

export class SyncExecutorService {
  constructor(private transport: SyncTransport) {}

  /**
   * Execute sync operation for a queue item.
   * Resolves with the server response body on 2xx; throws SyncHttpError,
   * ConflictError or SyncNetworkError otherwise.
   */
  async executeSyncOperation(item: SyncQueueItem): Promise<unknown> {
    const endpoint = SYNC_CREATE_ENDPOINTS[item.entityType];
    if (item.operation !== 'create' || !endpoint) {
      // Only offline creates are queued; anything else is a programming error.
      throw new SyncHttpError(
        HTTP_STATUS.BAD_REQUEST,
        `Operasi sinkronisasi tidak didukung: ${item.operation} ${item.entityType}`,
      );
    }

    let response: SyncTransportResponse;
    try {
      response = await this.transport.post(endpoint, item.data, item.ownerUserId);
    } catch (error) {
      throw new SyncNetworkError(error instanceof Error ? error.message : String(error));
    }

    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }

    if (response.status === HTTP_STATUS.CONFLICT) {
      throw new ConflictError(extractMessage(response.data, 'Konflik data saat sinkronisasi'), response.data);
    }

    throw new SyncHttpError(
      response.status,
      extractMessage(response.data, `Sinkronisasi gagal (HTTP ${response.status})`),
      response.data,
    );
  }
}

/**
 * Default transport: apiClient with the global interceptor toasts / 401 logout skipped.
 * Imported lazily to avoid a module cycle (apiClient -> auth.store -> sync).
 */
export const apiClientTransport: SyncTransport = {
  async post(path, body, ownerUserId) {
    const { apiClient } = await import('@/api/client');
    try {
      const res = await apiClient.post(path, body, {
        skipGlobalErrorHandler: true,
        ownerUserId,
      });
      return { status: res.status, data: res.data };
    } catch (error) {
      const { default: axios } = await import('axios');
      if (axios.isAxiosError(error) && error.response) {
        return { status: error.response.status, data: error.response.data };
      }
      throw error;
    }
  },
};

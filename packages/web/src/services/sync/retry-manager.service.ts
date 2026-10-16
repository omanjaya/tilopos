/**
 * Retry Manager Service
 *
 * Classifies sync errors. There is no in-loop sleeping: each queue run makes
 * one attempt per item and the next run (timer / online event / manual) retries.
 */

import type { SyncQueueItem } from './types/sync.types';
import { RETRY_CONFIG } from './constants/sync.constants';
import { ConflictError, SyncHttpError, SyncNetworkError } from './sync-executor.service';

export type SyncErrorKind = 'network' | 'auth' | 'retryable' | 'conflict' | 'fatal';

export class RetryManagerService {
  constructor(private maxRetries: number = 3) {}

  classify(error: unknown): SyncErrorKind {
    if (error instanceof SyncNetworkError) return 'network';
    if (error instanceof ConflictError) return 'conflict';
    if (error instanceof SyncHttpError) {
      if (error.isAuthError) return 'auth';
      return error.retryable ? 'retryable' : 'fatal';
    }
    // Unknown (e.g. IndexedDB) errors: retry on the next run
    return 'retryable';
  }

  /** Whether an item may be attempted again automatically after `retryCount` failures */
  shouldRetry(item: Pick<SyncQueueItem, 'retryCount' | 'maxRetries'>): boolean {
    return item.retryCount < (item.maxRetries ?? this.maxRetries);
  }

  /** Exponential backoff delay (ms) before an item with `retryCount` failures is attempted again */
  calculateRetryDelay(retryCount: number): number {
    const delay = RETRY_CONFIG.INITIAL_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_FACTOR, retryCount);
    return Math.min(delay, RETRY_CONFIG.MAX_BACKOFF);
  }
}

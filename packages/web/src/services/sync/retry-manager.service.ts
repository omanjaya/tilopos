/**
 * Retry Manager Service
 *
 * Manages retry logic for failed sync operations.
 * Implements exponential backoff and max retry limits.
 */

import { SyncQueueItem, RetryOptions } from './types/sync.types';
import { RETRY_CONFIG } from './constants/sync.constants';

export class RetryManagerService {
  private retryOptions: RetryOptions;

  constructor(maxRetries: number = 3) {
    this.retryOptions = {
      maxRetries,
      backoffFactor: RETRY_CONFIG.BACKOFF_FACTOR,
      maxBackoff: RETRY_CONFIG.MAX_BACKOFF,
    };
  }

  /**
   * Check if item should be retried
   */
  shouldRetry(item: SyncQueueItem): boolean {
    return item.retryCount < item.maxRetries;
  }

  /**
   * Calculate delay before next retry (exponential backoff)
   */
  calculateRetryDelay(retryCount: number): number {
    const delay =
      RETRY_CONFIG.INITIAL_DELAY *
      Math.pow(this.retryOptions.backoffFactor, retryCount);

    // Cap at max backoff
    return Math.min(delay, this.retryOptions.maxBackoff);
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    item: SyncQueueItem,
    onRetry?: (attempt: number, delay: number) => void
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= item.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry if we've exceeded max retries
        if (attempt >= item.maxRetries) {
          break;
        }

        // Calculate delay and wait
        const delay = this.calculateRetryDelay(attempt);
        if (onRetry) {
          onRetry(attempt + 1, delay);
        }

        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Check if retry should be attempted based on error type
   */
  isRetryableError(error: Error): boolean {
    // Network errors are retryable
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      return true;
    }

    // 5xx server errors are retryable
    if (error.message.includes('500') || error.message.includes('503')) {
      return true;
    }

    // Timeout errors are retryable
    if (error.message.includes('timeout')) {
      return true;
    }

    // 4xx client errors are generally not retryable
    if (
      error.message.includes('400') ||
      error.message.includes('401') ||
      error.message.includes('403') ||
      error.message.includes('404')
    ) {
      return false;
    }

    // Conflict errors are not retryable (need conflict resolution)
    if (error.message.includes('409') || error.name === 'ConflictError') {
      return false;
    }

    // Default to retryable
    return true;
  }

  /**
   * Get retry status for item
   */
  getRetryStatus(item: SyncQueueItem): {
    canRetry: boolean;
    retriesLeft: number;
    nextRetryDelay: number;
  } {
    const canRetry = this.shouldRetry(item);
    const retriesLeft = Math.max(0, item.maxRetries - item.retryCount);
    const nextRetryDelay = canRetry
      ? this.calculateRetryDelay(item.retryCount)
      : 0;

    return {
      canRetry,
      retriesLeft,
      nextRetryDelay,
    };
  }

  /**
   * Reset retry count for item (useful for manual retry)
   */
  resetRetryCount(item: SyncQueueItem): SyncQueueItem {
    return {
      ...item,
      retryCount: 0,
      error: undefined,
    };
  }

  /**
   * Update retry options
   */
  setRetryOptions(options: Partial<RetryOptions>): void {
    this.retryOptions = {
      ...this.retryOptions,
      ...options,
    };
  }

  /**
   * Get current retry options
   */
  getRetryOptions(): RetryOptions {
    return { ...this.retryOptions };
  }

  /**
   * Calculate total max retry time
   */
  calculateMaxRetryTime(maxRetries: number): number {
    let totalTime = 0;
    for (let i = 0; i < maxRetries; i++) {
      totalTime += this.calculateRetryDelay(i);
    }
    return totalTime;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Execute with timeout
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      this.timeout(timeoutMs),
    ]) as Promise<T>;
  }

  /**
   * Timeout promise
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timeout')), ms)
    );
  }

  /**
   * Batch retry multiple items
   */
  async batchRetry<T>(
    items: SyncQueueItem[],
    operation: (item: SyncQueueItem) => Promise<T>,
    options?: {
      maxConcurrent?: number;
      onItemComplete?: (item: SyncQueueItem, result: T | Error) => void;
    }
  ): Promise<Array<{ item: SyncQueueItem; result: T | Error }>> {
    const maxConcurrent = options?.maxConcurrent || 3;
    const results: Array<{ item: SyncQueueItem; result: T | Error }> = [];
    const executing: Promise<void>[] = [];

    for (const item of items) {
      const promise = (async () => {
        try {
          const result = await this.executeWithRetry(
            () => operation(item),
            item
          );
          results.push({ item, result });
          if (options?.onItemComplete) {
            options.onItemComplete(item, result);
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          results.push({ item, result: err });
          if (options?.onItemComplete) {
            options.onItemComplete(item, err);
          }
        }
      })();

      executing.push(promise);

      if (executing.length >= maxConcurrent) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex((p) => p === promise),
          1
        );
      }
    }

    await Promise.all(executing);
    return results;
  }
}

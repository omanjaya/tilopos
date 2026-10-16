/**
 * Conflict Resolver Service
 *
 * Decides what happens when the server answers 409 for a queued item.
 * Creates (offline sales) are NEVER auto-resolved: dropping them would lose a
 * sale, so they stay in 'conflict' until the cashier retries or discards them.
 */

import type { SyncQueueItem, ConflictStrategy, ConflictResolution } from './types/sync.types';

export class ConflictResolverService {
  constructor(private strategy: ConflictStrategy) {}

  resolveConflict(item: SyncQueueItem, serverData: unknown): ConflictResolution {
    if (item.operation === 'create' || this.strategy === 'manual') {
      return {
        resolved: false,
        strategy: 'manual',
        data: { local: item.data, server: serverData },
      };
    }

    // server-wins for update/delete: the server copy stays, the local change is dropped
    return { resolved: true, strategy: 'server-wins', data: serverData };
  }

  setStrategy(strategy: ConflictStrategy): void {
    this.strategy = strategy;
  }

  getStrategy(): ConflictStrategy {
    return this.strategy;
  }
}

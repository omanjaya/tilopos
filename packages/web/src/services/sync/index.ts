/**
 * Sync Engine - Public API
 *
 * Main exports and backward compatibility layer
 */

export { syncEngine, SyncEngine } from './sync-engine.service';
export { SyncQueueService } from './sync-queue.service';
export { SyncExecutorService, ConflictError } from './sync-executor.service';
export { ConflictResolverService } from './conflict-resolver.service';
export { RetryManagerService } from './retry-manager.service';

// Export types
export * from './types/sync.types';

// Export constants
export * from './constants/sync.constants';

// React hook for sync status
import { syncEngine } from './sync-engine.service';

export function useSyncStatus() {
  return {
    isOnline: syncEngine.online,
    queueStatus: syncEngine.getQueueStatus(),
  };
}

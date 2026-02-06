/**
 * Conflict Resolver Service
 *
 * Handles sync conflicts between local and server data.
 * Supports multiple resolution strategies: server-wins, client-wins, manual.
 */

import {
  SyncQueueItem,
  ConflictStrategy,
  ConflictResolution,
} from './types/sync.types';
import { SyncExecutorService } from './sync-executor.service';

export class ConflictResolverService {
  constructor(
    private executor: SyncExecutorService,
    private strategy: ConflictStrategy
  ) {}

  /**
   * Resolve conflict based on configured strategy
   */
  async resolveConflict(
    item: SyncQueueItem,
    serverData: unknown
  ): Promise<ConflictResolution> {
    switch (this.strategy) {
      case 'server-wins':
        return this.resolveServerWins(item, serverData);

      case 'client-wins':
        return this.resolveClientWins(item);

      case 'manual':
        return this.resolveManual(item, serverData);

      default:
        throw new Error(`Unknown conflict strategy: ${this.strategy}`);
    }
  }

  /**
   * Server-wins strategy: Accept server version
   */
  private async resolveServerWins(
    item: SyncQueueItem,
    serverData: unknown
  ): Promise<ConflictResolution> {
    // Update local cache with server data
    await this.executor.updateLocalCache(
      item.entityType,
      item.entityId,
      serverData
    );

    return {
      resolved: true,
      strategy: 'server-wins',
      data: serverData,
    };
  }

  /**
   * Client-wins strategy: Force push local version
   */
  private async resolveClientWins(
    item: SyncQueueItem
  ): Promise<ConflictResolution> {
    // Force push client version to server
    await this.executor.forcePushToServer(item);

    return {
      resolved: true,
      strategy: 'client-wins',
      data: item.data,
    };
  }

  /**
   * Manual strategy: Mark for manual resolution
   */
  private resolveManual(
    item: SyncQueueItem,
    serverData: unknown
  ): ConflictResolution {
    // Don't auto-resolve, return conflict info for manual handling
    return {
      resolved: false,
      strategy: 'manual',
      data: {
        local: item.data,
        server: serverData,
        item,
      },
    };
  }

  /**
   * Apply manual resolution
   */
  async applyManualResolution(
    item: SyncQueueItem,
    useServerVersion: boolean,
    customData?: unknown
  ): Promise<ConflictResolution> {
    if (customData) {
      // Use custom merged data
      await this.executor.forcePushToServer({
        ...item,
        data: customData,
      });
      await this.executor.updateLocalCache(
        item.entityType,
        item.entityId,
        customData
      );

      return {
        resolved: true,
        strategy: 'manual',
        data: customData,
      };
    }

    if (useServerVersion) {
      // Use server version
      if (!item.conflictData) {
        throw new Error('No server data available for conflict resolution');
      }
      return this.resolveServerWins(item, item.conflictData);
    } else {
      // Use client version
      return this.resolveClientWins(item);
    }
  }

  /**
   * Detect if data has conflicts
   */
  detectConflict(
    localData: unknown,
    serverData: unknown,
    localVersion: number,
    serverVersion: number
  ): boolean {
    // Simple version-based conflict detection
    if (localVersion !== serverVersion) {
      return true;
    }

    // Deep equality check for data conflicts
    return JSON.stringify(localData) !== JSON.stringify(serverData);
  }

  /**
   * Merge conflicting data (simple field-level merge)
   */
  mergeData(
    localData: Record<string, unknown>,
    serverData: Record<string, unknown>,
    preferLocal: string[] = []
  ): Record<string, unknown> {
    const merged = { ...serverData };

    // Prefer local values for specified fields
    for (const field of preferLocal) {
      if (field in localData) {
        merged[field] = localData[field];
      }
    }

    return merged;
  }

  /**
   * Get conflict details for display
   */
  getConflictDetails(item: SyncQueueItem): {
    localData: unknown;
    serverData: unknown;
    entityType: string;
    entityId: string;
    operation: string;
  } | null {
    if (!item.conflictData) {
      return null;
    }

    return {
      localData: item.data,
      serverData: item.conflictData,
      entityType: item.entityType,
      entityId: item.entityId,
      operation: item.operation,
    };
  }

  /**
   * Update conflict strategy
   */
  setStrategy(strategy: ConflictStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Get current strategy
   */
  getStrategy(): ConflictStrategy {
    return this.strategy;
  }
}

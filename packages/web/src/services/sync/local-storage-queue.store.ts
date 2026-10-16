/**
 * localStorage-backed queue storage, used only when IndexedDB cannot be opened.
 * Also migrates the legacy `tilopos-offline-queue` (pre-2026-09 offline sales)
 * into the current queue so no unsynced sale is lost on upgrade.
 */

import type { SyncQueueItem, SyncStatus } from './types/sync.types';
import type { SyncQueueService, SyncQueueStore } from './sync-queue.service';
import { toOfflineTransactionPayload, type OfflineTransactionInput } from './offline-transaction';

const STORE_KEY = 'tilopos-offline-sync-queue';
export const LEGACY_QUEUE_KEY = 'tilopos-offline-queue';

function read(): SyncQueueItem[] {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SyncQueueItem[]) : [];
  } catch (error) {
    // Corrupted value: keep the raw copy so it can be recovered manually
    console.warn('[sync] localStorage queue is corrupted, backing it up', error);
    localStorage.setItem(`${STORE_KEY}-corrupt-${Date.now()}`, raw);
    localStorage.removeItem(STORE_KEY);
    return [];
  }
}

function write(items: SyncQueueItem[]): void {
  // Let QuotaExceededError propagate: the caller must know the sale was not saved
  localStorage.setItem(STORE_KEY, JSON.stringify(items));
}

export class LocalStorageSyncQueueStore implements SyncQueueStore {
  static clearAll(): void {
    localStorage.removeItem(STORE_KEY);
  }

  async put(item: SyncQueueItem): Promise<void> {
    const items = read().filter((i) => i.id !== item.id);
    items.push(item);
    write(items);
  }

  async get(id: string): Promise<SyncQueueItem | undefined> {
    return read().find((i) => i.id === id);
  }

  async delete(id: string): Promise<void> {
    write(read().filter((i) => i.id !== id));
  }

  async listByStatus(status: SyncStatus): Promise<SyncQueueItem[]> {
    return read().filter((i) => i.status === status);
  }

  async listAll(): Promise<SyncQueueItem[]> {
    return read();
  }

  async clear(): Promise<void> {
    localStorage.removeItem(STORE_KEY);
  }
}

interface LegacyOfflineTransaction extends OfflineTransactionInput {
  id?: string;
  employeeId?: string;
  createdAt?: number;
}

/**
 * Move sales from the legacy localStorage queue into the sync queue (whitelisted payload,
 * fresh clientTransactionId). The legacy key is removed only after every item was stored.
 */
export async function migrateLegacyLocalQueue(queue: SyncQueueService, maxRetries: number): Promise<number> {
  const raw = localStorage.getItem(LEGACY_QUEUE_KEY);
  if (!raw) return 0;

  let legacy: LegacyOfflineTransaction[];
  try {
    const parsed: unknown = JSON.parse(raw);
    legacy = Array.isArray(parsed) ? (parsed as LegacyOfflineTransaction[]) : [];
  } catch (error) {
    console.warn('[sync] legacy offline queue is not valid JSON; left untouched', error);
    return 0;
  }

  for (const tx of legacy) {
    const payload = toOfflineTransactionPayload({ ...tx, occurredAt: tx.createdAt ?? Date.now() });
    await queue.addToQueue({
      id: `transactions:${payload.clientTransactionId}`,
      entityType: 'transactions',
      entityId: payload.clientTransactionId,
      operation: 'create',
      data: payload,
      maxRetries,
      createdAt: tx.createdAt ?? Date.now(),
      ownerUserId: tx.employeeId,
    });
  }
  localStorage.removeItem(LEGACY_QUEUE_KEY);
  return legacy.length;
}

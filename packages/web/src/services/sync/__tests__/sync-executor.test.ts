import { describe, it, expect, vi } from 'vitest';
import {
  SyncExecutorService,
  SyncHttpError,
  SyncNetworkError,
  ConflictError,
  type SyncTransport,
} from '../sync-executor.service';
import type { SyncQueueItem } from '../types/sync.types';

function item(overrides: Partial<SyncQueueItem> = {}): SyncQueueItem {
  return {
    id: 'transactions:abc',
    entityType: 'transactions',
    entityId: 'abc',
    operation: 'create',
    data: { clientTransactionId: 'abc' },
    status: 'pending',
    retryCount: 0,
    maxRetries: 3,
    createdAt: 0,
    ...overrides,
  };
}

function executor(post: SyncTransport['post']) {
  return new SyncExecutorService({ post: vi.fn(post) });
}

describe('SyncExecutorService', () => {
  it('POSTs creates to the real backend path relative to the apiClient base URL', async () => {
    const post = vi.fn(async () => ({ status: 201, data: { ok: true } }));
    const ex = new SyncExecutorService({ post });
    await expect(ex.executeSyncOperation(item())).resolves.toEqual({ ok: true });
    expect(post).toHaveBeenCalledWith('/pos/transactions', { clientTransactionId: 'abc' }, undefined);
  });

  it('maps HTTP failures to typed errors', async () => {
    await expect(executor(async () => ({ status: 409, data: {} })).executeSyncOperation(item())).rejects.toBeInstanceOf(
      ConflictError,
    );

    const err400 = await executor(async () => ({ status: 400, data: { message: ['a', 'b'] } }))
      .executeSyncOperation(item())
      .catch((e: unknown) => e);
    expect(err400).toBeInstanceOf(SyncHttpError);
    expect((err400 as SyncHttpError).retryable).toBe(false);
    expect((err400 as SyncHttpError).message).toBe('a, b');

    const err500 = await executor(async () => ({ status: 500, data: {} }))
      .executeSyncOperation(item())
      .catch((e: unknown) => e);
    expect((err500 as SyncHttpError).retryable).toBe(true);

    const err401 = await executor(async () => ({ status: 401, data: {} }))
      .executeSyncOperation(item())
      .catch((e: unknown) => e);
    expect((err401 as SyncHttpError).isAuthError).toBe(true);
  });

  it('wraps transport rejections as network errors', async () => {
    await expect(
      executor(async () => {
        throw new TypeError('Failed to fetch');
      }).executeSyncOperation(item()),
    ).rejects.toBeInstanceOf(SyncNetworkError);
  });

  it('rejects unsupported operations instead of calling a non-existent endpoint', async () => {
    const post = vi.fn();
    const ex = new SyncExecutorService({ post });
    await expect(ex.executeSyncOperation(item({ operation: 'update' }))).rejects.toBeInstanceOf(SyncHttpError);
    await expect(ex.executeSyncOperation(item({ entityType: 'products' }))).rejects.toBeInstanceOf(SyncHttpError);
    expect(post).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncEngine } from '../sync-engine.service';
import type { SyncQueueStore } from '../sync-queue.service';
import type { SyncQueueItem, SyncStatus } from '../types/sync.types';
import type { SyncTransport, SyncTransportResponse } from '../sync-executor.service';
import { toOfflineTransactionPayload } from '../offline-transaction';

class MemoryStore implements SyncQueueStore {
  items = new Map<string, SyncQueueItem>();
  async put(item: SyncQueueItem) {
    this.items.set(item.id, { ...item });
  }
  async get(id: string) {
    const item = this.items.get(id);
    return item ? { ...item } : undefined;
  }
  async delete(id: string) {
    this.items.delete(id);
  }
  async listByStatus(status: SyncStatus) {
    return [...this.items.values()].filter((i) => i.status === status).map((i) => ({ ...i }));
  }
  async listAll() {
    return [...this.items.values()].map((i) => ({ ...i }));
  }
  async clear() {
    this.items.clear();
  }
}

function sale(overrides: Partial<Parameters<typeof toOfflineTransactionPayload>[0]> = {}) {
  return toOfflineTransactionPayload({
    outletId: 'outlet-1',
    shiftId: 'shift-1',
    orderType: 'takeaway',
    items: [{ productId: 'p1', quantity: 2 }],
    payments: [{ method: 'cash', amount: 20000 }],
    ...overrides,
  });
}

function setup(respond: (path: string, body: unknown) => Promise<SyncTransportResponse>, userId = 'user-1') {
  const store = new MemoryStore();
  const post = vi.fn(respond);
  const transport: SyncTransport = { post };
  let currentUser: string | null = userId;
  let now = 1_000_000;
  const engine = new SyncEngine(
    { syncInterval: 60 * 60 * 1000 },
    {
      transport,
      openStore: async () => store,
      getCurrentUserId: () => currentUser,
      now: () => now,
    },
  );
  return {
    store,
    post,
    engine,
    setUser: (id: string | null) => {
      currentUser = id;
    },
    advance: (ms: number) => {
      now += ms;
    },
  };
}

const ok = async (): Promise<SyncTransportResponse> => ({ status: 201, data: { transactionId: 'tx-1' } });

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

describe('SyncEngine', () => {
  it('posts a queued sale once to /pos/transactions with clientTransactionId and occurredAt, then removes it', async () => {
    const { engine, post, store } = setup(ok);
    await engine.initialize();
    const payload = sale();

    await engine.queueOperation('transactions', payload.clientTransactionId, 'create', payload);
    await engine.processQueue();

    expect(post).toHaveBeenCalledTimes(1);
    const [path, body] = post.mock.calls[0]!;
    expect(path).toBe('/pos/transactions');
    expect(body).toMatchObject({
      clientTransactionId: payload.clientTransactionId,
      occurredAt: payload.occurredAt,
      outletId: 'outlet-1',
      shiftId: 'shift-1',
    });
    expect(store.items.size).toBe(0);
    engine.destroy();
  });

  it('never runs two queue passes concurrently (no duplicate POST)', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const { engine, post } = setup(async () => {
      await gate;
      return { status: 201, data: {} };
    });
    await engine.initialize();
    // Queue while "offline" so queueOperation does not start a run itself
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    window.dispatchEvent(new Event('offline'));
    const payload = sale();
    await engine.queueOperation('transactions', payload.clientTransactionId, 'create', payload);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    window.dispatchEvent(new Event('online')); // starts run #1

    const second = engine.processQueue();
    const third = engine.processQueue();
    release();
    await Promise.all([second, third]);

    expect(post).toHaveBeenCalledTimes(1);
    engine.destroy();
  });

  it('queuing the same clientTransactionId twice stores one item', async () => {
    const { engine, store } = setup(async () => {
      throw new TypeError('Failed to fetch');
    });
    await engine.initialize();
    const payload = sale();
    await engine.queueOperation('transactions', payload.clientTransactionId, 'create', payload);
    await engine.queueOperation('transactions', payload.clientTransactionId, 'create', payload);
    expect(store.items.size).toBe(1);
    engine.destroy();
  });

  it('keeps the item pending on network failure and on 401 (never deletes it)', async () => {
    let status: 'network' | 401 = 'network';
    const { engine, store } = setup(async () => {
      if (status === 'network') throw new TypeError('Failed to fetch');
      return { status: 401, data: { message: 'Unauthorized' } };
    });
    await engine.initialize();
    const payload = sale();
    await engine.queueOperation('transactions', payload.clientTransactionId, 'create', payload);
    await engine.processQueue();
    expect([...store.items.values()][0]!.status).toBe('pending');

    status = 401;
    await engine.processQueue();
    const item = [...store.items.values()][0]!;
    expect(item.status).toBe('pending');
    expect(item.retryCount).toBe(0);
    engine.destroy();
  });

  it('marks a 4xx validation error as failed and allows retry / discard', async () => {
    let response: SyncTransportResponse = { status: 400, data: { message: ['shiftId must be a string'] } };
    const { engine, store, post } = setup(async () => response);
    await engine.initialize();
    const payload = sale();
    const id = await engine.queueOperation('transactions', payload.clientTransactionId, 'create', payload);
    await engine.processQueue();

    const failed = store.items.get(id)!;
    expect(failed.status).toBe('failed');
    expect(failed.error).toContain('shiftId');
    expect(await engine.getProblemItems()).toHaveLength(1);

    response = { status: 201, data: {} };
    await engine.retryItem(id);
    expect(store.items.has(id)).toBe(false);
    expect(post).toHaveBeenCalledTimes(2);

    // discard path
    response = { status: 400, data: { message: 'bad' } };
    const p2 = sale();
    const id2 = await engine.queueOperation('transactions', p2.clientTransactionId, 'create', p2);
    await engine.processQueue();
    await engine.discardItem(id2);
    expect(store.items.size).toBe(0);
    engine.destroy();
  });

  it('never auto-resolves a 409 on a create: the sale stays as conflict', async () => {
    const { engine, store } = setup(async () => ({ status: 409, data: { message: 'Shift closed' } }));
    await engine.initialize();
    const payload = sale();
    const id = await engine.queueOperation('transactions', payload.clientTransactionId, 'create', payload);
    await engine.processQueue();
    expect(store.items.get(id)!.status).toBe('conflict');
    engine.destroy();
  });

  it('retries 5xx with backoff and gives up after maxRetries', async () => {
    const { engine, store, post, advance } = setup(async () => ({ status: 503, data: {} }));
    await engine.initialize();
    const payload = sale();
    const id = await engine.queueOperation('transactions', payload.clientTransactionId, 'create', payload);
    await engine.processQueue();
    expect(store.items.get(id)!.status).toBe('pending');
    expect(store.items.get(id)!.retryCount).toBe(1);

    // still in backoff: not sent again
    await engine.processQueue();
    expect(post).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 3; i++) {
      advance(120_000);
      await engine.processQueue();
    }
    expect(store.items.get(id)!.status).toBe('failed');
    engine.destroy();
  });

  it("does not send another user's sale with the current session", async () => {
    const { engine, post, setUser, store } = setup(ok, 'user-A');
    await engine.initialize();
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    window.dispatchEvent(new Event('offline'));
    const payload = sale();
    await engine.queueOperation('transactions', payload.clientTransactionId, 'create', payload);

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    setUser('user-B');
    window.dispatchEvent(new Event('online'));
    await engine.processQueue();
    expect(post).not.toHaveBeenCalled();
    expect(store.items.size).toBe(1);
    expect(await engine.countUnsynced()).toBe(1);

    setUser('user-A');
    await engine.processQueue();
    expect(post).toHaveBeenCalledTimes(1);
    expect(store.items.size).toBe(0);
    engine.destroy();
  });

  it('resets items stuck in "syncing" (crashed tab) back to pending on init', async () => {
    const { engine, store, post } = setup(ok);
    const payload = sale();
    await store.put({
      id: `transactions:${payload.clientTransactionId}`,
      entityType: 'transactions',
      entityId: payload.clientTransactionId,
      operation: 'create',
      data: payload,
      status: 'syncing',
      retryCount: 0,
      maxRetries: 3,
      createdAt: 1,
      ownerUserId: 'user-1',
    });
    await engine.initialize();
    await engine.processQueue();
    expect(post).toHaveBeenCalledTimes(1);
    expect(store.items.size).toBe(0);
    engine.destroy();
  });

  it('does not send an old operator sale after the session changes mid-batch', async () => {
    const context = setup(async () => { context.setUser('user-2'); return ok(); });
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    await context.engine.initialize();
    for (let i = 0; i < 2; i++) {
      const payload = sale();
      await context.engine.queueOperation('transactions', payload.clientTransactionId, 'create', payload);
    }
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    window.dispatchEvent(new Event('online'));
    await context.engine.processQueue();
    expect(context.post).toHaveBeenCalledTimes(1);
    expect(context.store.items.size).toBe(1);
    context.engine.destroy();
  });

  it('keeps legacy sales pending until their original employee signs in', async () => {
    localStorage.setItem('tilopos-offline-queue', JSON.stringify([{ ...sale(), employeeId: 'original' }]));
    const { engine, post, store } = setup(ok, 'other');
    await engine.initialize();
    await engine.processQueue();
    expect(post).not.toHaveBeenCalled();
    expect([...store.items.values()][0]?.ownerUserId).toBe('original');
    engine.destroy();
  });

  it('migrates the legacy localStorage queue with a whitelisted payload', async () => {
    localStorage.setItem(
      'tilopos-offline-queue',
      JSON.stringify([
        {
          id: 'offline-tx-1',
          createdAt: 1700000000000,
          employeeId: 'emp-1',
          outletId: 'outlet-1',
          shiftId: 'shift-1',
          orderType: 'dine_in',
          items: [{ productId: 'p1', quantity: 1, modifierIds: [] }],
          payments: [{ method: 'cash', amount: 1000 }],
        },
      ]),
    );
    const { engine, post } = setup(ok, 'emp-1');
    await engine.initialize();
    await engine.processQueue();

    expect(localStorage.getItem('tilopos-offline-queue')).toBeNull();
    expect(post).toHaveBeenCalledTimes(1);
    const body = post.mock.calls[0]![1] as Record<string, unknown>;
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('employeeId');
    expect(body).not.toHaveProperty('createdAt');
    expect(body.occurredAt).toBe(new Date(1700000000000).toISOString());
    expect(typeof body.clientTransactionId).toBe('string');
    engine.destroy();
  });
});

describe('toOfflineTransactionPayload', () => {
  it('strips fields the backend DTO rejects and keeps idempotency fields', () => {
    const payload = toOfflineTransactionPayload({
      outletId: 'o',
      shiftId: 's',
      orderType: 'dine_in',
      items: [{ productId: 'p', quantity: 1, modifierIds: [], notes: undefined }],
      payments: [{ method: 'cash', amount: 5 }],
      customerId: undefined,
      ...({ id: 'local', employeeId: 'e', createdAt: 1 } as object),
    });
    expect(Object.keys(payload).sort()).toEqual(
      ['clientTransactionId', 'items', 'occurredAt', 'orderType', 'outletId', 'payments', 'shiftId'].sort(),
    );
    expect(payload.items[0]).toEqual({ productId: 'p', quantity: 1 });
    expect(payload.clientTransactionId).toMatch(/^[0-9a-f-]{36}$/);
  });
});

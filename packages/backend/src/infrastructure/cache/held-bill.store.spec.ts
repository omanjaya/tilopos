import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { HeldBillStore, HeldBillData } from './held-bill.store';

const integration = process.env.HELD_BILL_TEST_REDIS_URL ? describe : describe.skip;
integration('Held bills in Redis', () => {
  let redis: Redis;
  let store: HeldBillStore;
  let bill: HeldBillData;
  beforeAll(() => {
    redis = new Redis(process.env.HELD_BILL_TEST_REDIS_URL!);
    store = new HeldBillStore(redis);
  });
  beforeEach(() => {
    bill = {
      id: randomUUID(),
      businessId: randomUUID(),
      outletId: randomUUID(),
      employeeId: randomUUID(),
      items: [{ productId: randomUUID(), quantity: 1 }],
      heldAt: new Date().toISOString(),
      requestHash: 'same-request',
    };
  });
  afterAll(async () => {
    await redis.quit();
  });

  it('holds idempotently without overwriting a previously saved snapshot', async () => {
    await store.hold(bill);
    await store.hold({ ...bill, heldAt: 'different' });
    const page = await store.list(bill.businessId, bill.outletId);
    expect(page.bills).toEqual([bill]);
    await expect(store.hold({ ...bill, requestHash: 'different-request' })).rejects.toThrow();
  });
  it('isolates businesses and outlets', async () => {
    await store.hold(bill);
    expect((await store.list(randomUUID(), bill.outletId)).bills).toEqual([]);
    expect((await store.list(bill.businessId, randomUUID())).bills).toEqual([]);
    expect(await store.resume(randomUUID(), bill.outletId, bill.id)).toBeNull();
    expect(await store.resume(bill.businessId, randomUUID(), bill.id)).toBeNull();
  });
  it('lets only one terminal claim a bill, while retrying the winning request is safe', async () => {
    await store.hold(bill);
    const requests = [randomUUID(), randomUUID()];
    const results = await Promise.all(
      requests.map((id) =>
        store.resume(bill.businessId, bill.outletId, bill.id, id, bill.employeeId),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    const winner = results.findIndex(Boolean);
    expect(
      await store.resume(
        bill.businessId,
        bill.outletId,
        bill.id,
        requests[winner],
        bill.employeeId,
      ),
    ).toEqual(bill);
    expect(
      await store.resume(bill.businessId, bill.outletId, bill.id, requests[winner], randomUUID()),
    ).toBeNull();
    await expect(store.hold(bill)).rejects.toThrow();
    expect((await store.list(bill.businessId, bill.outletId)).bills).toEqual([]);
  });
  it('does not expire open bills after 24 hours', async () => {
    await store.hold(bill);
    const keys = await redis.keys(`*${bill.businessId}*`);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(await redis.ttl(key)).toBe(-1);
  });
  it('deletes idempotently and refuses to resurrect a deleted bill', async () => {
    await store.hold(bill);
    await store.discard(bill.businessId, bill.outletId, bill.id);
    await store.discard(bill.businessId, bill.outletId, bill.id);
    await expect(store.hold(bill)).rejects.toThrow();
    expect(await store.resume(bill.businessId, bill.outletId, bill.id)).toBeNull();
  });
});

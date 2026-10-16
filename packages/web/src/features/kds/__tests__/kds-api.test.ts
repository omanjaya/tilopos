import { describe, it, expect } from 'vitest';
import { groupStationItems, type KdsStationOrdersResponse } from '@/api/endpoints/kds.api';

function item(overrides: Partial<KdsStationOrdersResponse['items'][number]>) {
  return {
    id: 'i1',
    orderId: 'o1',
    orderNumber: 'ORD-001',
    productId: 'p1',
    productName: 'Nasi Goreng',
    quantity: 1,
    station: null,
    status: 'pending',
    notes: null,
    startedAt: null,
    completedAt: null,
    createdAt: '2026-09-27T03:00:00.000Z',
    tableId: null,
    orderType: 'dine_in',
    priority: 0,
    customerId: null,
    orderNotes: null,
    tableName: null,
    modifiers: [],
    ...overrides,
  };
}

describe('groupStationItems (GET /kds/orders contract)', () => {
  it('groups flat backend items into per-order KDS cards', () => {
    const now = new Date('2026-09-27T03:12:30.000Z').getTime();
    const orders = groupStationItems(
      {
        items: [
          item({ id: 'i1', orderId: 'o1', priority: 10, createdAt: '2026-09-27T03:02:00.000Z' }),
          item({ id: 'i2', orderId: 'o2', orderNumber: 'ORD-002', priority: 5, tableName: 'Meja 4' }),
          item({ id: 'i3', orderId: 'o1', status: 'served', createdAt: '2026-09-27T03:00:00.000Z' }),
        ],
        summary: { total: 3, pending: 2, preparing: 0, ready: 0, served: 1, completed: 1 },
      },
      now,
    );

    expect(orders).toHaveLength(2);
    const o1 = orders[0]!;
    const o2 = orders[1]!;
    expect(o1.id).toBe('o1');
    expect(o1.priority).toBe('vip');
    expect(o1.items.map((i) => i.id)).toEqual(['i1', 'i3']);
    expect(o1.items[1]!.status).toBe('served');
    // earliest item defines order age
    expect(o1.createdAt).toBe('2026-09-27T03:00:00.000Z');
    expect(o1.elapsedMinutes).toBe(12);
    expect(o2.priority).toBe('urgent');
    expect(o2.items[0]!.modifiers).toEqual([]);
    expect(o2.tableName).toBe('Meja 4');
    expect(o1.tableName).toBeNull();
  });

  it('returns an empty list for an empty response', () => {
    expect(
      groupStationItems({ items: [], summary: { total: 0, pending: 0, preparing: 0, ready: 0, served: 0, completed: 0 } }),
    ).toEqual([]);
  });
});

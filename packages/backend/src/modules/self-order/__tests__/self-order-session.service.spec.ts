import { ConflictException } from '@nestjs/common';
import { SelfOrderSessionService } from '../self-order-session.service';
import type { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { EventBusService } from '../../../infrastructure/events/event-bus.service';
import type { DocumentNumberService } from '../../../shared/numbering';

/**
 * In-memory fake of the pieces of Prisma used by submitSession. The session row
 * is shared, so the conditional updateMany behaves like the real DB: only the
 * first caller moves it from 'active' to 'submitted'.
 */
function makePrisma() {
  const session = {
    id: 'sess-1',
    outletId: 'outlet-1',
    tableId: 'table-1' as string | null,
    status: 'active',
    expiresAt: new Date(Date.now() + 60_000),
    outlet: { businessId: 'biz-1' },
  };
  const orders: unknown[] = [];

  const tx = {
    selfOrderSession: {
      updateMany: jest.fn(async ({ where, data }) => {
        if (where.id === session.id && session.status === where.status) {
          session.status = data.status;
          return { count: 1 };
        }
        return { count: 0 };
      }),
    },
    selfOrderItem: {
      findMany: jest.fn(async () => [
        { productId: 'prod-1', variantId: null, quantity: 2, notes: null, modifiers: [] },
      ]),
    },
    product: {
      findMany: jest.fn(async ({ where }) => {
        expect(where.businessId).toBe('biz-1');
        return [{ id: 'prod-1', name: 'Nasi Goreng' }];
      }),
    },
    modifier: { findMany: jest.fn(async () => []) },
    order: {
      create: jest.fn(async ({ data }) => {
        const row = { id: `order-${orders.length + 1}`, orderNumber: 'ORD-20260927-0001', ...data };
        orders.push(row);
        return { id: row.id, orderNumber: row.orderNumber };
      }),
    },
    table: { updateMany: jest.fn(async () => ({ count: 1 })) },
  };

  const prisma = {
    selfOrderSession: {
      // Both requests read the session before either has committed.
      findUnique: jest.fn(async () => ({ ...session, status: 'active' })),
    },
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  return { prisma, tx, orders, session };
}

describe('SelfOrderSessionService.submitSession', () => {
  it('creates exactly one kitchen order when the same session is submitted twice', async () => {
    const { prisma, tx, orders } = makePrisma();
    const eventBus = { publish: jest.fn() };
    const numbers = { next: jest.fn(async () => 'ORD-20260927-0001') };
    const service = new SelfOrderSessionService(
      prisma as unknown as PrismaService,
      eventBus as unknown as EventBusService,
      numbers as unknown as DocumentNumberService,
    );

    const results = await Promise.allSettled([
      service.submitSession('CODE'),
      service.submitSession('CODE'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ConflictException);
    expect(orders).toHaveLength(1);
    expect(tx.order.create).toHaveBeenCalledTimes(1);
    expect(numbers.next).toHaveBeenCalledWith(tx, 'biz-1', 'ORD');
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    // New orders publish an empty previous status so the KDS gateway emits order:new.
    expect(eventBus.publish.mock.calls[0][0].previousStatus).toBe('');
  });

  it('rejects a submit of an already submitted session without writing', async () => {
    const { prisma, tx } = makePrisma();
    prisma.selfOrderSession.findUnique.mockResolvedValueOnce({
      id: 'sess-1',
      outletId: 'outlet-1',
      tableId: null,
      status: 'submitted',
      expiresAt: new Date(Date.now() + 60_000),
      outlet: { businessId: 'biz-1' },
    });
    const service = new SelfOrderSessionService(
      prisma as unknown as PrismaService,
      { publish: jest.fn() } as unknown as EventBusService,
      { next: jest.fn() } as unknown as DocumentNumberService,
    );

    await expect(service.submitSession('CODE')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.order.create).not.toHaveBeenCalled();
  });
});

describe('SelfOrderSessionService.addItem', () => {
  const activeSession = {
    id: 'sess-1',
    outletId: 'outlet-1',
    status: 'active',
    expiresAt: new Date(Date.now() + 60_000),
    outlet: { businessId: 'biz-1' },
  };

  it('rejects a product that does not belong to the outlet business', async () => {
    const prisma = {
      selfOrderSession: { findUnique: jest.fn().mockResolvedValue(activeSession) },
      product: { findFirst: jest.fn().mockResolvedValue(null) },
      selfOrderItem: { create: jest.fn() },
    };
    const service = new SelfOrderSessionService(
      prisma as unknown as PrismaService,
      { publish: jest.fn() } as unknown as EventBusService,
      { next: jest.fn() } as unknown as DocumentNumberService,
    );

    await expect(
      service.addItem('CODE', { productId: 'foreign-prod', quantity: 1 }),
    ).rejects.toThrow('Product not found');
    expect(prisma.product.findFirst.mock.calls[0][0].where.businessId).toBe('biz-1');
    expect(prisma.selfOrderItem.create).not.toHaveBeenCalled();
  });

  it('stores server-resolved modifier prices, ignoring nothing from the client but ids', async () => {
    const prisma = {
      selfOrderSession: { findUnique: jest.fn().mockResolvedValue(activeSession) },
      product: { findFirst: jest.fn().mockResolvedValue({ id: 'prod-1' }) },
      modifier: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'mod-1',
            name: 'Extra Keju',
            price: 5000,
            modifierGroup: { productModifierGroups: [{ productId: 'prod-1' }] },
          },
        ]),
      },
      selfOrderItem: { create: jest.fn().mockResolvedValue({ id: 'item-1' }) },
    };
    const service = new SelfOrderSessionService(
      prisma as unknown as PrismaService,
      { publish: jest.fn() } as unknown as EventBusService,
      { next: jest.fn() } as unknown as DocumentNumberService,
    );

    await service.addItem('CODE', { productId: 'prod-1', quantity: 2, modifierIds: ['mod-1'] });
    const data = prisma.selfOrderItem.create.mock.calls[0][0].data;
    expect(data.modifiers).toEqual([{ id: 'mod-1', name: 'Extra Keju', price: '5000' }]);
    expect(prisma.modifier.findMany.mock.calls[0][0].where.modifierGroup.businessId).toBe('biz-1');
  });
});

import 'reflect-metadata';
import { BadRequestException, ConflictException, NotImplementedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OnlineStoreService } from './online-store.service';
import { StorefrontOrderDto } from '../../application/dtos/online-store.dto';
import type { PrismaService } from '../../infrastructure/database/prisma.service';
import type { EventBusService } from '../../infrastructure/events/event-bus.service';
import type { DocumentNumberService } from '@shared/numbering';
import type { TenantAccessService } from '@shared/tenant';

const BUSINESS = '11111111-1111-4111-8111-111111111111';
const STORE = '22222222-2222-4222-8222-222222222222';
const OUTLET = '33333333-3333-4333-8333-333333333333';
const PRODUCT = '44444444-4444-4444-8444-444444444444';

function makePrisma(opts: { decrementCount?: number; settings?: Record<string, unknown> } = {}) {
  const tx = {
    stockLevel: {
      updateMany: jest.fn().mockResolvedValue({ count: opts.decrementCount ?? 1 }),
    },
    storeOrder: {
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'order-1',
          orderNumber: data.orderNumber,
          orderStatus: 'pending',
          createdAt: new Date('2026-09-27T03:00:00Z'),
        }),
      ),
    },
  };
  const prisma = {
    onlineStore: {
      findUnique: jest.fn().mockResolvedValue({
        id: STORE,
        businessId: BUSINESS,
        storeName: 'Toko',
        slug: 'toko',
        description: null,
        logoUrl: null,
        bannerUrl: null,
        socialLinks: {},
        themeSettings: opts.settings ?? {},
        isActive: true,
      }),
    },
    product: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: PRODUCT,
          name: 'Kopi',
          basePrice: new Prisma.Decimal(15000),
          trackStock: true,
          variants: [],
        },
      ]),
    },
    outlet: { findFirst: jest.fn().mockResolvedValue({ id: OUTLET }) },
    $transaction: jest.fn().mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  return { prisma, tx };
}

function makeService(prisma: unknown) {
  const numbering = { next: jest.fn().mockResolvedValue('WEB-20260927-0001') };
  const service = new OnlineStoreService(
    prisma as PrismaService,
    { publish: jest.fn() } as unknown as EventBusService,
    numbering as unknown as DocumentNumberService,
    { assertOwned: jest.fn() } as unknown as TenantAccessService,
  );
  return { service, numbering };
}

const baseOrder = {
  customerName: 'Budi',
  customerPhone: '081234567890',
  shippingMethod: 'delivery' as const,
  shippingAddress: 'Jl. Merdeka 1',
};

describe('StorefrontOrderDto validation', () => {
  it.each([0, -3, 1.5])('rejects quantity %p', async (quantity) => {
    const dto = plainToInstance(StorefrontOrderDto, {
      ...baseOrder,
      items: [{ productId: PRODUCT, quantity }],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'items')).toBe(true);
  });

  it('rejects an empty item list and accepts a valid order', async () => {
    const empty = await validate(plainToInstance(StorefrontOrderDto, { ...baseOrder, items: [] }));
    expect(empty.some((e) => e.property === 'items')).toBe(true);

    const ok = await validate(
      plainToInstance(StorefrontOrderDto, {
        ...baseOrder,
        items: [{ productId: PRODUCT, quantity: 2 }],
      }),
    );
    expect(ok).toHaveLength(0);
  });
});

describe('OnlineStoreService.createStorefrontOrder', () => {
  it('rejects a negative quantity before touching stock (stock is never increased)', async () => {
    const { prisma, tx } = makePrisma();
    const { service } = makeService(prisma);

    await expect(
      service.createStorefrontOrder('toko', {
        ...baseOrder,
        items: [{ productId: PRODUCT, quantity: -5 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.stockLevel.updateMany).not.toHaveBeenCalled();
  });

  it('deducts stock with a conditional decrement from the fulfilment outlet', async () => {
    const { prisma, tx } = makePrisma();
    const { service, numbering } = makeService(prisma);

    const result = await service.createStorefrontOrder('toko', {
      ...baseOrder,
      items: [
        { productId: PRODUCT, quantity: 2 },
        { productId: PRODUCT, quantity: 1 },
      ],
    });

    expect(tx.stockLevel.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.stockLevel.updateMany).toHaveBeenCalledWith({
      where: {
        outletId: OUTLET,
        productId: PRODUCT,
        variantId: null,
        quantity: { gte: 3 },
      },
      data: { quantity: { decrement: 3 } },
    });
    expect(numbering.next).toHaveBeenCalledWith(tx, BUSINESS, 'WEB');
    expect(result.subtotal).toBe(45000);
    expect(result.orderNumber).toBe('WEB-20260927-0001');
  });

  it('throws 409 and creates no order when the conditional decrement matches nothing', async () => {
    const { prisma, tx } = makePrisma({ decrementCount: 0 });
    const { service } = makeService(prisma);

    await expect(
      service.createStorefrontOrder('toko', {
        ...baseOrder,
        items: [{ productId: PRODUCT, quantity: 2 }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.storeOrder.create).not.toHaveBeenCalled();
  });

  it('computes shipping on the server and ignores any client-supplied shipping cost', async () => {
    const { prisma, tx } = makePrisma({
      settings: { shippingMode: 'flat_rate', deliveryFee: 12000 },
    });
    const { service } = makeService(prisma);

    const result = await service.createStorefrontOrder('toko', {
      ...baseOrder,
      shippingCost: -100000,
      items: [{ productId: PRODUCT, quantity: 1 }],
    } as never);

    expect(result.shippingCost).toBe(12000);
    expect(result.grandTotal).toBe(27000);
    const data = tx.storeOrder.create.mock.calls[0][0].data;
    expect(Number(data.shippingCost)).toBe(12000);
  });

  it('fails honestly for distance-based shipping (no geocoding provider)', async () => {
    const { prisma, tx } = makePrisma({ settings: { shippingMode: 'distance' } });
    const { service } = makeService(prisma);

    await expect(
      service.createStorefrontOrder('toko', {
        ...baseOrder,
        items: [{ productId: PRODUCT, quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(NotImplementedException);
    expect(tx.storeOrder.create).not.toHaveBeenCalled();
  });
});

describe('OnlineStoreService.updateOrderStatus', () => {
  function statusPrisma(orderStatus: string, updateCount = 1) {
    const order = {
      id: 'order-1',
      outletId: OUTLET,
      orderNumber: 'WEB-20260927-0001',
      orderStatus,
      shippingMethod: 'delivery',
      customerName: 'Budi',
      items: [
        {
          productId: PRODUCT,
          variantId: null,
          productName: 'Kopi',
          variantName: null,
          quantity: 2,
        },
      ],
    };
    const tx = {
      storeOrder: {
        findFirst: jest.fn().mockResolvedValue(order),
        updateMany: jest.fn().mockResolvedValue({ count: updateCount }),
        findFirstOrThrow: jest.fn().mockResolvedValue({
          ...order,
          shippingCost: new Prisma.Decimal(0),
          subtotal: new Prisma.Decimal(30000),
          discountAmount: new Prisma.Decimal(0),
          grandTotal: new Prisma.Decimal(30000),
        }),
      },
      product: { findMany: jest.fn().mockResolvedValue([{ id: PRODUCT }]) },
      stockLevel: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      order: {
        create: jest.fn().mockResolvedValue({ id: 'kds-1', outletId: OUTLET }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    return { prisma, tx };
  }

  it('rejects an invalid transition (delivered -> pending)', async () => {
    const { prisma, tx } = statusPrisma('delivered');
    const { service } = makeService(prisma);
    await expect(service.updateOrderStatus(BUSINESS, 'order-1', 'pending')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.storeOrder.updateMany).not.toHaveBeenCalled();
  });

  it('cancelling releases the deducted stock in the same transaction', async () => {
    const { prisma, tx } = statusPrisma('pending');
    const { service } = makeService(prisma);
    await service.updateOrderStatus(BUSINESS, 'order-1', 'cancelled');
    expect(tx.storeOrder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1', store: { businessId: BUSINESS }, orderStatus: 'pending' },
      }),
    );
    expect(tx.stockLevel.updateMany).toHaveBeenCalledWith({
      where: { outletId: OUTLET, productId: PRODUCT, variantId: null },
      data: { quantity: { increment: 2 } },
    });
  });

  it('confirming creates the kitchen order; a lost race creates nothing', async () => {
    const ok = statusPrisma('pending');
    await makeService(ok.prisma).service.updateOrderStatus(BUSINESS, 'order-1', 'confirmed');
    expect(ok.tx.order.create).toHaveBeenCalledTimes(1);

    const raced = statusPrisma('pending', 0);
    await expect(
      makeService(raced.prisma).service.updateOrderStatus(BUSINESS, 'order-1', 'confirmed'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(raced.tx.order.create).not.toHaveBeenCalled();
  });
});

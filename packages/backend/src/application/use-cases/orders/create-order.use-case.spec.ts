import { BadRequestException, ConflictException } from '@nestjs/common';
import { CreateOrderUseCase, CreateOrderInput } from './create-order.use-case';
import type { EventBusService } from '@infrastructure/events/event-bus.service';
import { OrderStatusChangedEvent } from '@domain/events/order-status-changed.event';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { DocumentNumberService } from '@shared/numbering';

describe('CreateOrderUseCase', () => {
  const BUSINESS = 'biz-1';
  const OUTLET = 'outlet-1';

  let tx: {
    outlet: { findFirst: jest.Mock };
    product: { findMany: jest.Mock };
    productVariant: { findMany: jest.Mock };
    customer: { findFirst: jest.Mock };
    table: { findFirst: jest.Mock; updateMany: jest.Mock };
    order: { create: jest.Mock };
  };
  let prisma: { $transaction: jest.Mock };
  let eventBus: { publish: jest.Mock };
  let numbers: { next: jest.Mock };
  let useCase: CreateOrderUseCase;

  const baseInput: CreateOrderInput = {
    businessId: BUSINESS,
    outletId: OUTLET,
    orderType: 'takeaway',
    items: [{ productId: 'prod-1', quantity: 2 }],
  };

  beforeEach(() => {
    tx = {
      outlet: { findFirst: jest.fn().mockResolvedValue({ id: OUTLET }) },
      product: {
        findMany: jest.fn().mockResolvedValue([{ id: 'prod-1', name: 'Nasi Goreng' }]),
      },
      productVariant: { findMany: jest.fn().mockResolvedValue([]) },
      customer: { findFirst: jest.fn().mockResolvedValue({ id: 'cust-1' }) },
      table: {
        findFirst: jest.fn().mockResolvedValue({ id: 'table-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      order: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = { $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)) };
    eventBus = { publish: jest.fn() };
    numbers = { next: jest.fn().mockResolvedValue('ORD-20260927-0001') };
    useCase = new CreateOrderUseCase(
      prisma as unknown as PrismaService,
      eventBus as unknown as EventBusService,
      numbers as unknown as DocumentNumberService,
    );
  });

  it('creates the order with nested items and a per-tenant number, then publishes order:new', async () => {
    const result = await useCase.execute(baseInput);

    expect(result.orderNumber).toBe('ORD-20260927-0001');
    expect(numbers.next).toHaveBeenCalledWith(tx, BUSINESS, 'ORD');
    expect(tx.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessId: BUSINESS, isActive: true }),
      }),
    );
    const data = tx.order.create.mock.calls[0][0].data;
    expect(data.items.create).toEqual([
      expect.objectContaining({ productId: 'prod-1', productName: 'Nasi Goreng', quantity: 2 }),
    ]);
    const event = eventBus.publish.mock.calls[0][0] as OrderStatusChangedEvent;
    expect(event.previousStatus).toBe('');
    expect(event.newStatus).toBe('pending');
  });

  it('rejects an order without items', async () => {
    await expect(useCase.execute({ ...baseInput, items: [] })).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5])('rejects quantity %p', async (quantity) => {
    await expect(
      useCase.execute({ ...baseInput, items: [{ productId: 'prod-1', quantity }] }),
    ).rejects.toThrow(BadRequestException);
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('rejects a product of another business instead of creating an "Unknown" line', async () => {
    tx.product.findMany.mockResolvedValue([]);
    await expect(
      useCase.execute({ ...baseInput, items: [{ productId: 'foreign', quantity: 1 }] }),
    ).rejects.toThrow(BadRequestException);
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('rejects an outlet outside the business', async () => {
    tx.outlet.findFirst.mockResolvedValue(null);
    await expect(useCase.execute(baseInput)).rejects.toThrow(BadRequestException);
    expect(tx.outlet.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: OUTLET, businessId: BUSINESS } }),
    );
  });

  it('claims the table with a conditional update before creating the order', async () => {
    await useCase.execute({ ...baseInput, orderType: 'dine_in', tableId: 'table-1' });

    expect(tx.table.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'table-1', outletId: OUTLET, status: 'available' },
      }),
    );
    expect(tx.table.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.order.create.mock.invocationCallOrder[0],
    );
  });

  it('fails with 409 and creates no order when the table is taken', async () => {
    tx.table.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      useCase.execute({ ...baseInput, orderType: 'dine_in', tableId: 'table-1' }),
    ).rejects.toThrow(ConflictException);
    expect(tx.order.create).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it("still creates a paid order when onTableUnavailable is 'keep'", async () => {
    tx.table.updateMany.mockResolvedValue({ count: 0 });
    await useCase.execute({
      ...baseInput,
      orderType: 'dine_in',
      tableId: 'table-1',
      onTableUnavailable: 'keep',
    });
    expect(tx.order.create).toHaveBeenCalled();
  });

  it('treats a duplicate fixed id as a conflict (idempotent replays)', async () => {
    tx.order.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    await expect(useCase.execute({ ...baseInput, id: 'trx-1' })).rejects.toThrow(ConflictException);
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('uses a provided order number only when it fits the column', async () => {
    await useCase.execute({ ...baseInput, orderNumber: 'TRX-20260927-0001' });
    expect(tx.order.create.mock.calls[0][0].data.orderNumber).toBe('TRX-20260927-0001');
    expect(numbers.next).not.toHaveBeenCalled();

    await useCase.execute({ ...baseInput, orderNumber: 'TXN-1727400000000-ABCDEF' });
    expect(tx.order.create.mock.calls[1][0].data.orderNumber).toBe('ORD-20260927-0001');
  });
});

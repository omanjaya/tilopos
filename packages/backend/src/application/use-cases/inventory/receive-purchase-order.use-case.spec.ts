import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReceivePurchaseOrderUseCase } from './receive-purchase-order.use-case';
import type { CalculateMovingAverageCostUseCase } from './calculate-moving-average-cost.use-case';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { EventBusService } from '@infrastructure/events/event-bus.service';

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);
const BIZ = 'biz-1';

function line(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'line-1',
    itemName: 'Kopi',
    productId: 'p-1',
    variantId: null,
    ingredientId: null,
    quantityOrdered: D(10),
    quantityReceived: D(0),
    unitCost: D(5000),
    ...over,
  };
}

function setup(
  opts: { claimCount?: number; lines?: ReturnType<typeof line>[]; found?: boolean } = {},
) {
  const tx = {
    $queryRaw: jest.fn(),
    purchaseOrder: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          opts.found === false
            ? null
            : { id: 'po-1', outletId: 'out-1', poNumber: 'PO-1', status: 'ordered' },
        ),
      updateMany: jest.fn().mockResolvedValue({ count: opts.claimCount ?? 1 }),
      update: jest.fn(),
    },
    purchaseOrderItem: {
      findMany: jest.fn().mockResolvedValue(opts.lines ?? [line()]),
      update: jest.fn(),
    },
    stockLevel: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn(),
    },
    stockMovement: { create: jest.fn() },
    ingredient: { findUnique: jest.fn(), update: jest.fn() },
    ingredientStockLevel: { aggregate: jest.fn(), upsert: jest.fn() },
    ingredientStockMovement: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  } as unknown as PrismaService;
  const eventBus = { publish: jest.fn() } as unknown as EventBusService;
  const cost = {
    execute: jest
      .fn()
      .mockResolvedValue({ previousCost: 4000, newCost: 4500, costPriceHistoryId: 'h' }),
  } as unknown as CalculateMovingAverageCostUseCase;
  const useCase = new ReceivePurchaseOrderUseCase(prisma, eventBus, cost);
  return { useCase, tx, eventBus, cost };
}

describe('ReceivePurchaseOrderUseCase', () => {
  it('scopes the PO lookup to the caller business', async () => {
    const { useCase, tx } = setup({ found: false });
    await expect(
      useCase.execute({ purchaseOrderId: 'po-x', businessId: BIZ, employeeId: 'e' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.purchaseOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'po-x', outlet: { businessId: BIZ } } }),
    );
    expect(tx.stockLevel.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a second (concurrent/double) receive without touching stock', async () => {
    const { useCase, tx, eventBus } = setup({ claimCount: 0 });
    await expect(
      useCase.execute({ purchaseOrderId: 'po-1', businessId: BIZ, employeeId: 'e' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.purchaseOrder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'po-1', status: { in: ['ordered', 'partial'] } },
      }),
    );
    expect(tx.stockLevel.updateMany).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('increments stock atomically (base row only), records movement and cost in the tx', async () => {
    const { useCase, tx, cost, eventBus } = setup();
    const result = await useCase.execute({
      purchaseOrderId: 'po-1',
      businessId: BIZ,
      employeeId: 'e',
    });

    expect(result.status).toBe('received');
    expect(tx.stockLevel.updateMany).toHaveBeenCalledWith({
      where: { outletId: 'out-1', productId: 'p-1', variantId: null },
      data: { quantity: { increment: D(10) } },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ movementType: 'purchase' }) }),
    );
    expect(tx.purchaseOrderItem.update).toHaveBeenCalledWith({
      where: { id: 'line-1' },
      data: { quantityReceived: { increment: D(10) } },
    });
    // moving-average cost runs on the same transaction client
    expect((cost.execute as jest.Mock).mock.calls[0][1]).toBe(tx);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it('marks the PO partial when only part of a line is received', async () => {
    const { useCase, tx } = setup();
    const result = await useCase.execute({
      purchaseOrderId: 'po-1',
      businessId: BIZ,
      employeeId: 'e',
      items: [{ purchaseOrderItemId: 'line-1', quantityReceived: 4 }],
    });
    expect(result.status).toBe('partial');
    expect(tx.purchaseOrder.update).toHaveBeenCalledWith({
      where: { id: 'po-1' },
      data: { status: 'partial', receivedAt: null },
    });
  });

  it('receives ingredient lines into ingredient stock', async () => {
    const { useCase, tx } = setup({
      lines: [line({ productId: null, ingredientId: 'ing-1', unitCost: D(0) })],
    });
    await useCase.execute({ purchaseOrderId: 'po-1', businessId: BIZ, employeeId: 'e' });
    expect(tx.ingredientStockLevel.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { quantity: { increment: D(10) } } }),
    );
    expect(tx.ingredientStockMovement.create).toHaveBeenCalled();
    expect(tx.stockLevel.updateMany).not.toHaveBeenCalled();
  });
});

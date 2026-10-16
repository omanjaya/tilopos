import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CompleteStockOpnameUseCase } from './complete-stock-opname.use-case';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { EventBusService } from '@infrastructure/events/event-bus.service';

const D = (v: number) => new Prisma.Decimal(v);

describe('CompleteStockOpnameUseCase', () => {
  let tx: {
    stockOpname: {
      updateMany: jest.Mock;
      findFirst: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findUnique: jest.Mock;
    };
    stockOpnameItem: { findMany: jest.Mock };
    stockLevel: { createMany: jest.Mock; updateMany: jest.Mock; findMany: jest.Mock };
    stockMovement: { createMany: jest.Mock };
  };
  let eventBus: { publish: jest.Mock };
  let useCase: CompleteStockOpnameUseCase;

  const input = { opnameId: 'op-1', businessId: 'biz-1', employeeId: 'emp-1' };

  beforeEach(() => {
    tx = {
      stockOpname: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirst: jest.fn().mockResolvedValue({ status: 'completed' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'op-1',
          outletId: 'outlet-1',
          opnameNumber: 'OPN-20260927-0001',
        }),
        findUnique: jest.fn().mockResolvedValue({ id: 'op-1', status: 'completed' }),
      },
      stockOpnameItem: {
        findMany: jest.fn().mockResolvedValue([
          // counted 8 vs snapshot 10 -> -2
          {
            productId: 'prod-1',
            variantId: null,
            systemQuantity: D(10),
            actualQuantity: D(8),
            notes: null,
          },
          // no difference -> untouched
          {
            productId: 'prod-2',
            variantId: 'var-2',
            systemQuantity: D(5),
            actualQuantity: D(5),
            notes: null,
          },
        ]),
      },
      stockLevel: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest
          .fn()
          .mockResolvedValue([{ productId: 'prod-1', variantId: null, quantity: D(6) }]),
      },
      stockMovement: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = { $transaction: jest.fn().mockImplementation(async (cb) => cb(tx)) };
    eventBus = { publish: jest.fn() };
    useCase = new CompleteStockOpnameUseCase(
      prisma as unknown as PrismaService,
      eventBus as unknown as EventBusService,
    );
  });

  it('transitions conditionally (in_progress, same business) as the first statement', async () => {
    await useCase.execute(input);

    expect(tx.stockOpname.updateMany).toHaveBeenCalledWith({
      where: { id: 'op-1', outlet: { businessId: 'biz-1' }, status: 'in_progress' },
      data: expect.objectContaining({ status: 'completed', approvedBy: 'emp-1' }),
    });
    const first = tx.stockOpname.updateMany.mock.invocationCallOrder[0];
    expect(first).toBeLessThan(tx.stockLevel.updateMany.mock.invocationCallOrder[0]);
  });

  it('applies the counted difference as an increment (keeps sales made after the snapshot)', async () => {
    await useCase.execute(input);

    expect(tx.stockLevel.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.stockLevel.updateMany).toHaveBeenCalledWith({
      where: { outletId: 'outlet-1', productId: 'prod-1', variantId: null },
      data: { quantity: { increment: D(-2) } },
    });
    // Missing rows are created first (skipDuplicates) instead of silently skipped.
    expect(tx.stockLevel.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(tx.stockMovement.createMany.mock.calls[0][0].data).toEqual([
      expect.objectContaining({ movementType: 'opname', quantity: D(-2), referenceId: 'op-1' }),
    ]);
    // Event reflects the real resulting quantity (6), not the counted 8.
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ previousQuantity: 8, newQuantity: 6 }),
    );
  });

  it('rejects a second completion with 409 and changes no stock', async () => {
    tx.stockOpname.updateMany.mockResolvedValue({ count: 0 });

    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
    expect(tx.stockLevel.updateMany).not.toHaveBeenCalled();
    expect(tx.stockMovement.createMany).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('returns 404 for an opname of another business', async () => {
    tx.stockOpname.updateMany.mockResolvedValue({ count: 0 });
    tx.stockOpname.findFirst.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('rolls back when items are uncounted', async () => {
    tx.stockOpnameItem.findMany.mockResolvedValue([
      {
        productId: 'prod-1',
        variantId: null,
        systemQuantity: D(10),
        actualQuantity: null,
        notes: null,
      },
    ]);

    await expect(useCase.execute(input)).rejects.toThrow(BadRequestException);
    expect(tx.stockLevel.updateMany).not.toHaveBeenCalled();
  });
});

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UpdateStockUseCase, UpdateStockInput } from './update-stock.use-case';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { StockLevelChangedEvent } from '@domain/events/stock-level-changed.event';
import { InsufficientStockException } from '@domain/exceptions/insufficient-stock.exception';
import { CalculateMovingAverageCostUseCase } from './calculate-moving-average-cost.use-case';
import type { PrismaService } from '@infrastructure/database/prisma.service';

describe('UpdateStockUseCase', () => {
  let useCase: UpdateStockUseCase;
  let mockEventBus: jest.Mocked<EventBusService>;
  let mockPrisma: {
    product: { findFirst: jest.Mock };
    productVariant: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let mockCalculateMovingAvgCost: { execute: jest.Mock };
  let mockTx: {
    stockLevel: {
      createMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    stockMovement: { create: jest.Mock };
    $queryRaw: jest.Mock;
  };

  const base = {
    businessId: 'biz-1',
    outletId: 'outlet-1',
    productId: 'prod-1',
    reason: 'Restocking',
    employeeId: 'emp-1',
  };
  const increment: UpdateStockInput = { ...base, adjustmentType: 'increment', quantity: 20 };
  const decrement: UpdateStockInput = { ...base, adjustmentType: 'decrement', quantity: 10 };
  const setTo: UpdateStockInput = { ...base, adjustmentType: 'set', quantity: 100 };

  beforeEach(() => {
    mockTx = {
      stockLevel: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue({ id: 'stock-1' }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      stockMovement: { create: jest.fn().mockResolvedValue({}) },
      $queryRaw: jest.fn().mockResolvedValue([{ quantity: new Prisma.Decimal(50) }]),
    };
    mockEventBus = { publish: jest.fn() } as unknown as jest.Mocked<EventBusService>;
    mockPrisma = {
      product: { findFirst: jest.fn().mockResolvedValue({ id: 'prod-1' }) },
      productVariant: { findFirst: jest.fn().mockResolvedValue({ id: 'var-1' }) },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockTx)),
    };
    mockCalculateMovingAvgCost = { execute: jest.fn().mockResolvedValue(undefined) };
    useCase = new UpdateStockUseCase(
      mockEventBus,
      mockPrisma as unknown as PrismaService,
      mockCalculateMovingAvgCost as unknown as CalculateMovingAverageCostUseCase,
    );
  });

  it('increments atomically (no absolute read-modify-write)', async () => {
    const result = await useCase.execute(increment);

    expect(result).toEqual({ stockLevelId: 'stock-1', previousQuantity: 50, newQuantity: 70 });
    expect(mockTx.stockLevel.update).toHaveBeenCalledWith({
      where: { id: 'stock-1' },
      data: { quantity: { increment: new Prisma.Decimal(20) } },
    });
  });

  it('decrements conditionally on enough stock', async () => {
    const result = await useCase.execute(decrement);

    expect(result.newQuantity).toBe(40);
    expect(mockTx.stockLevel.updateMany).toHaveBeenCalledWith({
      where: { id: 'stock-1', quantity: { gte: new Prisma.Decimal(10) } },
      data: { quantity: { decrement: new Prisma.Decimal(10) } },
    });
    expect(mockTx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ quantity: new Prisma.Decimal(-10) }),
    });
  });

  it('rejects a decrement when the guarded update matches no row', async () => {
    mockTx.stockLevel.updateMany.mockResolvedValue({ count: 0 });

    await expect(useCase.execute({ ...decrement, quantity: 60 })).rejects.toThrow(
      InsufficientStockException,
    );
    expect(mockTx.stockMovement.create).not.toHaveBeenCalled();
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('sets an absolute count on the locked row and records the exact delta', async () => {
    const result = await useCase.execute(setTo);

    expect(mockTx.$queryRaw).toHaveBeenCalled(); // SELECT ... FOR UPDATE
    expect(result.newQuantity).toBe(100);
    expect(mockTx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ quantity: new Prisma.Decimal(50) }),
    });
  });

  it('allows set to 0 but rejects 0 for increment/decrement and negatives', async () => {
    await expect(useCase.execute({ ...setTo, quantity: 0 })).resolves.toMatchObject({
      newQuantity: 0,
    });
    await expect(useCase.execute({ ...increment, quantity: 0 })).rejects.toThrow(
      BadRequestException,
    );
    await expect(useCase.execute({ ...setTo, quantity: -5 })).rejects.toThrow(BadRequestException);
  });

  it('rejects a product of another business before touching stock', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(null);

    await expect(useCase.execute(increment)).rejects.toThrow(NotFoundException);
    expect(mockPrisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'prod-1', businessId: 'biz-1' },
      select: { id: true },
    });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a variant that does not belong to the product', async () => {
    mockPrisma.productVariant.findFirst.mockResolvedValue(null);

    await expect(useCase.execute({ ...increment, variantId: 'var-x' })).rejects.toThrow(
      NotFoundException,
    );
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('uses variantId null for the base row', async () => {
    await useCase.execute(increment);

    expect(mockTx.stockLevel.findFirst).toHaveBeenCalledWith({
      where: { outletId: 'outlet-1', productId: 'prod-1', variantId: null },
      select: { id: true },
    });
  });

  it('runs moving-average cost with the transaction client before the increment', async () => {
    await useCase.execute({ ...increment, unitCost: 5000 });

    expect(mockCalculateMovingAvgCost.execute).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'prod-1', newQuantity: 20, newUnitCost: 5000 }),
      mockTx,
    );
    const costOrder = mockCalculateMovingAvgCost.execute.mock.invocationCallOrder[0];
    const updateOrder = mockTx.stockLevel.update.mock.invocationCallOrder[0];
    expect(costOrder).toBeLessThan(updateOrder);
  });

  it('publishes StockLevelChangedEvent after commit', async () => {
    await useCase.execute(increment);

    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(StockLevelChangedEvent));
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ previousQuantity: 50, newQuantity: 70 }),
    );
  });
});

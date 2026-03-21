import { UpdateStockUseCase, UpdateStockInput } from './update-stock.use-case';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { StockLevelChangedEvent } from '@domain/events/stock-level-changed.event';
import { BadRequestException } from '@nestjs/common';
import { InsufficientStockException } from '@domain/exceptions/insufficient-stock.exception';
import { CalculateMovingAverageCostUseCase } from './calculate-moving-average-cost.use-case';
import type { PrismaService } from '@infrastructure/database/prisma.service';

describe('UpdateStockUseCase', () => {
  let useCase: UpdateStockUseCase;
  let mockEventBus: jest.Mocked<EventBusService>;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockCalculateMovingAvgCost: jest.Mocked<CalculateMovingAverageCostUseCase>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockTx: any;

  const makePrismaStockLevel = (overrides: Record<string, unknown> = {}) => ({
    id: 'stock-1',
    outletId: 'outlet-1',
    productId: 'prod-1',
    variantId: null,
    quantity: 50,
    lowStockAlert: 5,
    updatedAt: new Date(),
    ...overrides,
  });

  const baseIncrementInput: UpdateStockInput = {
    outletId: 'outlet-1',
    productId: 'prod-1',
    adjustmentType: 'increment',
    quantity: 20,
    reason: 'Restocking',
    employeeId: 'emp-1',
  };

  const baseDecrementInput: UpdateStockInput = {
    outletId: 'outlet-1',
    productId: 'prod-1',
    adjustmentType: 'decrement',
    quantity: 10,
    reason: 'Damaged goods',
    employeeId: 'emp-1',
  };

  const baseSetInput: UpdateStockInput = {
    outletId: 'outlet-1',
    productId: 'prod-1',
    adjustmentType: 'set',
    quantity: 100,
    reason: 'Stock count correction',
    employeeId: 'emp-1',
  };

  beforeEach(() => {
    mockTx = {
      stockLevel: {
        findFirst: jest.fn().mockResolvedValue(makePrismaStockLevel()),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      stockMovement: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    mockEventBus = {
      publish: jest.fn(),
      ofType: jest.fn(),
      onAll: jest.fn(),
    } as unknown as jest.Mocked<EventBusService>;

    mockPrisma = {
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockTx)),
    } as unknown as jest.Mocked<PrismaService>;

    mockCalculateMovingAvgCost = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CalculateMovingAverageCostUseCase>;

    useCase = new UpdateStockUseCase(mockEventBus, mockPrisma, mockCalculateMovingAvgCost);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should increase stock successfully with increment adjustment', async () => {
    const result = await useCase.execute(baseIncrementInput);

    expect(result.stockLevelId).toBe('stock-1');
    expect(result.previousQuantity).toBe(50);
    expect(result.newQuantity).toBe(70); // 50 + 20 = 70
    expect(mockTx.stockLevel.update).toHaveBeenCalledWith({
      where: { id: 'stock-1' },
      data: { quantity: 70 },
    });
  });

  it('should decrease stock successfully with decrement adjustment', async () => {
    const result = await useCase.execute(baseDecrementInput);

    expect(result.previousQuantity).toBe(50);
    expect(result.newQuantity).toBe(40); // 50 - 10 = 40
    expect(mockTx.stockLevel.update).toHaveBeenCalledWith({
      where: { id: 'stock-1' },
      data: { quantity: 40 },
    });
  });

  it('should set stock to exact quantity with set adjustment', async () => {
    const result = await useCase.execute(baseSetInput);

    expect(result.previousQuantity).toBe(50);
    expect(result.newQuantity).toBe(100);
    expect(mockTx.stockLevel.update).toHaveBeenCalledWith({
      where: { id: 'stock-1' },
      data: { quantity: 100 },
    });
  });

  it('should throw InsufficientStockException when decrement would make stock negative', async () => {
    const excessiveDecrementInput: UpdateStockInput = {
      ...baseDecrementInput,
      quantity: 60, // 50 - 60 = -10 (negative)
    };

    await expect(useCase.execute(excessiveDecrementInput)).rejects.toThrow(
      InsufficientStockException,
    );
    expect(mockTx.stockLevel.update).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when set to negative value', async () => {
    const negativeSetInput: UpdateStockInput = {
      ...baseSetInput,
      quantity: -5,
    };

    await expect(useCase.execute(negativeSetInput)).rejects.toThrow(BadRequestException);
    await expect(useCase.execute(negativeSetInput)).rejects.toThrow(
      'Quantity must be greater than 0',
    );
  });

  it('should record stock movement after update', async () => {
    await useCase.execute(baseIncrementInput);

    expect(mockTx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        outletId: 'outlet-1',
        productId: 'prod-1',
        movementType: 'adjustment',
        quantity: 20, // newQuantity(70) - previousQuantity(50) = 20
        referenceType: 'stock_adjustment',
        notes: 'Restocking',
        createdBy: 'emp-1',
      }),
    });
  });

  it('should record negative movement for decrement', async () => {
    await useCase.execute(baseDecrementInput);

    expect(mockTx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        quantity: -10, // newQuantity(40) - previousQuantity(50) = -10
      }),
    });
  });

  it('should publish StockLevelChangedEvent after update', async () => {
    await useCase.execute(baseIncrementInput);

    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(StockLevelChangedEvent));
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        outletId: 'outlet-1',
        productId: 'prod-1',
        previousQuantity: 50,
        newQuantity: 70,
      }),
    );
  });

  it('should create new stock level when none exists', async () => {
    mockTx.stockLevel.findFirst.mockResolvedValue(null);
    mockTx.stockLevel.create.mockResolvedValue(
      makePrismaStockLevel({ id: 'stock-new', quantity: 0 }),
    );

    const result = await useCase.execute(baseIncrementInput);

    expect(mockTx.stockLevel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        outletId: 'outlet-1',
        productId: 'prod-1',
        quantity: 0,
      }),
    });
    expect(result.previousQuantity).toBe(0);
    expect(result.newQuantity).toBe(20); // 0 + 20 = 20
  });

  it('should handle variantId correctly', async () => {
    mockTx.stockLevel.findFirst.mockResolvedValue(makePrismaStockLevel({ variantId: 'var-1' }));

    const inputWithVariant: UpdateStockInput = {
      ...baseIncrementInput,
      variantId: 'var-1',
    };

    await useCase.execute(inputWithVariant);

    expect(mockTx.stockLevel.findFirst).toHaveBeenCalledWith({
      where: { outletId: 'outlet-1', productId: 'prod-1', variantId: 'var-1' },
    });
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        variantId: 'var-1',
      }),
    );
  });

  it('should allow decrement to exactly zero', async () => {
    const exactDecrementInput: UpdateStockInput = {
      ...baseDecrementInput,
      quantity: 50, // exactly the current stock
    };

    const result = await useCase.execute(exactDecrementInput);

    expect(result.newQuantity).toBe(0);
    expect(mockTx.stockLevel.update).toHaveBeenCalledWith({
      where: { id: 'stock-1' },
      data: { quantity: 0 },
    });
  });
});

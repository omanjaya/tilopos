import { UpdateStockUseCase, UpdateStockInput } from './update-stock.use-case';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { StockLevelChangedEvent } from '@domain/events/stock-level-changed.event';
import { InsufficientStockException } from '@domain/exceptions/insufficient-stock.exception';
import type {
  IInventoryRepository,
  StockLevelRecord,
} from '@domain/interfaces/repositories/inventory.repository';
import type { PrismaService } from '@infrastructure/database/prisma.service';

describe('UpdateStockUseCase', () => {
  let useCase: UpdateStockUseCase;
  let mockInventoryRepo: jest.Mocked<IInventoryRepository>;
  let mockEventBus: jest.Mocked<EventBusService>;
  let mockPrisma: jest.Mocked<PrismaService>;

  const existingStockLevel: StockLevelRecord = {
    id: 'stock-1',
    outletId: 'outlet-1',
    productId: 'prod-1',
    variantId: null,
    quantity: 50,
    lowStockAlert: 5,
    updatedAt: new Date(),
  };

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
    mockInventoryRepo = {
      findStockLevel: jest.fn(),
      findStockLevelsByOutlet: jest.fn(),
      findLowStockItems: jest.fn(),
      updateStockLevel: jest.fn(),
      createStockMovement: jest.fn(),
    };

    mockEventBus = {
      publish: jest.fn(),
      ofType: jest.fn(),
      onAll: jest.fn(),
    } as unknown as jest.Mocked<EventBusService>;

    mockPrisma = {
      stockLevel: {
        create: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    useCase = new UpdateStockUseCase(mockInventoryRepo, mockEventBus, mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should increase stock successfully with increment adjustment', async () => {
    mockInventoryRepo.findStockLevel.mockResolvedValue(existingStockLevel);
    mockInventoryRepo.updateStockLevel.mockResolvedValue({
      ...existingStockLevel,
      quantity: 70,
    });
    mockInventoryRepo.createStockMovement.mockResolvedValue({
      id: 'movement-1',
      outletId: 'outlet-1',
      productId: 'prod-1',
      variantId: null,
      movementType: 'adjustment',
      quantity: 0,
      referenceId: null,
      referenceType: null,
      notes: null,
      createdBy: null,
      createdAt: new Date(),
    });

    const result = await useCase.execute(baseIncrementInput);

    expect(result.stockLevelId).toBe('stock-1');
    expect(result.previousQuantity).toBe(50);
    expect(result.newQuantity).toBe(70); // 50 + 20 = 70
    expect(mockInventoryRepo.updateStockLevel).toHaveBeenCalledWith('stock-1', 70);
  });

  it('should decrease stock successfully with decrement adjustment', async () => {
    mockInventoryRepo.findStockLevel.mockResolvedValue(existingStockLevel);
    mockInventoryRepo.updateStockLevel.mockResolvedValue({
      ...existingStockLevel,
      quantity: 40,
    });
    mockInventoryRepo.createStockMovement.mockResolvedValue({
      id: 'movement-1',
      outletId: 'outlet-1',
      productId: 'prod-1',
      variantId: null,
      movementType: 'adjustment',
      quantity: 0,
      referenceId: null,
      referenceType: null,
      notes: null,
      createdBy: null,
      createdAt: new Date(),
    });

    const result = await useCase.execute(baseDecrementInput);

    expect(result.previousQuantity).toBe(50);
    expect(result.newQuantity).toBe(40); // 50 - 10 = 40
    expect(mockInventoryRepo.updateStockLevel).toHaveBeenCalledWith('stock-1', 40);
  });

  it('should set stock to exact quantity with set adjustment', async () => {
    mockInventoryRepo.findStockLevel.mockResolvedValue(existingStockLevel);
    mockInventoryRepo.updateStockLevel.mockResolvedValue({
      ...existingStockLevel,
      quantity: 100,
    });
    mockInventoryRepo.createStockMovement.mockResolvedValue({
      id: 'movement-1',
      outletId: 'outlet-1',
      productId: 'prod-1',
      variantId: null,
      movementType: 'adjustment',
      quantity: 0,
      referenceId: null,
      referenceType: null,
      notes: null,
      createdBy: null,
      createdAt: new Date(),
    });

    const result = await useCase.execute(baseSetInput);

    expect(result.previousQuantity).toBe(50);
    expect(result.newQuantity).toBe(100);
    expect(mockInventoryRepo.updateStockLevel).toHaveBeenCalledWith('stock-1', 100);
  });

  it('should throw InsufficientStockException when decrement would make stock negative', async () => {
    mockInventoryRepo.findStockLevel.mockResolvedValue(existingStockLevel);

    const excessiveDecrementInput: UpdateStockInput = {
      ...baseDecrementInput,
      quantity: 60, // 50 - 60 = -10 (negative)
    };

    await expect(useCase.execute(excessiveDecrementInput)).rejects.toThrow(
      InsufficientStockException,
    );
    expect(mockInventoryRepo.updateStockLevel).not.toHaveBeenCalled();
  });

  it('should throw InsufficientStockException when set to negative value', async () => {
    mockInventoryRepo.findStockLevel.mockResolvedValue(existingStockLevel);

    const negativeSetInput: UpdateStockInput = {
      ...baseSetInput,
      quantity: -5,
    };

    await expect(useCase.execute(negativeSetInput)).rejects.toThrow(InsufficientStockException);
  });

  it('should record stock movement after update', async () => {
    mockInventoryRepo.findStockLevel.mockResolvedValue(existingStockLevel);
    mockInventoryRepo.updateStockLevel.mockResolvedValue({
      ...existingStockLevel,
      quantity: 70,
    });
    mockInventoryRepo.createStockMovement.mockResolvedValue({
      id: 'movement-1',
      outletId: 'outlet-1',
      productId: 'prod-1',
      variantId: null,
      movementType: 'adjustment',
      quantity: 0,
      referenceId: null,
      referenceType: null,
      notes: null,
      createdBy: null,
      createdAt: new Date(),
    });

    await useCase.execute(baseIncrementInput);

    expect(mockInventoryRepo.createStockMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        outletId: 'outlet-1',
        productId: 'prod-1',
        movementType: 'adjustment',
        quantity: 20, // newQuantity(70) - previousQuantity(50) = 20
        referenceType: 'stock_adjustment',
        notes: 'Restocking',
        createdBy: 'emp-1',
      }),
    );
  });

  it('should record negative movement for decrement', async () => {
    mockInventoryRepo.findStockLevel.mockResolvedValue(existingStockLevel);
    mockInventoryRepo.updateStockLevel.mockResolvedValue({
      ...existingStockLevel,
      quantity: 40,
    });
    mockInventoryRepo.createStockMovement.mockResolvedValue({
      id: 'movement-1',
      outletId: 'outlet-1',
      productId: 'prod-1',
      variantId: null,
      movementType: 'adjustment',
      quantity: 0,
      referenceId: null,
      referenceType: null,
      notes: null,
      createdBy: null,
      createdAt: new Date(),
    });

    await useCase.execute(baseDecrementInput);

    expect(mockInventoryRepo.createStockMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: -10, // newQuantity(40) - previousQuantity(50) = -10
      }),
    );
  });

  it('should publish StockLevelChangedEvent after update', async () => {
    mockInventoryRepo.findStockLevel.mockResolvedValue(existingStockLevel);
    mockInventoryRepo.updateStockLevel.mockResolvedValue({
      ...existingStockLevel,
      quantity: 70,
    });
    mockInventoryRepo.createStockMovement.mockResolvedValue({
      id: 'movement-1',
      outletId: 'outlet-1',
      productId: 'prod-1',
      variantId: null,
      movementType: 'adjustment',
      quantity: 0,
      referenceId: null,
      referenceType: null,
      notes: null,
      createdBy: null,
      createdAt: new Date(),
    });

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
    mockInventoryRepo.findStockLevel.mockResolvedValue(null);
    (mockPrisma.stockLevel.create as jest.Mock).mockResolvedValue({
      id: 'stock-new',
      outletId: 'outlet-1',
      productId: 'prod-1',
      variantId: null,
      quantity: 0,
      lowStockAlert: 5,
      updatedAt: new Date(),
    });
    mockInventoryRepo.updateStockLevel.mockResolvedValue({
      ...existingStockLevel,
      id: 'stock-new',
      quantity: 20,
    });
    mockInventoryRepo.createStockMovement.mockResolvedValue({
      id: 'movement-1',
      outletId: 'outlet-1',
      productId: 'prod-1',
      variantId: null,
      movementType: 'adjustment',
      quantity: 0,
      referenceId: null,
      referenceType: null,
      notes: null,
      createdBy: null,
      createdAt: new Date(),
    });

    const result = await useCase.execute(baseIncrementInput);

    expect(mockPrisma.stockLevel.create).toHaveBeenCalledWith({
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
    const stockWithVariant: StockLevelRecord = {
      ...existingStockLevel,
      variantId: 'var-1',
    };
    mockInventoryRepo.findStockLevel.mockResolvedValue(stockWithVariant);
    mockInventoryRepo.updateStockLevel.mockResolvedValue({
      ...stockWithVariant,
      quantity: 70,
    });
    mockInventoryRepo.createStockMovement.mockResolvedValue({
      id: 'movement-1',
      outletId: 'outlet-1',
      productId: 'prod-1',
      variantId: null,
      movementType: 'adjustment',
      quantity: 0,
      referenceId: null,
      referenceType: null,
      notes: null,
      createdBy: null,
      createdAt: new Date(),
    });

    const inputWithVariant: UpdateStockInput = {
      ...baseIncrementInput,
      variantId: 'var-1',
    };

    await useCase.execute(inputWithVariant);

    expect(mockInventoryRepo.findStockLevel).toHaveBeenCalledWith('outlet-1', 'prod-1', 'var-1');
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        variantId: 'var-1',
      }),
    );
  });

  it('should allow decrement to exactly zero', async () => {
    mockInventoryRepo.findStockLevel.mockResolvedValue(existingStockLevel);
    mockInventoryRepo.updateStockLevel.mockResolvedValue({
      ...existingStockLevel,
      quantity: 0,
    });
    mockInventoryRepo.createStockMovement.mockResolvedValue({
      id: 'movement-1',
      outletId: 'outlet-1',
      productId: 'prod-1',
      variantId: null,
      movementType: 'adjustment',
      quantity: 0,
      referenceId: null,
      referenceType: null,
      notes: null,
      createdBy: null,
      createdAt: new Date(),
    });

    const exactDecrementInput: UpdateStockInput = {
      ...baseDecrementInput,
      quantity: 50, // exactly the current stock
    };

    const result = await useCase.execute(exactDecrementInput);

    expect(result.newQuantity).toBe(0);
    expect(mockInventoryRepo.updateStockLevel).toHaveBeenCalledWith('stock-1', 0);
  });
});

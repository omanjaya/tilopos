import { CreateTransactionUseCase, CreateTransactionInput } from './create-transaction.use-case';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { TransactionCreatedEvent } from '@domain/events/transaction-created.event';
import { InsufficientStockException } from '@domain/exceptions/insufficient-stock.exception';
import { AppError } from '@shared/errors/app-error';
import { BusinessError } from '@shared/errors/business-error';
import type {
  IShiftRepository,
  ShiftRecord,
} from '@domain/interfaces/repositories/shift.repository';
import type {
  IProductRepository,
  ProductRecord,
} from '@domain/interfaces/repositories/product.repository';
import type {
  IInventoryRepository,
  StockLevelRecord,
} from '@domain/interfaces/repositories/inventory.repository';
import type { ITransactionRepository } from '@domain/interfaces/repositories/transaction.repository';

describe('CreateTransactionUseCase', () => {
  let useCase: CreateTransactionUseCase;
  let mockShiftRepo: jest.Mocked<IShiftRepository>;
  let mockProductRepo: jest.Mocked<IProductRepository>;
  let mockInventoryRepo: jest.Mocked<IInventoryRepository>;
  let mockTransactionRepo: jest.Mocked<ITransactionRepository>;
  let mockEventBus: jest.Mocked<EventBusService>;

  const baseShift: ShiftRecord = {
    id: 'shift-1',
    outletId: 'outlet-1',
    employeeId: 'emp-1',
    startedAt: new Date('2025-01-01T08:00:00Z'),
    endedAt: null,
    openingCash: 500000,
    closingCash: null,
    expectedCash: null,
    cashDifference: null,
    cashIn: null,
    cashOut: null,
    notes: null,
    status: 'open',
    createdAt: new Date('2025-01-01T08:00:00Z'),
  };

  const baseProduct: ProductRecord = {
    id: 'prod-1',
    businessId: 'biz-1',
    categoryId: 'cat-1',
    sku: 'SKU-001',
    name: 'Nasi Goreng',
    description: null,
    imageUrl: null,
    basePrice: 25000,
    costPrice: 10000,
    hasVariants: false,
    trackStock: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseStockLevel: StockLevelRecord = {
    id: 'stock-1',
    outletId: 'outlet-1',
    productId: 'prod-1',
    variantId: null,
    quantity: 50,
    lowStockAlert: 5,
    updatedAt: new Date(),
  };

  const baseInput: CreateTransactionInput = {
    outletId: 'outlet-1',
    employeeId: 'emp-1',
    shiftId: 'shift-1',
    orderType: 'dine_in',
    items: [{ productId: 'prod-1', quantity: 2 }],
    payments: [{ method: 'cash', amount: 100000 }],
  };

  beforeEach(() => {
    mockShiftRepo = {
      findById: jest.fn(),
      findOpenShift: jest.fn(),
      create: jest.fn(),
      close: jest.fn(),
      addCashIn: jest.fn(),
      addCashOut: jest.fn(),
    };

    mockProductRepo = {
      findById: jest.fn(),
      findByBusinessId: jest.fn(),
      findByCategoryId: jest.fn(),
      findBySku: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockInventoryRepo = {
      findStockLevel: jest.fn(),
      findStockLevelsByOutlet: jest.fn(),
      findLowStockItems: jest.fn(),
      updateStockLevel: jest.fn(),
      createStockMovement: jest.fn(),
    };

    mockTransactionRepo = {
      findById: jest.fn(),
      findByReceiptNumber: jest.fn(),
      findByOutletAndDateRange: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findItemsByTransactionId: jest.fn(),
      findPaymentsByTransactionId: jest.fn(),
    };

    mockEventBus = {
      publish: jest.fn(),
      ofType: jest.fn(),
      onAll: jest.fn(),
    } as unknown as jest.Mocked<EventBusService>;

    useCase = new CreateTransactionUseCase(
      mockShiftRepo,
      mockProductRepo,
      mockInventoryRepo,
      mockTransactionRepo,
      mockEventBus,
    );
  });

  it('should create transaction successfully', async () => {
    mockShiftRepo.findById.mockResolvedValue(baseShift);
    mockProductRepo.findById.mockResolvedValue(baseProduct);
    mockInventoryRepo.findStockLevel.mockResolvedValue(baseStockLevel);
    mockInventoryRepo.updateStockLevel.mockResolvedValue({ ...baseStockLevel, quantity: 48 });
    mockInventoryRepo.createStockMovement.mockResolvedValue({
      id: 'mov-1',
      outletId: 'outlet-1',
      productId: 'prod-1',
      variantId: null,
      movementType: 'sale',
      quantity: -2,
      referenceId: 'txn-1',
      referenceType: 'transaction',
      notes: null,
      createdBy: 'emp-1',
      createdAt: new Date(),
    });
    mockTransactionRepo.save.mockResolvedValue({
      id: 'txn-1',
      outletId: 'outlet-1',
      employeeId: 'emp-1',
      customerId: null,
      shiftId: 'shift-1',
      receiptNumber: 'TXN-123',
      transactionType: 'sale',
      orderType: 'dine_in',
      tableId: null,
      subtotal: 50000,
      discountAmount: 0,
      taxAmount: 5500,
      serviceCharge: 0,
      grandTotal: 55500,
      notes: null,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await useCase.execute(baseInput);

    expect(result.transactionId).toBe('txn-1');
    expect(result.receiptNumber).toBeDefined();
    expect(result.grandTotal).toBe(55500);
    expect(result.change).toBe(44500); // 100000 - 55500
    expect(mockTransactionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: 'sale',
        status: 'completed',
        subtotal: 50000,
        taxAmount: 5500,
        grandTotal: 55500,
      }),
    );
  });

  it('should throw BusinessError when shift is not open', async () => {
    mockShiftRepo.findById.mockResolvedValue({ ...baseShift, status: 'closed' });

    await expect(useCase.execute(baseInput)).rejects.toThrow(BusinessError);
    await expect(useCase.execute(baseInput)).rejects.toThrow('Shift is not open');
  });

  it('should throw BusinessError when shift is not found', async () => {
    mockShiftRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(BusinessError);
  });

  it('should throw AppError when product is not found', async () => {
    mockShiftRepo.findById.mockResolvedValue(baseShift);
    mockProductRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(AppError);
    await expect(useCase.execute(baseInput)).rejects.toThrow(/not found or inactive/);
  });

  it('should throw AppError when product is inactive', async () => {
    mockShiftRepo.findById.mockResolvedValue(baseShift);
    mockProductRepo.findById.mockResolvedValue({ ...baseProduct, isActive: false });

    await expect(useCase.execute(baseInput)).rejects.toThrow(AppError);
  });

  it('should throw InsufficientStockException when stock is insufficient', async () => {
    mockShiftRepo.findById.mockResolvedValue(baseShift);
    mockProductRepo.findById.mockResolvedValue(baseProduct);
    mockInventoryRepo.findStockLevel.mockResolvedValue({
      ...baseStockLevel,
      quantity: 1, // only 1 available, requesting 2
    });

    await expect(useCase.execute(baseInput)).rejects.toThrow(InsufficientStockException);
  });

  it('should throw BusinessError when payment is less than grand total', async () => {
    mockShiftRepo.findById.mockResolvedValue(baseShift);
    mockProductRepo.findById.mockResolvedValue(baseProduct);
    mockInventoryRepo.findStockLevel.mockResolvedValue(baseStockLevel);

    const inputWithLowPayment: CreateTransactionInput = {
      ...baseInput,
      payments: [{ method: 'cash', amount: 1000 }], // way less than 55500
    };

    await expect(useCase.execute(inputWithLowPayment)).rejects.toThrow(BusinessError);
    await expect(useCase.execute(inputWithLowPayment)).rejects.toThrow(/Payment total/);
  });

  it('should calculate 11% PPN tax correctly', async () => {
    mockShiftRepo.findById.mockResolvedValue(baseShift);
    mockProductRepo.findById.mockResolvedValue(baseProduct); // price 25000
    mockInventoryRepo.findStockLevel.mockResolvedValue(baseStockLevel);
    mockTransactionRepo.save.mockImplementation(async (txn) => ({ ...txn, id: 'txn-1' }));
    mockInventoryRepo.updateStockLevel.mockResolvedValue(baseStockLevel);
    mockInventoryRepo.createStockMovement.mockResolvedValue({
      id: 'movement-1',
      outletId: 'outlet-1',
      productId: 'prod-1',
      variantId: null,
      movementType: 'sale',
      quantity: -2,
      referenceId: 'txn-1',
      referenceType: 'transaction',
      notes: null,
      createdBy: 'emp-1',
      createdAt: new Date(),
    });

    const input: CreateTransactionInput = {
      ...baseInput,
      items: [{ productId: 'prod-1', quantity: 2 }],
      payments: [{ method: 'cash', amount: 200000 }],
    };

    const result = await useCase.execute(input);

    // subtotal = 25000 * 2 = 50000
    // tax = Math.round(50000 * 0.11) = 5500
    // grandTotal = 50000 + 5500 = 55500
    expect(result.grandTotal).toBe(55500);
    expect(mockTransactionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotal: 50000,
        taxAmount: 5500,
        grandTotal: 55500,
      }),
    );
  });

  it('should calculate tax correctly with percentage discount', async () => {
    mockShiftRepo.findById.mockResolvedValue(baseShift);
    mockProductRepo.findById.mockResolvedValue(baseProduct);
    mockInventoryRepo.findStockLevel.mockResolvedValue(baseStockLevel);
    mockTransactionRepo.save.mockImplementation(async (txn) => ({ ...txn, id: 'txn-1' }));
    mockInventoryRepo.updateStockLevel.mockResolvedValue(baseStockLevel);
    mockInventoryRepo.createStockMovement.mockResolvedValue({
      id: 'movement-1',
      outletId: 'outlet-1',
      productId: 'prod-1',
      variantId: null,
      movementType: 'sale',
      quantity: -2,
      referenceId: 'txn-1',
      referenceType: 'transaction',
      notes: null,
      createdBy: 'emp-1',
      createdAt: new Date(),
    });

    const input: CreateTransactionInput = {
      ...baseInput,
      items: [{ productId: 'prod-1', quantity: 2 }],
      discounts: [{ type: 'percentage', value: 10 }], // 10% off
      payments: [{ method: 'cash', amount: 200000 }],
    };

    const result = await useCase.execute(input);

    // subtotal = 50000, discount = 50000 * 0.10 = 5000
    // taxableAmount = 50000 - 5000 = 45000
    // tax = Math.round(45000 * 0.11) = 4950
    // grandTotal = 45000 + 4950 = 49950
    expect(result.grandTotal).toBe(49950);
  });

  it('should calculate change correctly', async () => {
    mockShiftRepo.findById.mockResolvedValue(baseShift);
    mockProductRepo.findById.mockResolvedValue(baseProduct);
    mockInventoryRepo.findStockLevel.mockResolvedValue(baseStockLevel);
    mockTransactionRepo.save.mockImplementation(async (txn) => ({ ...txn, id: 'txn-1' }));
    mockInventoryRepo.updateStockLevel.mockResolvedValue(baseStockLevel);
    mockInventoryRepo.createStockMovement.mockResolvedValue({
      id: 'movement-1',
      outletId: 'outlet-1',
      productId: 'prod-1',
      variantId: null,
      movementType: 'sale',
      quantity: -2,
      referenceId: 'txn-1',
      referenceType: 'transaction',
      notes: null,
      createdBy: 'emp-1',
      createdAt: new Date(),
    });

    const input: CreateTransactionInput = {
      ...baseInput,
      payments: [{ method: 'cash', amount: 100000 }],
    };

    const result = await useCase.execute(input);

    // grandTotal = 55500, payment = 100000
    // change = 100000 - 55500 = 44500
    expect(result.change).toBe(44500);
  });

  it('should deduct stock after transaction', async () => {
    mockShiftRepo.findById.mockResolvedValue(baseShift);
    mockProductRepo.findById.mockResolvedValue(baseProduct);
    mockInventoryRepo.findStockLevel.mockResolvedValue(baseStockLevel);
    mockTransactionRepo.save.mockImplementation(async (txn) => ({ ...txn, id: 'txn-1' }));
    mockInventoryRepo.updateStockLevel.mockResolvedValue(baseStockLevel);
    mockInventoryRepo.createStockMovement.mockResolvedValue({
      id: 'movement-1',
      outletId: 'outlet-1',
      productId: 'prod-1',
      variantId: null,
      movementType: 'sale',
      quantity: -2,
      referenceId: 'txn-1',
      referenceType: 'transaction',
      notes: null,
      createdBy: 'emp-1',
      createdAt: new Date(),
    });

    await useCase.execute(baseInput);

    // Stock should be reduced: 50 - 2 = 48
    expect(mockInventoryRepo.updateStockLevel).toHaveBeenCalledWith('stock-1', 48);
    expect(mockInventoryRepo.createStockMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        movementType: 'sale',
        quantity: -2,
        referenceType: 'transaction',
      }),
    );
  });

  it('should skip stock check for products that do not track stock', async () => {
    const noStockProduct = { ...baseProduct, trackStock: false };
    mockShiftRepo.findById.mockResolvedValue(baseShift);
    mockProductRepo.findById.mockResolvedValue(noStockProduct);
    mockTransactionRepo.save.mockImplementation(async (txn) => ({ ...txn, id: 'txn-1' }));
    // findStockLevel returns null but should still not throw for products without trackStock
    mockInventoryRepo.findStockLevel.mockResolvedValue(null);

    const result = await useCase.execute(baseInput);

    expect(result.transactionId).toBe('txn-1');
  });

  it('should publish TransactionCreatedEvent after creation', async () => {
    mockShiftRepo.findById.mockResolvedValue(baseShift);
    mockProductRepo.findById.mockResolvedValue(baseProduct);
    mockInventoryRepo.findStockLevel.mockResolvedValue(baseStockLevel);
    mockTransactionRepo.save.mockImplementation(async (txn) => ({ ...txn, id: 'txn-1' }));
    mockInventoryRepo.updateStockLevel.mockResolvedValue(baseStockLevel);
    mockInventoryRepo.createStockMovement.mockResolvedValue({
      id: 'movement-1',
      outletId: 'outlet-1',
      productId: 'prod-1',
      variantId: null,
      movementType: 'sale',
      quantity: -2,
      referenceId: 'txn-1',
      referenceType: 'transaction',
      notes: null,
      createdBy: 'emp-1',
      createdAt: new Date(),
    });

    await useCase.execute(baseInput);

    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(TransactionCreatedEvent));
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'txn-1',
        outletId: 'outlet-1',
        grandTotal: 55500,
        customerId: null,
      }),
    );
  });

  it('should handle multiple items with correct subtotal', async () => {
    const product2: ProductRecord = {
      ...baseProduct,
      id: 'prod-2',
      name: 'Mie Goreng',
      basePrice: 20000,
    };

    mockShiftRepo.findById.mockResolvedValue(baseShift);
    mockProductRepo.findById.mockResolvedValueOnce(baseProduct).mockResolvedValueOnce(product2);
    mockInventoryRepo.findStockLevel.mockResolvedValue(baseStockLevel);
    mockTransactionRepo.save.mockImplementation(async (txn) => ({ ...txn, id: 'txn-1' }));
    mockInventoryRepo.updateStockLevel.mockResolvedValue(baseStockLevel);
    mockInventoryRepo.createStockMovement.mockResolvedValue({
      id: 'movement-1',
      outletId: 'outlet-1',
      productId: 'prod-1',
      variantId: null,
      movementType: 'sale',
      quantity: -2,
      referenceId: 'txn-1',
      referenceType: 'transaction',
      notes: null,
      createdBy: 'emp-1',
      createdAt: new Date(),
    });

    const input: CreateTransactionInput = {
      ...baseInput,
      items: [
        { productId: 'prod-1', quantity: 2 }, // 25000 * 2 = 50000
        { productId: 'prod-2', quantity: 3 }, // 20000 * 3 = 60000
      ],
      payments: [{ method: 'cash', amount: 200000 }],
    };

    const result = await useCase.execute(input);

    // subtotal = 110000
    // tax = Math.round(110000 * 0.11) = 12100
    // grandTotal = 110000 + 12100 = 122100
    expect(result.grandTotal).toBe(122100);
  });

  it('should handle fixed discount correctly', async () => {
    mockShiftRepo.findById.mockResolvedValue(baseShift);
    mockProductRepo.findById.mockResolvedValue(baseProduct);
    mockInventoryRepo.findStockLevel.mockResolvedValue(baseStockLevel);
    mockTransactionRepo.save.mockImplementation(async (txn) => ({ ...txn, id: 'txn-1' }));
    mockInventoryRepo.updateStockLevel.mockResolvedValue(baseStockLevel);
    mockInventoryRepo.createStockMovement.mockResolvedValue({
      id: 'movement-1',
      outletId: 'outlet-1',
      productId: 'prod-1',
      variantId: null,
      movementType: 'sale',
      quantity: -2,
      referenceId: 'txn-1',
      referenceType: 'transaction',
      notes: null,
      createdBy: 'emp-1',
      createdAt: new Date(),
    });

    const input: CreateTransactionInput = {
      ...baseInput,
      discounts: [{ type: 'fixed', value: 5000 }],
      payments: [{ method: 'cash', amount: 200000 }],
    };

    const result = await useCase.execute(input);

    // subtotal = 50000, discount = 5000
    // taxableAmount = 45000
    // tax = Math.round(45000 * 0.11) = 4950
    // grandTotal = 45000 + 4950 = 49950
    expect(result.grandTotal).toBe(49950);
  });
});

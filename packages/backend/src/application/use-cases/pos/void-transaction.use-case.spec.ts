import { VoidTransactionUseCase, VoidTransactionInput } from './void-transaction.use-case';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { TransactionVoidedEvent } from '@domain/events/transaction-voided.event';
import { VoidNotAllowedException } from '@domain/exceptions/void-not-allowed.exception';
import { TransactionNotFoundException } from '@domain/exceptions/transaction-not-found.exception';
import type { ITransactionRepository, TransactionRecord, TransactionItemRecord } from '@domain/interfaces/repositories/transaction.repository';
import type { IInventoryRepository, StockLevelRecord } from '@domain/interfaces/repositories/inventory.repository';
import type { IAuditLogRepository } from '@domain/interfaces/repositories/audit.repository';

describe('VoidTransactionUseCase', () => {
  let useCase: VoidTransactionUseCase;
  let mockTransactionRepo: jest.Mocked<ITransactionRepository>;
  let mockInventoryRepo: jest.Mocked<IInventoryRepository>;
  let mockAuditRepo: jest.Mocked<IAuditLogRepository>;
  let mockEventBus: jest.Mocked<EventBusService>;

  const baseTransaction: TransactionRecord = {
    id: 'txn-1',
    businessId: 'biz-1',
    outletId: 'outlet-1',
    employeeId: 'emp-1',
    customerId: null,
    shiftId: 'shift-1',
    receiptNumber: 'TXN-001',
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
  };

  const baseItems: TransactionItemRecord[] = [
    {
      id: 'item-1',
      transactionId: 'txn-1',
      productId: 'prod-1',
      variantId: null,
      productName: 'Nasi Goreng',
      variantName: null,
      quantity: 2,
      unitPrice: 25000,
      discountAmount: 0,
      subtotal: 50000,
      notes: null,
    },
  ];

  const baseStockLevel: StockLevelRecord = {
    id: 'stock-1',
    outletId: 'outlet-1',
    productId: 'prod-1',
    variantId: null,
    quantity: 48,
    lowStockAlert: 5,
    updatedAt: new Date(),
  };

  const baseInput: VoidTransactionInput = {
    transactionId: 'txn-1',
    employeeId: 'emp-2',
    businessId: 'biz-1',
    outletId: 'outlet-1',
    reason: 'Customer changed mind',
  };

  beforeEach(() => {
    mockTransactionRepo = {
      findById: jest.fn(),
      findByReceiptNumber: jest.fn(),
      findByOutletAndDateRange: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findItemsByTransactionId: jest.fn(),
      findPaymentsByTransactionId: jest.fn(),
    };

    mockInventoryRepo = {
      findStockLevel: jest.fn(),
      findStockLevelsByOutlet: jest.fn(),
      findLowStockItems: jest.fn(),
      updateStockLevel: jest.fn(),
      createStockMovement: jest.fn(),
    };

    mockAuditRepo = {
      create: jest.fn(),
      findByEntity: jest.fn(),
      findByDateRange: jest.fn(),
    };

    mockEventBus = {
      publish: jest.fn(),
      ofType: jest.fn(),
      onAll: jest.fn(),
    } as unknown as jest.Mocked<EventBusService>;

    useCase = new VoidTransactionUseCase(
      mockTransactionRepo,
      mockInventoryRepo,
      mockAuditRepo,
      mockEventBus,
    );
  });

  it('should void transaction successfully', async () => {
    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.update.mockResolvedValue({} as any);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);
    mockInventoryRepo.findStockLevel.mockResolvedValue(baseStockLevel);
    mockInventoryRepo.updateStockLevel.mockResolvedValue(baseStockLevel);
    mockInventoryRepo.createStockMovement.mockResolvedValue({} as any);
    mockAuditRepo.create.mockResolvedValue({} as any);

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Transaction voided successfully');
    expect(mockTransactionRepo.update).toHaveBeenCalledWith(
      'txn-1',
      expect.objectContaining({
        status: 'voided',
        voidedBy: 'emp-2',
        voidReason: 'Customer changed mind',
      }),
    );
  });

  it('should throw TransactionNotFoundException when transaction not found', async () => {
    mockTransactionRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toThrow(TransactionNotFoundException);
  });

  it('should throw VoidNotAllowedException when transaction is already voided', async () => {
    mockTransactionRepo.findById.mockResolvedValue({
      ...baseTransaction,
      status: 'voided',
    });

    await expect(useCase.execute(baseInput)).rejects.toThrow(VoidNotAllowedException);
    await expect(useCase.execute(baseInput)).rejects.toThrow(/already voided/);
  });

  it('should throw VoidNotAllowedException when transaction is refunded', async () => {
    mockTransactionRepo.findById.mockResolvedValue({
      ...baseTransaction,
      status: 'refunded',
    });

    await expect(useCase.execute(baseInput)).rejects.toThrow(VoidNotAllowedException);
    await expect(useCase.execute(baseInput)).rejects.toThrow(/Cannot void a refunded/);
  });

  it('should throw VoidNotAllowedException when transaction type is not sale', async () => {
    mockTransactionRepo.findById.mockResolvedValue({
      ...baseTransaction,
      transactionType: 'refund',
    });

    await expect(useCase.execute(baseInput)).rejects.toThrow(VoidNotAllowedException);
    await expect(useCase.execute(baseInput)).rejects.toThrow(/Can only void sale/);
  });

  it('should restore stock after void', async () => {
    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.update.mockResolvedValue({} as any);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);
    mockInventoryRepo.findStockLevel.mockResolvedValue(baseStockLevel);
    mockInventoryRepo.updateStockLevel.mockResolvedValue(baseStockLevel);
    mockInventoryRepo.createStockMovement.mockResolvedValue({} as any);
    mockAuditRepo.create.mockResolvedValue({} as any);

    await useCase.execute(baseInput);

    // Stock should be restored: 48 + 2 = 50
    expect(mockInventoryRepo.updateStockLevel).toHaveBeenCalledWith('stock-1', 50);
    expect(mockInventoryRepo.createStockMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        movementType: 'return_stock',
        quantity: 2,
        referenceType: 'void',
        notes: 'Void: Customer changed mind',
      }),
    );
  });

  it('should skip stock restoration for items without productId', async () => {
    const itemsWithoutProduct: TransactionItemRecord[] = [
      {
        ...baseItems[0],
        productId: null,
      },
    ];

    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.update.mockResolvedValue({} as any);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(itemsWithoutProduct);
    mockAuditRepo.create.mockResolvedValue({} as any);

    await useCase.execute(baseInput);

    expect(mockInventoryRepo.findStockLevel).not.toHaveBeenCalled();
    expect(mockInventoryRepo.updateStockLevel).not.toHaveBeenCalled();
  });

  it('should create audit trail after void', async () => {
    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.update.mockResolvedValue({} as any);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);
    mockInventoryRepo.findStockLevel.mockResolvedValue(baseStockLevel);
    mockInventoryRepo.updateStockLevel.mockResolvedValue(baseStockLevel);
    mockInventoryRepo.createStockMovement.mockResolvedValue({} as any);
    mockAuditRepo.create.mockResolvedValue({} as any);

    await useCase.execute(baseInput);

    expect(mockAuditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'transaction_voided',
        entityType: 'transaction',
        entityId: 'txn-1',
        businessId: 'biz-1',
        employeeId: 'emp-2',
        oldValue: expect.objectContaining({
          status: 'completed',
          grandTotal: 55500,
        }),
        newValue: expect.objectContaining({
          status: 'voided',
          reason: 'Customer changed mind',
        }),
      }),
    );
  });

  it('should publish TransactionVoidedEvent', async () => {
    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.update.mockResolvedValue({} as any);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);
    mockInventoryRepo.findStockLevel.mockResolvedValue(baseStockLevel);
    mockInventoryRepo.updateStockLevel.mockResolvedValue(baseStockLevel);
    mockInventoryRepo.createStockMovement.mockResolvedValue({} as any);
    mockAuditRepo.create.mockResolvedValue({} as any);

    await useCase.execute(baseInput);

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.any(TransactionVoidedEvent),
    );
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'txn-1',
        outletId: 'outlet-1',
        grandTotal: 55500,
        voidedBy: 'emp-2',
        reason: 'Customer changed mind',
      }),
    );
  });

  it('should handle multiple items and restore all stock', async () => {
    const multipleItems: TransactionItemRecord[] = [
      {
        id: 'item-1',
        transactionId: 'txn-1',
        productId: 'prod-1',
        variantId: null,
        productName: 'Nasi Goreng',
        variantName: null,
        quantity: 2,
        unitPrice: 25000,
        discountAmount: 0,
        subtotal: 50000,
        notes: null,
      },
      {
        id: 'item-2',
        transactionId: 'txn-1',
        productId: 'prod-2',
        variantId: 'var-1',
        productName: 'Mie Goreng',
        variantName: 'Large',
        quantity: 1,
        unitPrice: 30000,
        discountAmount: 0,
        subtotal: 30000,
        notes: null,
      },
    ];

    const stockLevel2: StockLevelRecord = {
      id: 'stock-2',
      outletId: 'outlet-1',
      productId: 'prod-2',
      variantId: 'var-1',
      quantity: 20,
      lowStockAlert: 3,
      updatedAt: new Date(),
    };

    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.update.mockResolvedValue({} as any);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(multipleItems);
    mockInventoryRepo.findStockLevel
      .mockResolvedValueOnce(baseStockLevel)
      .mockResolvedValueOnce(stockLevel2);
    mockInventoryRepo.updateStockLevel.mockResolvedValue({} as any);
    mockInventoryRepo.createStockMovement.mockResolvedValue({} as any);
    mockAuditRepo.create.mockResolvedValue({} as any);

    await useCase.execute(baseInput);

    expect(mockInventoryRepo.updateStockLevel).toHaveBeenCalledTimes(2);
    expect(mockInventoryRepo.updateStockLevel).toHaveBeenCalledWith('stock-1', 50);
    expect(mockInventoryRepo.updateStockLevel).toHaveBeenCalledWith('stock-2', 21);
  });
});

import { VoidTransactionUseCase, VoidTransactionInput } from './void-transaction.use-case';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { TransactionVoidedEvent } from '@domain/events/transaction-voided.event';
import { VoidNotAllowedException } from '@domain/exceptions/void-not-allowed.exception';
import { TransactionNotFoundException } from '@domain/exceptions/transaction-not-found.exception';
import type {
  ITransactionRepository,
  TransactionRecord,
  TransactionItemRecord,
} from '@domain/interfaces/repositories/transaction.repository';
import type { PrismaService } from '@infrastructure/database/prisma.service';

describe('VoidTransactionUseCase', () => {
  let useCase: VoidTransactionUseCase;
  let mockTransactionRepo: jest.Mocked<ITransactionRepository>;
  let mockEventBus: jest.Mocked<EventBusService>;
  let mockPrisma: jest.Mocked<PrismaService>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockTx: any;

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

    mockTx = {
      transaction: {
        update: jest.fn().mockResolvedValue({}),
      },
      stockLevel: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'stock-1',
          quantity: 48,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      stockMovement: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      auditLog: {
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

    useCase = new VoidTransactionUseCase(mockTransactionRepo, mockEventBus, mockPrisma);
  });

  it('should void transaction successfully', async () => {
    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Transaction voided successfully');
    expect(mockTx.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'txn-1' },
        data: expect.objectContaining({
          status: 'voided',
          voidedBy: 'emp-2',
          voidReason: 'Customer changed mind',
        }),
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
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);

    await useCase.execute(baseInput);

    // Stock should be restored: 48 + 2 = 50
    expect(mockTx.stockLevel.update).toHaveBeenCalledWith({
      where: { id: 'stock-1' },
      data: { quantity: 50 },
    });
    expect(mockTx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        movementType: 'return_stock',
        quantity: 2,
        referenceType: 'void',
        notes: 'Void: Customer changed mind',
      }),
    });
  });

  it('should skip stock restoration for items without productId', async () => {
    const itemsWithoutProduct: TransactionItemRecord[] = [
      {
        ...baseItems[0],
        productId: null,
      },
    ];

    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(itemsWithoutProduct);

    await useCase.execute(baseInput);

    expect(mockTx.stockLevel.findFirst).not.toHaveBeenCalled();
    expect(mockTx.stockLevel.update).not.toHaveBeenCalled();
  });

  it('should create audit trail after void', async () => {
    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);

    await useCase.execute(baseInput);

    expect(mockTx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
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
    });
  });

  it('should publish TransactionVoidedEvent', async () => {
    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);

    await useCase.execute(baseInput);

    expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(TransactionVoidedEvent));
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

    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(multipleItems);
    mockTx.stockLevel.findFirst
      .mockResolvedValueOnce({ id: 'stock-1', quantity: 48 })
      .mockResolvedValueOnce({ id: 'stock-2', quantity: 20 });

    await useCase.execute(baseInput);

    expect(mockTx.stockLevel.update).toHaveBeenCalledTimes(2);
    expect(mockTx.stockLevel.update).toHaveBeenCalledWith({
      where: { id: 'stock-1' },
      data: { quantity: 50 },
    });
    expect(mockTx.stockLevel.update).toHaveBeenCalledWith({
      where: { id: 'stock-2' },
      data: { quantity: 21 },
    });
  });
});

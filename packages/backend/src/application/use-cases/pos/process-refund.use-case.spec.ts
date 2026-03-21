import { ProcessRefundUseCase, ProcessRefundInput } from './process-refund.use-case';
import { EventBusService } from '@infrastructure/events/event-bus.service';
import { TransactionNotFoundException } from '@domain/exceptions/transaction-not-found.exception';
import { RefundNotAllowedException } from '@domain/exceptions/refund-not-allowed.exception';
import type {
  ITransactionRepository,
  TransactionRecord,
} from '@domain/interfaces/repositories/transaction.repository';
import type { PrismaService } from '@infrastructure/database/prisma.service';

describe('ProcessRefundUseCase', () => {
  let useCase: ProcessRefundUseCase;
  let mockTransactionRepo: jest.Mocked<ITransactionRepository>;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockEventBus: jest.Mocked<EventBusService>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockTx: any;

  const originalTransaction: TransactionRecord = {
    id: 'txn-original',
    businessId: 'biz-1',
    outletId: 'outlet-1',
    employeeId: 'emp-1',
    customerId: 'cust-1',
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

  const mockTransactionItems = [
    {
      id: 'item-1',
      transactionId: 'txn-original',
      productId: 'prod-1',
      variantId: null,
      productName: 'Nasi Goreng',
      variantName: null,
      quantity: { toNumber: () => 2 },
      unitPrice: { toNumber: () => 25000 },
      discountAmount: { toNumber: () => 0 },
      subtotal: { toNumber: () => 50000 },
      notes: null,
      bundleId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const baseRefundInput: ProcessRefundInput = {
    transactionId: 'txn-original',
    employeeId: 'emp-2',
    items: [
      {
        transactionItemId: 'item-1',
        quantity: 2,
        reason: 'customer_request',
      },
    ],
    refundMethod: 'cash',
    notes: 'Customer requested refund',
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
        create: jest.fn().mockResolvedValue({ id: 'txn-refund' }),
        update: jest.fn().mockResolvedValue({}),
        aggregate: jest.fn().mockResolvedValue({ _sum: { subtotal: null } }),
      },
      transactionItem: {
        create: jest.fn().mockResolvedValue({}),
      },
      stockLevel: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'stock-1',
          quantity: { toNumber: () => 48 },
        }),
        update: jest.fn().mockResolvedValue({ quantity: { toNumber: () => 50 } }),
      },
      stockMovement: {
        create: jest.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    mockPrisma = {
      transactionItem: {
        findMany: jest.fn().mockResolvedValue(mockTransactionItems),
      },
      transaction: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockTx)),
    } as unknown as jest.Mocked<PrismaService>;

    mockEventBus = {
      publish: jest.fn(),
      ofType: jest.fn(),
      onAll: jest.fn(),
    } as unknown as jest.Mocked<EventBusService>;

    useCase = new ProcessRefundUseCase(mockTransactionRepo, mockPrisma, mockEventBus);
  });

  it('should process full refund successfully', async () => {
    mockTransactionRepo.findById.mockResolvedValue(originalTransaction);

    const result = await useCase.execute(baseRefundInput);

    expect(result.refundTransactionId).toBe('txn-refund');
    // refundSubtotal = 25000 * 2 = 50000
    // taxProportion = 5500 / 50000 = 0.11
    // refundTax = Math.round(50000 * 0.11) = 5500
    // refundAmount = 50000 + 5500 = 55500
    expect(result.refundAmount).toBe(55500);
    expect(result.receiptNumber).toContain('REF-');

    // Should update original to 'refunded' since full refund
    expect(mockTx.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'txn-original' },
        data: { status: 'refunded' },
      }),
    );
  });

  it('should process partial refund successfully', async () => {
    mockTransactionRepo.findById.mockResolvedValue(originalTransaction);

    const partialRefundInput: ProcessRefundInput = {
      ...baseRefundInput,
      items: [
        {
          transactionItemId: 'item-1',
          quantity: 1, // only 1 out of 2
          reason: 'defect',
        },
      ],
    };

    const result = await useCase.execute(partialRefundInput);

    // refundSubtotal = 25000 * 1 = 25000
    // taxProportion = 5500 / 50000 = 0.11
    // refundTax = Math.round(25000 * 0.11) = 2750
    // refundAmount = 25000 + 2750 = 27750
    expect(result.refundAmount).toBe(27750);

    // Should be partially_refunded since 25000 < 50000
    expect(mockTx.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'txn-original' },
        data: { status: 'partially_refunded' },
      }),
    );
  });

  it('should throw TransactionNotFoundException when transaction not found', async () => {
    mockTransactionRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(baseRefundInput)).rejects.toThrow(TransactionNotFoundException);
  });

  it('should throw RefundNotAllowedException when already fully refunded', async () => {
    mockTransactionRepo.findById.mockResolvedValue({
      ...originalTransaction,
      status: 'refunded',
    });

    await expect(useCase.execute(baseRefundInput)).rejects.toThrow(RefundNotAllowedException);
    await expect(useCase.execute(baseRefundInput)).rejects.toThrow(/already fully refunded/);
  });

  it('should throw RefundNotAllowedException when transaction status is invalid', async () => {
    mockTransactionRepo.findById.mockResolvedValue({
      ...originalTransaction,
      status: 'voided',
    });

    await expect(useCase.execute(baseRefundInput)).rejects.toThrow(RefundNotAllowedException);
    await expect(useCase.execute(baseRefundInput)).rejects.toThrow(/status is voided/);
  });

  it('should allow refund on partially_refunded transaction', async () => {
    mockTransactionRepo.findById.mockResolvedValue({
      ...originalTransaction,
      status: 'partially_refunded',
    });

    const result = await useCase.execute(baseRefundInput);

    expect(result.refundTransactionId).toBe('txn-refund');
  });

  it('should throw RefundNotAllowedException when transaction item not found', async () => {
    mockTransactionRepo.findById.mockResolvedValue(originalTransaction);

    const badInput: ProcessRefundInput = {
      ...baseRefundInput,
      items: [
        {
          transactionItemId: 'non-existent-item',
          quantity: 1,
          reason: 'customer_request',
        },
      ],
    };

    await expect(useCase.execute(badInput)).rejects.toThrow(RefundNotAllowedException);
    await expect(useCase.execute(badInput)).rejects.toThrow(/non-existent-item/);
  });

  it('should handle zero subtotal edge case for tax proportion', async () => {
    const zeroSubtotalTransaction: TransactionRecord = {
      ...originalTransaction,
      subtotal: 0,
      taxAmount: 0,
      grandTotal: 0,
    };

    mockTransactionRepo.findById.mockResolvedValue(zeroSubtotalTransaction);

    const result = await useCase.execute(baseRefundInput);

    // When subtotal is 0, taxProportion should be 0, so refundTax = 0
    // refundSubtotal = 25000 * 2 = 50000
    // refundAmount = 50000 + 0 = 50000
    expect(result.refundAmount).toBe(50000);
  });

  it('should restore stock after refund', async () => {
    mockTransactionRepo.findById.mockResolvedValue(originalTransaction);

    await useCase.execute(baseRefundInput);

    // Stock should be restored: increment by 2
    expect(mockTx.stockLevel.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'stock-1' },
        data: { quantity: { increment: 2 } },
      }),
    );
    expect(mockTx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        movementType: 'return_stock',
        quantity: 2,
        referenceType: 'refund',
      }),
    });
  });

  it('should create audit log after refund', async () => {
    mockTransactionRepo.findById.mockResolvedValue(originalTransaction);

    await useCase.execute(baseRefundInput);

    expect(mockTx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'transaction_refunded',
        entityType: 'transaction',
        entityId: 'txn-original',
        employeeId: 'emp-2',
        oldValue: expect.objectContaining({ status: 'completed' }),
        newValue: expect.objectContaining({ status: 'refunded' }),
      }),
    });
  });

  it('should save refund transaction with negative amounts', async () => {
    mockTransactionRepo.findById.mockResolvedValue(originalTransaction);

    await useCase.execute(baseRefundInput);

    expect(mockTx.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transactionType: 'refund',
        subtotal: -50000,
        taxAmount: -5500,
        grandTotal: -55500,
        status: 'completed',
      }),
    });
  });
});

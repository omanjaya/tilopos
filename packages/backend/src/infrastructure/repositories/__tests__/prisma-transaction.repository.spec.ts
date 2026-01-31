import { PrismaTransactionRepository } from '../prisma-transaction.repository';
import { PrismaService } from '../../database/prisma.service';
import type { TransactionRecord } from '@domain/interfaces/repositories/transaction.repository';

describe('PrismaTransactionRepository', () => {
  let repository: PrismaTransactionRepository;
  let mockPrisma: jest.Mocked<PrismaService>;

  const now = new Date();

  const makePrismaTransaction = (overrides: Record<string, unknown> = {}) => ({
    id: 'txn-1',
    outletId: 'outlet-1',
    employeeId: 'emp-1',
    customerId: null,
    shiftId: 'shift-1',
    receiptNumber: 'TXN-001',
    transactionType: 'sale',
    orderType: 'dine_in',
    tableId: null,
    subtotal: { toNumber: () => 50000 },
    discountAmount: { toNumber: () => 0 },
    taxAmount: { toNumber: () => 5500 },
    serviceCharge: { toNumber: () => 0 },
    grandTotal: { toNumber: () => 55500 },
    notes: null,
    status: 'completed',
    createdAt: now,
    updatedAt: now,
    outlet: { businessId: 'biz-1' },
    items: [],
    payments: [],
    ...overrides,
  });

  const expectedTransactionRecord: TransactionRecord = {
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
    voidedAt: undefined,
    voidedBy: undefined,
    voidReason: undefined,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    mockPrisma = {
      transaction: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      transactionItem: {
        findMany: jest.fn(),
      },
      payment: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    repository = new PrismaTransactionRepository(mockPrisma);
  });

  describe('findById', () => {
    it('should return a transaction record when found', async () => {
      const prismaResult = makePrismaTransaction();
      (mockPrisma.transaction.findUnique as jest.Mock).mockResolvedValue(prismaResult);

      const result = await repository.findById('txn-1');

      expect(mockPrisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'txn-1' },
        include: {
          outlet: { select: { businessId: true } },
          items: { include: { modifiers: true } },
          payments: true,
        },
      });
      expect(result).toEqual(expectedTransactionRecord);
    });

    it('should return null when transaction is not found', async () => {
      (mockPrisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('should create a transaction via prisma $transaction', async () => {
      const inputRecord: TransactionRecord = {
        id: 'txn-new',
        outletId: 'outlet-1',
        employeeId: 'emp-1',
        customerId: null,
        shiftId: 'shift-1',
        receiptNumber: 'TXN-002',
        transactionType: 'sale',
        orderType: 'dine_in',
        tableId: null,
        subtotal: 100000,
        discountAmount: 0,
        taxAmount: 11000,
        serviceCharge: 0,
        grandTotal: 111000,
        notes: null,
        status: 'completed',
        createdAt: now,
        updatedAt: now,
      };

      const prismaCreated = makePrismaTransaction({
        id: 'txn-new',
        receiptNumber: 'TXN-002',
        subtotal: { toNumber: () => 100000 },
        taxAmount: { toNumber: () => 11000 },
        grandTotal: { toNumber: () => 111000 },
      });

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        const fakeTx = {
          transaction: {
            create: jest.fn().mockResolvedValue(prismaCreated),
          },
        };
        return cb(fakeTx);
      });

      const result = await repository.save(inputRecord);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.id).toBe('txn-new');
      expect(result.grandTotal).toBe(111000);
    });
  });

  describe('update', () => {
    it('should update a transaction and return the updated record', async () => {
      const prismaUpdated = makePrismaTransaction({
        status: 'voided',
      });
      (mockPrisma.transaction.update as jest.Mock).mockResolvedValue(prismaUpdated);

      const result = await repository.update('txn-1', {
        status: 'voided',
        voidedBy: 'emp-2',
        voidReason: 'Customer changed mind',
      });

      expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'txn-1' },
        data: expect.objectContaining({
          status: 'voided',
          voidedBy: 'emp-2',
          voidReason: 'Customer changed mind',
        }),
        include: {
          items: { include: { modifiers: true } },
          payments: true,
        },
      });
      expect(result.status).toBe('voided');
    });

    it('should only include defined fields in the update data', async () => {
      const prismaUpdated = makePrismaTransaction({ notes: 'Updated notes' });
      (mockPrisma.transaction.update as jest.Mock).mockResolvedValue(prismaUpdated);

      await repository.update('txn-1', { notes: 'Updated notes' });

      const callArgs = (mockPrisma.transaction.update as jest.Mock).mock.calls[0][0];
      expect(callArgs.data).toEqual({ notes: 'Updated notes' });
    });
  });

  describe('findByOutletAndDateRange', () => {
    it('should return transactions within the date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const prismaResults = [
        makePrismaTransaction({ id: 'txn-1' }),
        makePrismaTransaction({ id: 'txn-2', receiptNumber: 'TXN-002' }),
      ];
      (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue(prismaResults);

      const result = await repository.findByOutletAndDateRange('outlet-1', startDate, endDate);

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          outletId: 'outlet-1',
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('txn-1');
      expect(result[1].id).toBe('txn-2');
    });

    it('should return an empty array when no transactions match', async () => {
      (mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repository.findByOutletAndDateRange(
        'outlet-1',
        new Date('2020-01-01'),
        new Date('2020-01-31'),
      );

      expect(result).toEqual([]);
    });
  });

  describe('findItemsByTransactionId', () => {
    it('should return mapped transaction items', async () => {
      const prismaItems = [
        {
          id: 'item-1',
          transactionId: 'txn-1',
          productId: 'prod-1',
          variantId: null,
          productName: 'Nasi Goreng',
          variantName: null,
          quantity: { toNumber: () => 2 },
          unitPrice: { toNumber: () => 25000 },
          discountAmount: { toNumber: () => 0 },
          subtotal: { toNumber: () => 50000 },
          notes: null,
        },
      ];
      (mockPrisma.transactionItem.findMany as jest.Mock).mockResolvedValue(prismaItems);

      const result = await repository.findItemsByTransactionId('txn-1');

      expect(mockPrisma.transactionItem.findMany).toHaveBeenCalledWith({
        where: { transactionId: 'txn-1' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
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
      });
    });
  });

  describe('findPaymentsByTransactionId', () => {
    it('should return mapped payment records', async () => {
      const prismaPayments = [
        {
          id: 'pay-1',
          transactionId: 'txn-1',
          paymentMethod: 'cash',
          amount: { toNumber: () => 100000 },
          referenceNumber: null,
          status: 'completed',
        },
      ];
      (mockPrisma.payment.findMany as jest.Mock).mockResolvedValue(prismaPayments);

      const result = await repository.findPaymentsByTransactionId('txn-1');

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
        where: { transactionId: 'txn-1' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'pay-1',
        transactionId: 'txn-1',
        paymentMethod: 'cash',
        amount: 100000,
        referenceNumber: null,
        status: 'completed',
      });
    });
  });
});

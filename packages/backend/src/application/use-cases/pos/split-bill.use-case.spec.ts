import {
  SplitBillUseCase,
  SplitByItemsInput,
  SplitEvenlyInput,
} from './split-bill.use-case';
import { BusinessError } from '@shared/errors/business-error';
import type {
  ITransactionRepository,
  TransactionRecord,
  TransactionItemRecord,
} from '@domain/interfaces/repositories/transaction.repository';

describe('SplitBillUseCase', () => {
  let useCase: SplitBillUseCase;
  let mockTransactionRepo: jest.Mocked<ITransactionRepository>;

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
    tableId: 'table-1',
    subtotal: 100000,
    discountAmount: 0,
    taxAmount: 11000,
    serviceCharge: 0,
    grandTotal: 111000,
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
    {
      id: 'item-2',
      transactionId: 'txn-1',
      productId: 'prod-2',
      variantId: null,
      productName: 'Mie Goreng',
      variantName: null,
      quantity: 2,
      unitPrice: 25000,
      discountAmount: 0,
      subtotal: 50000,
      notes: null,
    },
  ];

  let childIdCounter: number;

  beforeEach(() => {
    childIdCounter = 0;

    mockTransactionRepo = {
      findById: jest.fn(),
      findByReceiptNumber: jest.fn(),
      findByOutletAndDateRange: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findItemsByTransactionId: jest.fn(),
      findPaymentsByTransactionId: jest.fn(),
    };

    mockTransactionRepo.save.mockImplementation(async (txn) => ({
      ...txn,
      id: `child-${++childIdCounter}`,
    }));

    useCase = new SplitBillUseCase(mockTransactionRepo);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // --- Split by Items Tests ---

  it('should split bill by items successfully', async () => {
    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);

    const input: SplitByItemsInput = {
      splitType: 'by_items',
      transactionId: 'txn-1',
      employeeId: 'emp-1',
      splits: [
        {
          itemIds: ['item-1'],
          paymentMethod: 'cash',
          paymentAmount: 100000,
        },
        {
          itemIds: ['item-2'],
          paymentMethod: 'cash',
          paymentAmount: 100000,
        },
      ],
    };

    const result = await useCase.execute(input);

    expect(result.parentTransactionId).toBe('txn-1');
    expect(result.childTransactions).toHaveLength(2);
    expect(result.childTransactions[0].receiptNumber).toBe('TXN-001-S1');
    expect(result.childTransactions[1].receiptNumber).toBe('TXN-001-S2');

    // Validate total matches original
    const totalSplit = result.childTransactions.reduce((sum, c) => sum + c.grandTotal, 0);
    expect(totalSplit).toBe(baseTransaction.grandTotal);
  });

  it('should throw BusinessError when transaction is not found', async () => {
    mockTransactionRepo.findById.mockResolvedValue(null);

    const input: SplitByItemsInput = {
      splitType: 'by_items',
      transactionId: 'txn-not-found',
      employeeId: 'emp-1',
      splits: [],
    };

    await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
    await expect(useCase.execute(input)).rejects.toThrow('Transaction not found');
  });

  it('should throw BusinessError when transaction is not completed', async () => {
    mockTransactionRepo.findById.mockResolvedValue({
      ...baseTransaction,
      status: 'voided',
    });

    const input: SplitByItemsInput = {
      splitType: 'by_items',
      transactionId: 'txn-1',
      employeeId: 'emp-1',
      splits: [
        { itemIds: ['item-1'], paymentMethod: 'cash', paymentAmount: 100000 },
      ],
    };

    await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
    await expect(useCase.execute(input)).rejects.toThrow('Only completed transactions can be split');
  });

  it('should throw BusinessError when item ID does not exist in transaction', async () => {
    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);

    const input: SplitByItemsInput = {
      splitType: 'by_items',
      transactionId: 'txn-1',
      employeeId: 'emp-1',
      splits: [
        { itemIds: ['item-1', 'item-nonexistent'], paymentMethod: 'cash', paymentAmount: 200000 },
      ],
    };

    await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
    await expect(useCase.execute(input)).rejects.toThrow(/not found in transaction/);
  });

  it('should throw BusinessError when not all items are covered', async () => {
    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);

    const input: SplitByItemsInput = {
      splitType: 'by_items',
      transactionId: 'txn-1',
      employeeId: 'emp-1',
      splits: [
        { itemIds: ['item-1'], paymentMethod: 'cash', paymentAmount: 200000 },
        // item-2 not covered
      ],
    };

    await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
    await expect(useCase.execute(input)).rejects.toThrow('All items must be assigned to a split');
  });

  it('should throw BusinessError when payment is insufficient for a split', async () => {
    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);

    const input: SplitByItemsInput = {
      splitType: 'by_items',
      transactionId: 'txn-1',
      employeeId: 'emp-1',
      splits: [
        { itemIds: ['item-1'], paymentMethod: 'cash', paymentAmount: 1 }, // too little
        { itemIds: ['item-2'], paymentMethod: 'cash', paymentAmount: 200000 },
      ],
    };

    await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
    await expect(useCase.execute(input)).rejects.toThrow(/insufficient/i);
  });

  // --- Split Evenly Tests ---

  it('should split bill evenly into specified number of parts', async () => {
    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);

    const input: SplitEvenlyInput = {
      splitType: 'evenly',
      transactionId: 'txn-1',
      employeeId: 'emp-1',
      numberOfSplits: 2,
      payments: [
        { paymentMethod: 'cash', paymentAmount: 100000 },
        { paymentMethod: 'cash', paymentAmount: 100000 },
      ],
    };

    const result = await useCase.execute(input);

    expect(result.parentTransactionId).toBe('txn-1');
    expect(result.childTransactions).toHaveLength(2);

    // grandTotal = 111000 / 2 = 55500 each
    const totalSplit = result.childTransactions.reduce((sum, c) => sum + c.grandTotal, 0);
    expect(totalSplit).toBe(111000);
  });

  it('should handle remainder correctly when splitting evenly', async () => {
    // grandTotal = 111000, split 3 ways
    // 111000 / 3 = 37000 each
    // remainder = 111000 - 37000 * 3 = 0 ... actually 111000 / 3 = 37000 exactly
    // Let's use a different total to produce a remainder
    const oddTransaction: TransactionRecord = {
      ...baseTransaction,
      grandTotal: 100000, // 100000 / 3 = 33333, remainder = 1
    };

    mockTransactionRepo.findById.mockResolvedValue(oddTransaction);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);

    const input: SplitEvenlyInput = {
      splitType: 'evenly',
      transactionId: 'txn-1',
      employeeId: 'emp-1',
      numberOfSplits: 3,
      payments: [
        { paymentMethod: 'cash', paymentAmount: 50000 },
        { paymentMethod: 'cash', paymentAmount: 50000 },
        { paymentMethod: 'cash', paymentAmount: 50000 },
      ],
    };

    const result = await useCase.execute(input);

    expect(result.childTransactions).toHaveLength(3);
    // First split gets the remainder
    const firstAmount = result.childTransactions[0].grandTotal;
    const secondAmount = result.childTransactions[1].grandTotal;
    const thirdAmount = result.childTransactions[2].grandTotal;

    // 33333 * 3 = 99999, remainder = 1
    // first = 33333 + 1 = 33334, second = 33333, third = 33333
    expect(firstAmount).toBe(33334);
    expect(secondAmount).toBe(33333);
    expect(thirdAmount).toBe(33333);

    const totalSplit = firstAmount + secondAmount + thirdAmount;
    expect(totalSplit).toBe(100000);
  });

  it('should throw BusinessError when splitting into less than 2 parts', async () => {
    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);

    const input: SplitEvenlyInput = {
      splitType: 'evenly',
      transactionId: 'txn-1',
      employeeId: 'emp-1',
      numberOfSplits: 1,
      payments: [
        { paymentMethod: 'cash', paymentAmount: 200000 },
      ],
    };

    await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
    await expect(useCase.execute(input)).rejects.toThrow('Must split into at least 2 parts');
  });

  it('should throw BusinessError when number of payments does not match splits', async () => {
    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);

    const input: SplitEvenlyInput = {
      splitType: 'evenly',
      transactionId: 'txn-1',
      employeeId: 'emp-1',
      numberOfSplits: 3,
      payments: [
        { paymentMethod: 'cash', paymentAmount: 50000 },
        // Only 1 payment for 3 splits
      ],
    };

    await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
    await expect(useCase.execute(input)).rejects.toThrow(
      'Number of payments must match number of splits',
    );
  });

  it('should throw BusinessError when even split payment is insufficient', async () => {
    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);

    const input: SplitEvenlyInput = {
      splitType: 'evenly',
      transactionId: 'txn-1',
      employeeId: 'emp-1',
      numberOfSplits: 2,
      payments: [
        { paymentMethod: 'cash', paymentAmount: 100000 },
        { paymentMethod: 'cash', paymentAmount: 1 }, // way too low
      ],
    };

    await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
    await expect(useCase.execute(input)).rejects.toThrow(/insufficient/i);
  });

  it('should generate correct receipt numbers for child transactions', async () => {
    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);

    const input: SplitEvenlyInput = {
      splitType: 'evenly',
      transactionId: 'txn-1',
      employeeId: 'emp-1',
      numberOfSplits: 3,
      payments: [
        { paymentMethod: 'cash', paymentAmount: 100000 },
        { paymentMethod: 'cash', paymentAmount: 100000 },
        { paymentMethod: 'cash', paymentAmount: 100000 },
      ],
    };

    const result = await useCase.execute(input);

    expect(result.childTransactions[0].receiptNumber).toBe('TXN-001-S1');
    expect(result.childTransactions[1].receiptNumber).toBe('TXN-001-S2');
    expect(result.childTransactions[2].receiptNumber).toBe('TXN-001-S3');
  });

  it('should save each child transaction via repository', async () => {
    mockTransactionRepo.findById.mockResolvedValue(baseTransaction);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(baseItems);

    const input: SplitEvenlyInput = {
      splitType: 'evenly',
      transactionId: 'txn-1',
      employeeId: 'emp-1',
      numberOfSplits: 2,
      payments: [
        { paymentMethod: 'cash', paymentAmount: 100000 },
        { paymentMethod: 'cash', paymentAmount: 100000 },
      ],
    };

    await useCase.execute(input);

    expect(mockTransactionRepo.save).toHaveBeenCalledTimes(2);
    expect(mockTransactionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        receiptNumber: 'TXN-001-S1',
        status: 'completed',
      }),
    );
    expect(mockTransactionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        receiptNumber: 'TXN-001-S2',
        status: 'completed',
      }),
    );
  });

  it('should validate total of split by items matches original', async () => {
    // Items with discount to test more complex splits
    const itemsWithDiscount: TransactionItemRecord[] = [
      {
        ...baseItems[0],
        subtotal: 50000,
        discountAmount: 5000,
      },
      {
        ...baseItems[1],
        subtotal: 50000,
        discountAmount: 5000,
      },
    ];
    // Transaction with matching totals: subtotal - discount + tax = 100000 - 10000 + 11000 = 101000
    const txnWithDiscount: TransactionRecord = {
      ...baseTransaction,
      subtotal: 100000,
      discountAmount: 10000,
      taxAmount: 11000,
      grandTotal: 101000,
    };

    mockTransactionRepo.findById.mockResolvedValue(txnWithDiscount);
    mockTransactionRepo.findItemsByTransactionId.mockResolvedValue(itemsWithDiscount);

    const input: SplitByItemsInput = {
      splitType: 'by_items',
      transactionId: 'txn-1',
      employeeId: 'emp-1',
      splits: [
        { itemIds: ['item-1'], paymentMethod: 'cash', paymentAmount: 200000 },
        { itemIds: ['item-2'], paymentMethod: 'cash', paymentAmount: 200000 },
      ],
    };

    const result = await useCase.execute(input);

    // Each split has subtotal 50000, taxRatio = 11000/100000 = 0.11
    // tax per split = Math.round(50000 * 0.11) = 5500
    // grandTotal per split = 50000 - 5000 + 5500 = 50500
    // total = 50500 * 2 = 101000
    // This should match the original grandTotal
    const totalSplit = result.childTransactions.reduce((sum, c) => sum + c.grandTotal, 0);
    expect(totalSplit).toBe(txnWithDiscount.grandTotal);
  });
});

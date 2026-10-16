import { Prisma } from '@prisma/client';
import { ProcessRefundUseCase, type ProcessRefundInput } from './process-refund.use-case';
import type { EventBusService } from '@infrastructure/events/event-bus.service';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { DocumentNumberService } from '@shared/numbering';
import { TransactionNotFoundException } from '@domain/exceptions/transaction-not-found.exception';
import { RefundNotAllowedException } from '@domain/exceptions/refund-not-allowed.exception';

const D = (v: number) => new Prisma.Decimal(v);

describe('ProcessRefundUseCase', () => {
  let useCase: ProcessRefundUseCase;
  let tx: {
    $queryRaw: jest.Mock;
    transaction: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    shift: { findFirst: jest.Mock };
    bundlePackage: { findMany: jest.Mock };
    stockMovement: { createMany: jest.Mock };
    auditLog: { create: jest.Mock };
  };
  let prisma: { $transaction: jest.Mock };
  let eventBus: { publish: jest.Mock };

  const original = (over: Record<string, unknown> = {}) => ({
    id: 'txn-1',
    outletId: 'outlet-1',
    customerId: null,
    receiptNumber: 'TXN-001',
    orderType: 'takeaway',
    status: 'completed',
    subtotal: D(50000),
    discountAmount: D(5000),
    taxAmount: D(4950),
    serviceCharge: D(0),
    grandTotal: D(49950),
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        variantId: null,
        bundleId: null,
        productName: 'Nasi Goreng',
        variantName: null,
        quantity: D(2),
        unitPrice: D(25000),
      },
    ],
    payments: [{ paymentMethod: 'cash', amount: D(50000), status: 'completed', metadata: {} }],
    ...over,
  });

  const input = (over: Partial<ProcessRefundInput> = {}): ProcessRefundInput => ({
    transactionId: 'txn-1',
    businessId: 'biz-1',
    employeeId: 'emp-2',
    items: [{ transactionItemId: 'item-1', quantity: 1, reason: 'customer_request' }],
    refundMethod: 'cash',
    ...over,
  });

  beforeEach(() => {
    tx = {
      // 1st call: FOR UPDATE lock; later calls: stock restore UPDATE ... RETURNING
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'txn-1' }])
        .mockResolvedValue([{ id: 'sl-1', quantity: D(10) }]),
      transaction: {
        findFirst: jest.fn().mockResolvedValue(original()),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'refund-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      shift: { findFirst: jest.fn().mockResolvedValue({ id: 'shift-now' }) },
      bundlePackage: { findMany: jest.fn().mockResolvedValue([]) },
      stockMovement: { createMany: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    prisma = { $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)) };
    eventBus = { publish: jest.fn() };
    useCase = new ProcessRefundUseCase(
      prisma as unknown as PrismaService,
      eventBus as unknown as EventBusService,
      {
        next: jest.fn().mockResolvedValue('REF-20260927-0001'),
      } as unknown as DocumentNumberService,
    );
  });

  it('locks the original sale row inside the DB transaction', async () => {
    await useCase.execute(input());
    const sql = (tx.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join('?');
    expect(sql).toContain('FOR UPDATE');
    expect(tx.$queryRaw.mock.calls[0]).toEqual(expect.arrayContaining(['txn-1', 'biz-1']));
  });

  it('returns 404 for a sale of another business', async () => {
    tx.$queryRaw.mockReset().mockResolvedValue([]);
    await expect(useCase.execute(input())).rejects.toBeInstanceOf(TransactionNotFoundException);
  });

  it('prorates the sale discount and tax, links refundOfId and books into the current shift', async () => {
    const result = await useCase.execute(input());
    // line 25000, discount share 2500, tax share 2475 -> 24975
    expect(result.refundAmount).toBe(24975);
    const data = tx.transaction.create.mock.calls[0][0].data;
    expect(data.refundOfId).toBe('txn-1');
    expect(data.shiftId).toBe('shift-now');
    expect(data.grandTotal).toEqual(D(-24975));
    expect(data.payments.create).toEqual([
      expect.objectContaining({ paymentMethod: 'cash', amount: D(24975) }),
    ]);
    expect(tx.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: 'txn-1', status: { in: ['completed', 'partially_refunded'] } },
      data: { status: 'partially_refunded' },
    });
  });

  it('prevents over-refund when the same item is sent twice in one request', async () => {
    await expect(
      useCase.execute(
        input({
          items: [
            { transactionItemId: 'item-1', quantity: 2, reason: 'defect' },
            { transactionItemId: 'item-1', quantity: 1, reason: 'defect' },
          ],
        }),
      ),
    ).rejects.toThrow(/Cannot refund 3 units/);
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });

  it('prevents over-refund across earlier refunds (linked by refundOfId)', async () => {
    tx.transaction.findMany.mockResolvedValue([
      {
        grandTotal: D(-24975),
        items: [
          {
            productId: 'prod-1',
            variantId: null,
            quantity: D(1),
            notes: 'refund:item-1|reason:defect',
          },
        ],
      },
    ]);
    await expect(
      useCase.execute(
        input({ items: [{ transactionItemId: 'item-1', quantity: 2, reason: 'defect' }] }),
      ),
    ).rejects.toThrow(/Only 1 remaining/);
    expect(tx.transaction.findMany.mock.calls[0][0].where.OR[0]).toEqual({ refundOfId: 'txn-1' });
  });

  it('the final refund returns exactly the remaining amount and marks it refunded', async () => {
    tx.transaction.findMany.mockResolvedValue([
      {
        grandTotal: D(-24975),
        items: [
          {
            productId: 'prod-1',
            variantId: null,
            quantity: D(1),
            notes: 'refund:item-1|reason:defect',
          },
        ],
      },
    ]);
    const result = await useCase.execute(input());
    expect(result.refundAmount).toBe(24975);
    expect(tx.transaction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'refunded' } }),
    );
  });

  it('rejects refunds of an already refunded sale', async () => {
    tx.transaction.findFirst.mockResolvedValue(original({ status: 'refunded' }));
    await expect(useCase.execute(input())).rejects.toBeInstanceOf(RefundNotAllowedException);
  });

  it('refuses store credit (no credit-note ledger)', async () => {
    await expect(useCase.execute(input({ refundMethod: 'store_credit' }))).rejects.toThrow(
      /store credit is not supported/,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires an open shift for cash refunds', async () => {
    tx.shift.findFirst.mockResolvedValue(null);
    await expect(useCase.execute(input())).rejects.toThrow(/Open a shift/);
  });

  it('restores bundle component stock once for a refunded bundle line', async () => {
    tx.transaction.findFirst.mockResolvedValue(
      original({
        items: [
          {
            id: 'item-b',
            productId: null,
            variantId: null,
            bundleId: 'bundle-1',
            productName: 'Paket',
            variantName: null,
            quantity: D(1),
            unitPrice: D(50000),
          },
        ],
      }),
    );
    tx.bundlePackage.findMany.mockResolvedValue([
      {
        id: 'bundle-1',
        items: [
          { productId: 'p-a', variantId: null, quantity: D(2), product: { trackStock: true } },
          { productId: 'p-b', variantId: null, quantity: D(1), product: { trackStock: true } },
        ],
      },
    ]);
    await useCase.execute(
      input({ items: [{ transactionItemId: 'item-b', quantity: 1, reason: 'defect' }] }),
    );
    const movements = tx.stockMovement.createMany.mock.calls[0][0].data;
    expect(movements).toEqual([
      expect.objectContaining({ productId: 'p-a', quantity: D(2), movementType: 'return_stock' }),
      expect.objectContaining({ productId: 'p-b', quantity: D(1) }),
    ]);
  });
});

import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SplitBillUseCase } from './split-bill.use-case';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { DocumentNumberService } from '@shared/numbering';
import { BusinessError } from '@shared/errors/business-error';

const D = (v: number) => new Prisma.Decimal(v);

const parent = {
  id: 'tx-1',
  outletId: 'outlet-1',
  employeeId: 'emp-1',
  shiftId: 'shift-1',
  receiptNumber: 'TXN-1',
  transactionType: 'sale',
  orderType: 'dine_in',
  tableId: 'table-1',
  status: 'completed',
  subtotal: D(100000),
  discountAmount: D(0),
  taxAmount: D(11000),
  serviceCharge: D(5001),
  grandTotal: D(116001),
  items: [
    { id: 'item-1', subtotal: D(60000) },
    { id: 'item-2', subtotal: D(40000) },
  ],
};

function build() {
  const prisma = {
    transaction: {
      findFirst: jest.fn().mockResolvedValue(parent),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn(),
    },
    transactionItem: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  };
  let n = 0;
  prisma.transaction.create.mockImplementation(() => Promise.resolve({ id: `child-${++n}` }));
  prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
  let seq = 0;
  const numbers = { next: jest.fn(() => Promise.resolve(`SPL-20260927-000${++seq}`)) };
  const useCase = new SplitBillUseCase(
    prisma as unknown as PrismaService,
    numbers as unknown as DocumentNumberService,
  );
  return { prisma, numbers, useCase };
}

const sum = (calls: unknown[][], key: string) =>
  calls.reduce(
    (acc, c) => acc.plus((c[0] as { data: Record<string, Prisma.Decimal> }).data[key]),
    D(0),
  );

describe('SplitBillUseCase', () => {
  it('scopes the parent lookup to the caller business', async () => {
    const { prisma, useCase } = build();
    await useCase.execute({
      transactionId: 'tx-1',
      businessId: 'biz-1',
      splitType: 'equal',
      splits: [{ paymentMethod: 'cash' }, { paymentMethod: 'qris' }],
    });
    expect(prisma.transaction.findFirst.mock.calls[0][0].where).toEqual({
      id: 'tx-1',
      outlet: { businessId: 'biz-1' },
    });
  });

  it('keeps tax and service charge: children sum exactly to the parent', async () => {
    const { prisma, useCase } = build();
    const result = await useCase.execute({
      transactionId: 'tx-1',
      businessId: 'biz-1',
      splitType: 'equal',
      splits: [{ paymentMethod: 'cash' }, { paymentMethod: 'qris' }, { paymentMethod: 'ovo' }],
    });

    const calls = prisma.transaction.create.mock.calls;
    expect(calls).toHaveLength(3);
    expect(sum(calls, 'grandTotal').equals(parent.grandTotal)).toBe(true);
    expect(sum(calls, 'subtotal').equals(parent.subtotal)).toBe(true);
    expect(sum(calls, 'taxAmount').equals(parent.taxAmount)).toBe(true);
    expect(sum(calls, 'serviceCharge').equals(parent.serviceCharge)).toBe(true);
    expect(calls.every((c) => D(c[0].data.taxAmount).isPositive())).toBe(true);
    // each child carries its own payment
    expect(calls[1][0].data.payments.create[0]).toMatchObject({ paymentMethod: 'qris' });
    expect(result.childTransactions.map((c) => c.amount).reduce((a, b) => a + b, 0)).toBe(116001);
    // parent claimed with a conditional update
    expect(prisma.transaction.updateMany.mock.calls[0][0]).toEqual({
      where: { id: 'tx-1', status: 'completed' },
      data: { status: 'split' },
    });
  });

  it('a concurrent second split (conditional update count 0) is a conflict and creates nothing', async () => {
    const { prisma, useCase } = build();
    prisma.transaction.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      useCase.execute({
        transactionId: 'tx-1',
        businessId: 'biz-1',
        splitType: 'equal',
        splits: [{ paymentMethod: 'cash' }, { paymentMethod: 'cash' }],
      }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('by_amount must add up exactly (no over- or under-collection)', async () => {
    const { prisma, useCase } = build();
    await expect(
      useCase.execute({
        transactionId: 'tx-1',
        businessId: 'biz-1',
        splitType: 'by_amount',
        splits: [
          { paymentMethod: 'cash', amount: 100000 },
          { paymentMethod: 'cash', amount: 50000 },
        ],
      }),
    ).rejects.toThrow(BusinessError);
    expect(prisma.transaction.updateMany).not.toHaveBeenCalled();
  });

  it('by_item moves each item to its part and prorates by item value', async () => {
    const { prisma, useCase } = build();
    await useCase.execute({
      transactionId: 'tx-1',
      businessId: 'biz-1',
      splitType: 'by_item',
      splits: [
        { paymentMethod: 'cash', itemIds: ['item-1'] },
        { paymentMethod: 'cash', itemIds: ['item-2'] },
      ],
    });
    const calls = prisma.transaction.create.mock.calls;
    expect(D(calls[0][0].data.subtotal).equals(D(60000))).toBe(true);
    expect(prisma.transactionItem.updateMany.mock.calls[1][0]).toEqual({
      where: { id: { in: ['item-2'] }, transactionId: 'tx-1' },
      data: { transactionId: 'child-2' },
    });
  });

  it('by_item rejects items that are not on the bill', async () => {
    const { useCase } = build();
    await expect(
      useCase.execute({
        transactionId: 'tx-1',
        businessId: 'biz-1',
        splitType: 'by_item',
        splits: [
          { paymentMethod: 'cash', itemIds: ['item-1'] },
          { paymentMethod: 'cash', itemIds: ['other'] },
        ],
      }),
    ).rejects.toThrow(BusinessError);
  });
});

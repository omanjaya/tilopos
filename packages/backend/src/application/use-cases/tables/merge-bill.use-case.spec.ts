import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MergeBillUseCase } from './merge-bill.use-case';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { DocumentNumberService } from '@shared/numbering';
import { BusinessError } from '@shared/errors/business-error';

const D = (v: number) => new Prisma.Decimal(v);
const tx = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  outletId: 'outlet-1',
  shiftId: 'shift-1',
  customerId: null,
  tableId: 'table-1',
  orderType: 'dine_in',
  status: 'completed',
  transactionType: 'sale',
  receiptNumber: `R-${id}`,
  subtotal: D(10000),
  discountAmount: D(1000),
  taxAmount: D(990),
  serviceCharge: D(500),
  grandTotal: D(10490),
  ...overrides,
});

function build(rows = [tx('a'), tx('b')]) {
  const prisma = {
    transaction: {
      findMany: jest.fn().mockResolvedValue(rows),
      updateMany: jest.fn().mockResolvedValue({ count: rows.length }),
      create: jest.fn().mockResolvedValue({ id: 'merged-1' }),
    },
    transactionItem: { updateMany: jest.fn() },
    payment: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (t: unknown) => unknown) => fn(prisma));
  const numbers = { next: jest.fn().mockResolvedValue('MRG-20260927-0001') };
  return {
    prisma,
    numbers,
    useCase: new MergeBillUseCase(
      prisma as unknown as PrismaService,
      numbers as unknown as DocumentNumberService,
    ),
  };
}

const input = { transactionIds: ['a', 'b'], employeeId: 'emp-1', businessId: 'biz-1' };

describe('MergeBillUseCase', () => {
  it('marks originals so reports (status=completed) do not count them twice', async () => {
    const { prisma, useCase } = build();
    const result = await useCase.execute(input);

    expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a', 'b'] }, status: 'completed' },
      data: { status: 'split', voidReason: 'Merged into MRG-20260927-0001' },
    });
    const data = prisma.transaction.create.mock.calls[0][0].data;
    expect(data.status).toBe('completed');
    expect(D(data.taxAmount).equals(D(1980))).toBe(true);
    expect(D(data.serviceCharge).equals(D(1000))).toBe(true);
    expect(D(data.grandTotal).equals(D(20980))).toBe(true);
    expect(result).toMatchObject({ mergedTransactionId: 'merged-1', grandTotal: 20980 });
    // items and payments follow the merged bill
    expect(prisma.transactionItem.updateMany).toHaveBeenCalledWith({
      where: { transactionId: { in: ['a', 'b'] } },
      data: { transactionId: 'merged-1' },
    });
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { transactionId: { in: ['a', 'b'] } },
      data: { transactionId: 'merged-1' },
    });
  });

  it('scopes lookup to the caller business and 404s on foreign ids', async () => {
    const { prisma, useCase } = build([tx('a')]);
    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
    expect(prisma.transaction.findMany.mock.calls[0][0].where).toEqual({
      id: { in: ['a', 'b'] },
      outlet: { businessId: 'biz-1' },
    });
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });

  it('dedupes ids: the same bill twice is not a merge', async () => {
    const { useCase } = build();
    await expect(useCase.execute({ ...input, transactionIds: ['a', 'a'] })).rejects.toThrow(
      BusinessError,
    );
  });

  it('rejects bills from different outlets', async () => {
    const { useCase } = build([tx('a'), tx('b', { outletId: 'outlet-2' })]);
    await expect(useCase.execute(input)).rejects.toThrow(BusinessError);
  });

  it('a concurrent merge that already claimed a bill is a conflict (rollback)', async () => {
    const { prisma, useCase } = build();
    prisma.transaction.updateMany.mockResolvedValueOnce({ count: 1 });
    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
    expect(prisma.transaction.create).not.toHaveBeenCalled();
  });
});

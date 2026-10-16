import { Prisma } from '@prisma/client';
import { RecordCreditPaymentUseCase } from '../record-credit-payment.use-case';
import type { PrismaService } from '@infrastructure/database/prisma.service';

const D = (v: number) => new Prisma.Decimal(v);

describe('RecordCreditPaymentUseCase', () => {
  let tx: {
    $queryRaw: jest.Mock;
    creditPayment: { create: jest.Mock };
    creditSale: { update: jest.Mock };
    transaction: { updateMany: jest.Mock };
    customer: { updateMany: jest.Mock };
  };
  let useCase: RecordCreditPaymentUseCase;

  const lockedRow = {
    id: 'cs-1',
    transaction_id: 'txn-1',
    customer_id: 'cust-1',
    total_amount: D(100000),
    paid_amount: D(40000),
    outstanding_amount: D(60000),
    status: 'partially_paid',
    transaction_status: 'partially_paid',
  };
  const base = {
    businessId: 'biz-1',
    creditSaleId: 'cs-1',
    paymentMethod: 'cash',
    receivedBy: 'emp-1',
  };

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([lockedRow]),
      creditPayment: { create: jest.fn() },
      creditSale: { update: jest.fn() },
      transaction: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      customer: { updateMany: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)) };
    useCase = new RecordCreditPaymentUseCase(prisma as unknown as PrismaService);
  });

  it('locks the credit sale row (FOR UPDATE, tenant-scoped) before checking', async () => {
    await useCase.execute({ ...base, amount: 10000 });
    const sql = (tx.$queryRaw.mock.calls[0][0] as string[]).join('?');
    expect(sql).toContain('FOR UPDATE');
    expect(sql).toContain('business_id');
  });

  it('rejects an over-payment against the locked outstanding amount', async () => {
    await expect(useCase.execute({ ...base, amount: 60001 })).rejects.toThrow(
      /exceeds outstanding/,
    );
    expect(tx.creditPayment.create).not.toHaveBeenCalled();
    expect(tx.customer.updateMany).not.toHaveBeenCalled();
  });

  it('settles with Decimal math and completes the transaction conditionally', async () => {
    const result = await useCase.execute({ ...base, amount: 60000 });
    expect(result).toEqual(
      expect.objectContaining({ newPaidAmount: 100000, newOutstandingAmount: 0, isSettled: true }),
    );
    expect(tx.transaction.updateMany).toHaveBeenCalledWith({
      where: { id: 'txn-1', status: { in: ['credit', 'partially_paid'] } },
      data: { status: 'completed' },
    });
  });

  it('rejects payments on voided transactions and credit notes', async () => {
    tx.$queryRaw.mockResolvedValue([{ ...lockedRow, transaction_status: 'voided' }]);
    await expect(useCase.execute({ ...base, amount: 1000 })).rejects.toThrow(/voided/);
    await expect(
      useCase.execute({ ...base, amount: 1000, paymentMethod: 'credit_note' }),
    ).rejects.toThrow(/Credit notes/);
  });

  it('returns not found for a credit sale of another business', async () => {
    tx.$queryRaw.mockResolvedValue([]);
    await expect(useCase.execute({ ...base, amount: 1000 })).rejects.toThrow(/not found/);
  });
});

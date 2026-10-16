import { Prisma } from '@prisma/client';
import { money, sumMoney } from '@shared/utils/money';

/** Minimal Prisma surface needed to total a shift (PrismaService or a tx client). */
export type ShiftCashClient = Pick<Prisma.TransactionClient, 'payment' | 'transaction'>;

export interface ShiftCashTotals {
  cashSales: Prisma.Decimal;
  cashRefunds: Prisma.Decimal;
  totalSales: Prisma.Decimal;
  transactionCount: number;
  expectedCash: Prisma.Decimal;
}

/**
 * Cash the drawer should hold for a shift (Docs/ENGINEERING-RULES.md R8):
 * opening + cash sales - cash refunds + petty cash in - petty cash out.
 * All arithmetic is Prisma.Decimal.
 */
export async function computeShiftCash(
  db: ShiftCashClient,
  shift: {
    id: string;
    openingCash: Prisma.Decimal | number;
    cashIn: Prisma.Decimal | number | null;
    cashOut: Prisma.Decimal | number | null;
  },
): Promise<ShiftCashTotals> {
  const [cashPayments, cashRefunds, sales] = await Promise.all([
    db.payment.aggregate({
      where: {
        transaction: { shiftId: shift.id, transactionType: 'sale', status: { not: 'voided' } },
        paymentMethod: 'cash',
        status: 'completed',
      },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: {
        transaction: { shiftId: shift.id, transactionType: 'refund', status: { not: 'voided' } },
        paymentMethod: 'cash',
        status: 'completed',
      },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { shiftId: shift.id, transactionType: 'sale', status: 'completed' },
      _sum: { grandTotal: true },
      _count: { id: true },
    }),
  ]);

  const cashSales = money(cashPayments._sum.amount);
  const refunds = money(cashRefunds._sum.amount).abs();
  const expectedCash = sumMoney([shift.openingCash, cashSales, shift.cashIn])
    .minus(refunds)
    .minus(money(shift.cashOut));

  return {
    cashSales,
    cashRefunds: refunds,
    totalSales: money(sales._sum.grandTotal),
    transactionCount: sales._count?.id ?? 0,
    expectedCash,
  };
}

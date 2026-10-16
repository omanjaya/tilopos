import { Prisma } from '@prisma/client';
import { money } from '@shared/utils/money';

export interface DrawerShift {
  id: string;
  openingCash: Prisma.Decimal;
  cashIn: Prisma.Decimal;
  cashOut: Prisma.Decimal;
}

/**
 * Cash that should be in the drawer of a shift right now:
 * opening + cash-in - cash-out + cash taken on sales (net of change given)
 * - cash paid out on refunds. Voided sales are excluded.
 */
export async function expectedDrawerCash(
  tx: Prisma.TransactionClient,
  shift: DrawerShift,
): Promise<Prisma.Decimal> {
  const rows = await tx.$queryRaw<
    Array<{ net_cash_sales: Prisma.Decimal | null; cash_refunds: Prisma.Decimal | null }>
  >`
    WITH per_tx AS (
      SELECT t.transaction_type,
             t.grand_total,
             COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) AS paid,
             COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed' AND p.payment_method = 'cash'), 0) AS cash
        FROM transactions t
        LEFT JOIN payments p ON p.transaction_id = t.id
       WHERE t.shift_id = ${shift.id}::uuid
         AND t.status <> 'voided'
       GROUP BY t.id, t.transaction_type, t.grand_total
    )
    SELECT
      COALESCE(SUM(CASE WHEN transaction_type = 'sale'
                        THEN cash - LEAST(cash, GREATEST(paid - grand_total, 0)) END), 0) AS net_cash_sales,
      COALESCE(SUM(CASE WHEN transaction_type = 'refund' THEN cash END), 0) AS cash_refunds
    FROM per_tx`;
  const row = rows[0];
  return money(shift.openingCash)
    .plus(money(shift.cashIn))
    .minus(money(shift.cashOut))
    .plus(money(row?.net_cash_sales))
    .minus(money(row?.cash_refunds));
}

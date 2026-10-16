import { Prisma } from '@prisma/client';
import { BusinessError } from '@shared/errors/business-error';
import { ErrorCode } from '@shared/constants/error-codes';
import type { DrawerShift } from '../../services/cash-drawer';

/**
 * Locks an open shift of the given outlet/business (SELECT ... FOR UPDATE) and
 * returns its cash fields. Throws SHIFT_NOT_OPEN for a closed, foreign or
 * unknown shift, so a shift id from the client can never touch another outlet.
 */
export async function lockOpenShift(
  tx: Prisma.TransactionClient,
  shiftId: string,
  /** Null only for owners without an assigned outlet (business scope still applies). */
  outletId: string | null,
  businessId: string,
): Promise<DrawerShift & { outletId: string }> {
  const rows = await tx.$queryRaw<
    Array<{
      id: string;
      outlet_id: string;
      opening_cash: Prisma.Decimal;
      cash_in: Prisma.Decimal;
      cash_out: Prisma.Decimal;
    }>
  >`
    SELECT s.id, s.outlet_id, s.opening_cash, s.cash_in, s.cash_out
      FROM shifts s
      JOIN outlets o ON o.id = s.outlet_id
     WHERE s.id = ${shiftId}::uuid
       AND (${outletId}::uuid IS NULL OR s.outlet_id = ${outletId}::uuid)
       AND o.business_id = ${businessId}::uuid
       AND s.status = 'open'
     FOR UPDATE OF s`;
  const row = rows[0];
  if (!row) {
    throw new BusinessError(ErrorCode.SHIFT_NOT_OPEN, 'Shift is not open');
  }
  return {
    id: row.id,
    outletId: row.outlet_id,
    openingCash: row.opening_cash,
    cashIn: row.cash_in,
    cashOut: row.cash_out,
  };
}

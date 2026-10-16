import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

/** Detail shape returned by every opname endpoint (matches the web StockOpnameDetail type). */
export const OPNAME_DETAIL_INCLUDE = {
  outlet: { select: { name: true } },
  createdByEmployee: { select: { name: true } },
  approvedByEmployee: { select: { name: true } },
  items: {
    include: {
      product: { select: { name: true, sku: true } },
      variant: { select: { name: true, sku: true } },
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.StockOpnameInclude;

/**
 * Called after a conditional `updateMany` matched no row: distinguishes "not found in
 * this business" (404) from "exists but in the wrong status" (409).
 */
export async function throwOpnameTransitionError(
  tx: Prisma.TransactionClient,
  opnameId: string,
  businessId: string,
  action: string,
): Promise<never> {
  const current = await tx.stockOpname.findFirst({
    where: { id: opnameId, outlet: { businessId } },
    select: { status: true },
  });
  if (!current) throw new NotFoundException('Stock opname not found');
  throw new ConflictException(`Cannot ${action} opname with status "${current.status}"`);
}

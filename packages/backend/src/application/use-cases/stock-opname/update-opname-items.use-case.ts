import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OPNAME_DETAIL_INCLUDE, throwOpnameTransitionError } from './opname-common';

export interface UpdateOpnameItemsInput {
  opnameId: string;
  businessId: string;
  items: { itemId: string; actualQuantity: number; notes?: string }[];
}

@Injectable()
export class UpdateOpnameItemsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: UpdateOpnameItemsInput) {
    return this.prisma.$transaction(async (tx) => {
      // Touching the row with a status-conditional update locks it for this transaction,
      // so a concurrent complete/cancel cannot slip in between the check and the writes.
      const touched = await tx.stockOpname.updateMany({
        where: {
          id: input.opnameId,
          outlet: { businessId: input.businessId },
          status: { in: ['draft', 'in_progress'] },
        },
        data: { updatedAt: new Date() },
      });
      if (touched.count === 0) {
        await throwOpnameTransitionError(tx, input.opnameId, input.businessId, 'update items for');
      }

      const itemIds = [...new Set(input.items.map((i) => i.itemId))];
      const existing = await tx.stockOpnameItem.findMany({
        where: { id: { in: itemIds }, opnameId: input.opnameId },
        select: { id: true, systemQuantity: true, notes: true },
      });
      const byId = new Map(existing.map((e) => [e.id, e]));
      const missing = itemIds.find((id) => !byId.has(id));
      if (missing) throw new NotFoundException(`Opname item "${missing}" not found`);

      for (const item of input.items) {
        const current = byId.get(item.itemId)!;
        const actualQty = new Prisma.Decimal(item.actualQuantity);
        await tx.stockOpnameItem.update({
          where: { id: item.itemId },
          data: {
            actualQuantity: actualQty,
            difference: actualQty.minus(current.systemQuantity),
            notes: item.notes ?? current.notes,
          },
        });
      }

      // draft -> in_progress on the first count (conditional, idempotent).
      await tx.stockOpname.updateMany({
        where: { id: input.opnameId, status: 'draft' },
        data: { status: 'in_progress', startedAt: new Date() },
      });

      return tx.stockOpname.findUnique({
        where: { id: input.opnameId },
        include: OPNAME_DETAIL_INCLUDE,
      });
    });
  }
}

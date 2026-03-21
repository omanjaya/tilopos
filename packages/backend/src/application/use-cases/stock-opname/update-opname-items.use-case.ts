import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface UpdateOpnameItemsInput {
  opnameId: string;
  items: { itemId: string; actualQuantity: number; notes?: string }[];
}

@Injectable()
export class UpdateOpnameItemsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: UpdateOpnameItemsInput) {
    const opname = await this.prisma.stockOpname.findUnique({
      where: { id: input.opnameId },
    });

    if (!opname) throw new NotFoundException('Stock opname not found');
    if (opname.status !== 'draft' && opname.status !== 'in_progress') {
      throw new BadRequestException(
        `Cannot update items for opname with status "${opname.status}"`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of input.items) {
        const existing = await tx.stockOpnameItem.findUnique({
          where: { id: item.itemId },
        });
        if (!existing || existing.opnameId !== input.opnameId) {
          throw new NotFoundException(`Opname item "${item.itemId}" not found`);
        }

        const actualQty = new Decimal(item.actualQuantity);
        const diff = actualQty.minus(existing.systemQuantity);

        await tx.stockOpnameItem.update({
          where: { id: item.itemId },
          data: {
            actualQuantity: actualQty,
            difference: diff,
            notes: item.notes ?? existing.notes,
          },
        });
      }

      // If status is still draft, move to in_progress
      if (opname.status === 'draft') {
        await tx.stockOpname.update({
          where: { id: input.opnameId },
          data: { status: 'in_progress', startedAt: new Date() },
        });
      }
    });

    return this.prisma.stockOpname.findUnique({
      where: { id: input.opnameId },
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true } },
            variant: { select: { name: true, sku: true } },
          },
        },
        createdByEmployee: { select: { name: true } },
        approvedByEmployee: { select: { name: true } },
      },
    });
  }
}

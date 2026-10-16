import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { DocumentNumberService } from '@shared/numbering';
import { MAX_OPNAME_ITEMS } from '@application/dtos/stock-opname.dto';
import { OPNAME_DETAIL_INCLUDE } from './opname-common';

export interface CreateStockOpnameInput {
  businessId: string;
  /** Must already be verified to belong to `businessId`. */
  outletId: string;
  employeeId: string;
  productIds?: string[];
  notes?: string;
}

/** Prefix for opname numbers. Distinct from self-order 'SO-' numbers. */
export const OPNAME_NUMBER_PREFIX = 'OPN';

@Injectable()
export class CreateStockOpnameUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentNumbers: DocumentNumberService,
  ) {}

  /**
   * Creates the opname, its per-tenant number (OPN-YYYYMMDD-0001, Asia/Jakarta day) and
   * the system-quantity snapshot in ONE transaction (R9, R14, R15).
   */
  async execute(input: CreateStockOpnameInput) {
    const stockWhere: Prisma.StockLevelWhereInput = {
      outletId: input.outletId,
      outlet: { businessId: input.businessId },
      product: { businessId: input.businessId, trackStock: true },
      ...(input.productIds?.length ? { productId: { in: input.productIds } } : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const opnameNumber = await this.documentNumbers.next(
        tx,
        input.businessId,
        OPNAME_NUMBER_PREFIX,
      );

      const stockLevels = await tx.stockLevel.findMany({
        where: stockWhere,
        select: { productId: true, variantId: true, quantity: true },
        take: MAX_OPNAME_ITEMS + 1,
      });
      if (stockLevels.length > MAX_OPNAME_ITEMS) {
        throw new BadRequestException(
          `An opname can hold at most ${MAX_OPNAME_ITEMS} items; select fewer products`,
        );
      }

      const created = await tx.stockOpname.create({
        data: {
          outletId: input.outletId,
          opnameNumber,
          status: 'draft',
          notes: input.notes || null,
          createdBy: input.employeeId,
        },
      });

      if (stockLevels.length > 0) {
        await tx.stockOpnameItem.createMany({
          data: stockLevels.map((sl) => ({
            opnameId: created.id,
            productId: sl.productId,
            variantId: sl.variantId,
            systemQuantity: sl.quantity,
          })),
        });
      }

      return tx.stockOpname.findUnique({
        where: { id: created.id },
        include: OPNAME_DETAIL_INCLUDE,
      });
    });
  }
}

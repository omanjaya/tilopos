import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

export interface CreateStockOpnameInput {
  outletId: string;
  employeeId: string;
  productIds?: string[];
  notes?: string;
}

@Injectable()
export class CreateStockOpnameUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: CreateStockOpnameInput) {
    // Generate opname number: SO-YYYYMMDD-NNN
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.stockOpname.count({
      where: {
        opnameNumber: { startsWith: `SO-${dateStr}` },
      },
    });
    const opnameNumber = `SO-${dateStr}-${String(count + 1).padStart(3, '0')}`;

    // Get stock levels for the outlet
    const stockWhere: Record<string, unknown> = { outletId: input.outletId };
    if (input.productIds?.length) {
      stockWhere.productId = { in: input.productIds };
    }

    const stockLevels = await this.prisma.stockLevel.findMany({
      where: stockWhere,
      include: {
        product: { select: { id: true, name: true, sku: true, trackStock: true } },
        variant: { select: { id: true, name: true, sku: true } },
      },
    });

    // Filter only tracked products
    const trackedLevels = stockLevels.filter((sl) => sl.product?.trackStock !== false);

    // Create opname with items in a transaction
    const opname = await this.prisma.$transaction(async (tx) => {
      const created = await tx.stockOpname.create({
        data: {
          outletId: input.outletId,
          opnameNumber,
          status: 'draft',
          notes: input.notes || null,
          createdBy: input.employeeId,
        },
      });

      if (trackedLevels.length > 0) {
        await tx.stockOpnameItem.createMany({
          data: trackedLevels.map((sl) => ({
            opnameId: created.id,
            productId: sl.productId,
            variantId: sl.variantId,
            systemQuantity: sl.quantity,
          })),
        });
      }

      return tx.stockOpname.findUnique({
        where: { id: created.id },
        include: {
          items: {
            include: {
              product: { select: { name: true, sku: true } },
              variant: { select: { name: true, sku: true } },
            },
          },
          createdByEmployee: { select: { name: true } },
        },
      });
    });

    return opname;
  }
}

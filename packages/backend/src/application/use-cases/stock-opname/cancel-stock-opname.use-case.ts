import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { OPNAME_DETAIL_INCLUDE, throwOpnameTransitionError } from './opname-common';

export interface CancelStockOpnameInput {
  opnameId: string;
  businessId: string;
}

@Injectable()
export class CancelStockOpnameUseCase {
  constructor(private readonly prisma: PrismaService) {}

  /** Conditional transition draft|in_progress -> cancelled, scoped to the business (R9). */
  async execute(input: CancelStockOpnameInput) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.stockOpname.updateMany({
        where: {
          id: input.opnameId,
          outlet: { businessId: input.businessId },
          status: { in: ['draft', 'in_progress'] },
        },
        data: { status: 'cancelled' },
      });
      if (result.count === 0) {
        await throwOpnameTransitionError(tx, input.opnameId, input.businessId, 'cancel');
      }
      return tx.stockOpname.findUnique({
        where: { id: input.opnameId },
        include: OPNAME_DETAIL_INCLUDE,
      });
    });
  }
}

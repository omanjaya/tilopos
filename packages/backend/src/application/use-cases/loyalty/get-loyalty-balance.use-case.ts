import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { AppError } from '@shared/errors/app-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { toNumber } from '@shared/utils/money';

export interface GetLoyaltyBalanceParams {
  businessId: string;
  customerId: string;
}

export interface LoyaltyBalanceResult {
  customerId: string;
  currentPoints: number;
  currentTier: string;
  totalSpent: number;
  visitCount: number;
  programActive: boolean;
  nextTier?: {
    name: string;
    minPoints: number;
    pointsNeeded: number;
  };
}

@Injectable()
export class GetLoyaltyBalanceUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: GetLoyaltyBalanceParams): Promise<LoyaltyBalanceResult> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: params.customerId, businessId: params.businessId },
      select: {
        id: true,
        loyaltyPoints: true,
        loyaltyTier: true,
        totalSpent: true,
        visitCount: true,
      },
    });
    if (!customer) {
      throw new AppError(ErrorCode.CUSTOMER_NOT_FOUND, 'Customer not found', HttpStatus.NOT_FOUND);
    }

    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { businessId: params.businessId, isActive: true },
      select: { id: true },
    });
    const programActive = !!program;

    let nextTier: LoyaltyBalanceResult['nextTier'];
    if (programActive) {
      // Next tier = the lowest tier that needs more points than the customer has
      // (works for customers on the default 'regular' tier too).
      const next = await this.prisma.loyaltyTier.findFirst({
        where: {
          businessId: params.businessId,
          isActive: true,
          minPoints: { gt: customer.loyaltyPoints },
        },
        orderBy: [{ minPoints: 'asc' }, { sortOrder: 'asc' }],
        select: { name: true, minPoints: true },
      });
      if (next) {
        nextTier = {
          name: next.name,
          minPoints: next.minPoints,
          pointsNeeded: next.minPoints - customer.loyaltyPoints,
        };
      }
    }

    return {
      customerId: customer.id,
      currentPoints: customer.loyaltyPoints,
      currentTier: customer.loyaltyTier,
      totalSpent: toNumber(customer.totalSpent),
      visitCount: customer.visitCount,
      programActive,
      nextTier,
    };
  }
}

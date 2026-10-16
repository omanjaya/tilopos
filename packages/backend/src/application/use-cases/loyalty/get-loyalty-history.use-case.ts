import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { AppError } from '@shared/errors/app-error';
import { ErrorCode } from '@shared/constants/error-codes';

export interface GetLoyaltyHistoryParams {
  businessId: string;
  customerId: string;
  limit?: number;
}

export interface LoyaltyHistoryResult {
  transactions: Array<{
    id: string;
    type: 'earned' | 'redeemed' | 'adjusted' | 'expired' | 'reversed';
    points: number;
    balanceAfter: number;
    description: string | null;
    createdAt: Date;
  }>;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

@Injectable()
export class GetLoyaltyHistoryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: GetLoyaltyHistoryParams): Promise<LoyaltyHistoryResult> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: params.customerId, businessId: params.businessId },
      select: { id: true },
    });
    if (!customer) {
      throw new AppError(ErrorCode.CUSTOMER_NOT_FOUND, 'Customer not found', HttpStatus.NOT_FOUND);
    }

    const requested = Number.isInteger(params.limit) ? (params.limit as number) : DEFAULT_LIMIT;
    const take = Math.min(Math.max(requested, 1), MAX_LIMIT);

    const transactions = await this.prisma.loyaltyTransaction.findMany({
      where: { customerId: customer.id, customer: { businessId: params.businessId } },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        type: true,
        points: true,
        balanceAfter: true,
        description: true,
        createdAt: true,
      },
    });

    return { transactions };
  }
}

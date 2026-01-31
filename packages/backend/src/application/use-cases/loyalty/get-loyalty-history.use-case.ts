import { Inject, Injectable } from '@nestjs/common';
import type { ILoyaltyRepository } from '../../../domain/interfaces/repositories/loyalty.repository';
import type { ICustomerRepository } from '../../../domain/interfaces/repositories/customer.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';
import { AppError } from '../../../shared/errors/app-error';
import { ErrorCode } from '../../../shared/constants/error-codes';

export interface GetLoyaltyHistoryParams {
  customerId: string;
  limit?: number;
}

export interface LoyaltyHistoryResult {
  transactions: Array<{
    id: string;
    type: 'earned' | 'redeemed' | 'adjusted' | 'expired';
    points: number;
    balanceAfter: number;
    description: string | null;
    createdAt: Date;
  }>;
}

@Injectable()
export class GetLoyaltyHistoryUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.LOYALTY)
    private readonly loyaltyRepo: ILoyaltyRepository,
    @Inject(REPOSITORY_TOKENS.CUSTOMER)
    private readonly customerRepo: ICustomerRepository,
  ) {}

  async execute(params: GetLoyaltyHistoryParams): Promise<LoyaltyHistoryResult> {
    const customer = await this.customerRepo.findById(params.customerId);
    if (!customer) {
      throw new AppError(ErrorCode.CUSTOMER_NOT_FOUND, 'Customer not found');
    }

    const transactions = await this.loyaltyRepo.findTransactionsByCustomer(
      params.customerId,
      params.limit,
    );

    return {
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        points: tx.points,
        balanceAfter: tx.balanceAfter,
        description: tx.description,
        createdAt: tx.createdAt,
      })),
    };
  }
}

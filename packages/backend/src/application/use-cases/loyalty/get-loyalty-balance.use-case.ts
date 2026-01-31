import { Inject, Injectable } from '@nestjs/common';
import type { ILoyaltyRepository } from '../../../domain/interfaces/repositories/loyalty.repository';
import type { ICustomerRepository } from '../../../domain/interfaces/repositories/customer.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';
import { AppError } from '../../../shared/errors/app-error';
import { ErrorCode } from '../../../shared/constants/error-codes';

export interface GetLoyaltyBalanceParams {
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
  constructor(
    @Inject(REPOSITORY_TOKENS.LOYALTY)
    private readonly loyaltyRepo: ILoyaltyRepository,
    @Inject(REPOSITORY_TOKENS.CUSTOMER)
    private readonly customerRepo: ICustomerRepository,
  ) {}

  async execute(params: GetLoyaltyBalanceParams): Promise<LoyaltyBalanceResult> {
    const customer = await this.customerRepo.findById(params.customerId);
    if (!customer) {
      throw new AppError(ErrorCode.CUSTOMER_NOT_FOUND, 'Customer not found');
    }

    const program = await this.loyaltyRepo.findActiveProgram(customer.businessId);
    const programActive = !!program;

    let nextTier: { name: string; minPoints: number; pointsNeeded: number } | undefined;

    if (programActive) {
      const tiers = await this.loyaltyRepo.findTiersByBusiness(customer.businessId);
      const currentTierIndex = tiers.findIndex((t) => t.name === customer.loyaltyTier);

      if (currentTierIndex >= 0 && currentTierIndex < tiers.length - 1) {
        const next = tiers[currentTierIndex + 1];
        nextTier = {
          name: next.name,
          minPoints: next.minPoints,
          pointsNeeded: Math.max(0, next.minPoints - customer.loyaltyPoints),
        };
      }
    }

    return {
      customerId: customer.id,
      currentPoints: customer.loyaltyPoints,
      currentTier: customer.loyaltyTier,
      totalSpent: customer.totalSpent,
      visitCount: customer.visitCount,
      programActive,
      nextTier,
    };
  }
}

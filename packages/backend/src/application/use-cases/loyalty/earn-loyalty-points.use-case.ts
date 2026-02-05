import { Inject, Injectable } from '@nestjs/common';
import type { ILoyaltyRepository } from '../../../domain/interfaces/repositories/loyalty.repository';
import type { ICustomerRepository } from '../../../domain/interfaces/repositories/customer.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';
import { AppError } from '../../../shared/errors/app-error';
import { ErrorCode } from '../../../shared/constants/error-codes';

export interface EarnLoyaltyPointsParams {
  customerId: string;
  transactionId: string;
  transactionTotal: number;
  employeeId?: string;
}

export interface EarnLoyaltyPointsResult {
  pointsEarned: number;
  totalPoints: number;
  tierChanged: boolean;
  newTier?: string;
}

@Injectable()
export class EarnLoyaltyPointsUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.LOYALTY)
    private readonly loyaltyRepo: ILoyaltyRepository,
    @Inject(REPOSITORY_TOKENS.CUSTOMER)
    private readonly customerRepo: ICustomerRepository,
  ) {}

  async execute(params: EarnLoyaltyPointsParams): Promise<EarnLoyaltyPointsResult> {
    const customer = await this.customerRepo.findById(params.customerId);
    if (!customer) {
      throw new AppError(ErrorCode.CUSTOMER_NOT_FOUND, 'Customer not found');
    }

    const program = await this.loyaltyRepo.findActiveProgram(customer.businessId);
    if (!program) {
      return {
        pointsEarned: 0,
        totalPoints: customer.loyaltyPoints,
        tierChanged: false,
      };
    }

    const tiers = await this.loyaltyRepo.findTiersByBusiness(customer.businessId);
    const currentTier = tiers.find((t) => t.name === customer.loyaltyTier);
    const multiplier = currentTier ? currentTier.pointMultiplier : 1;

    const pointsEarned = Math.floor(
      (params.transactionTotal / program.amountPerPoint) * multiplier,
    );
    if (pointsEarned <= 0) {
      return {
        pointsEarned: 0,
        totalPoints: customer.loyaltyPoints,
        tierChanged: false,
      };
    }

    const totalPoints = customer.loyaltyPoints + pointsEarned;
    const newSpent = customer.totalSpent + params.transactionTotal;

    // Create transaction record
    const expiresAt = program.pointExpiryDays
      ? new Date(Date.now() + program.pointExpiryDays * 24 * 60 * 60 * 1000)
      : undefined;

    await this.loyaltyRepo.createTransaction({
      customerId: params.customerId,
      transactionId: params.transactionId,
      type: 'earned',
      points: pointsEarned,
      balanceAfter: totalPoints,
      description: `Earned ${pointsEarned} points from transaction`,
      expiresAt,
      createdBy: params.employeeId,
    });

    // Check for tier upgrade
    const eligibleTier = await this.loyaltyRepo.findEligibleTier(
      customer.businessId,
      totalPoints,
      newSpent,
    );

    const newTierName = eligibleTier ? eligibleTier.name : customer.loyaltyTier;
    await this.loyaltyRepo.updateCustomerPoints(params.customerId, totalPoints, newTierName);
    await this.customerRepo.update(params.customerId, {
      totalSpent: newSpent,
      visitCount: customer.visitCount + 1,
    });

    return {
      pointsEarned,
      totalPoints,
      tierChanged: newTierName !== customer.loyaltyTier,
      newTier: newTierName !== customer.loyaltyTier ? newTierName : undefined,
    };
  }
}

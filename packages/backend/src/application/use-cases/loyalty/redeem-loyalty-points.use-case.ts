import { Inject, Injectable } from '@nestjs/common';
import type { ILoyaltyRepository } from '../../../domain/interfaces/repositories/loyalty.repository';
import type { ICustomerRepository } from '../../../domain/interfaces/repositories/customer.repository';
import { REPOSITORY_TOKENS } from '../../../infrastructure/repositories/repository.tokens';
import { AppError } from '../../../shared/errors/app-error';
import { ErrorCode } from '../../../shared/constants/error-codes';

export interface RedeemLoyaltyPointsParams {
  customerId: string;
  transactionId: string;
  pointsToRedeem: number;
  employeeId?: string;
}

export interface RedeemLoyaltyPointsResult {
  discountAmount: number;
  pointsRedeemed: number;
  remainingPoints: number;
}

@Injectable()
export class RedeemLoyaltyPointsUseCase {
  constructor(
    @Inject(REPOSITORY_TOKENS.LOYALTY)
    private readonly loyaltyRepo: ILoyaltyRepository,
    @Inject(REPOSITORY_TOKENS.CUSTOMER)
    private readonly customerRepo: ICustomerRepository,
  ) {}

  async execute(params: RedeemLoyaltyPointsParams): Promise<RedeemLoyaltyPointsResult> {
    const customer = await this.customerRepo.findById(params.customerId);
    if (!customer) {
      throw new AppError(ErrorCode.CUSTOMER_NOT_FOUND, 'Customer not found');
    }

    if (customer.loyaltyPoints < params.pointsToRedeem) {
      throw new AppError(
        ErrorCode.INSUFFICIENT_POINTS,
        `Insufficient points. Current balance: ${customer.loyaltyPoints}`,
      );
    }

    const program = await this.loyaltyRepo.findActiveProgram(customer.businessId);
    if (!program) {
      throw new AppError(ErrorCode.LOYALTY_NOT_ENABLED, 'Loyalty program not enabled');
    }

    if (program.redemptionRate && params.pointsToRedeem < program.redemptionRate) {
      throw new AppError(
        ErrorCode.INSUFFICIENT_POINTS,
        `Minimum ${program.redemptionRate} points required for redemption`,
      );
    }

    const valuePerPoint = program.amountPerPoint ?? 0;
    const discountAmount = Math.floor(params.pointsToRedeem * valuePerPoint);
    const remainingPoints = customer.loyaltyPoints - params.pointsToRedeem;

    // Create transaction record
    await this.loyaltyRepo.createTransaction({
      customerId: params.customerId,
      transactionId: params.transactionId,
      type: 'redeemed',
      points: params.pointsToRedeem,
      balanceAfter: remainingPoints,
      description: `Redeemed ${params.pointsToRedeem} points for discount`,
      createdBy: params.employeeId,
    });

    await this.loyaltyRepo.updateCustomerPoints(
      params.customerId,
      remainingPoints,
      customer.loyaltyTier,
    );

    return {
      discountAmount,
      pointsRedeemed: params.pointsToRedeem,
      remainingPoints,
    };
  }
}

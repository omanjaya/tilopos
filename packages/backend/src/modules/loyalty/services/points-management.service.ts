/**
 * Points Management Service
 *
 * Handles points earning, redemption, and adjustments.
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { LoyaltyRepository } from '../repositories/loyalty.repository';
import { PointsRules } from '../business-rules/points.rules';
import { TierRules } from '../business-rules/tier.rules';
import { EarnPointsResult, RedeemPointsResult, PointsCalculation } from '../types/interfaces';

@Injectable()
export class PointsManagementService {
  private readonly logger = new Logger(PointsManagementService.name);

  constructor(private readonly repository: LoyaltyRepository) {}

  /**
   * Earn points from a transaction
   */
  async earnPoints(
    customerId: string,
    transactionId: string,
    transactionAmount: number,
    businessId: string,
  ): Promise<EarnPointsResult> {
    // Validate program exists
    const program = await this.repository.getProgram(businessId);
    if (!program) {
      throw new BadRequestException('Loyalty program not configured');
    }

    // Get customer
    const customer = await this.repository.getCustomer(customerId);
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    // Get customer's current tier
    const currentTier = await this.repository.getCustomerTier(businessId, customer.loyaltyPoints);

    // Calculate points to earn
    const calculation = PointsRules.calculateEarnedPoints(transactionAmount, program, currentTier);

    // If no points earned, return early
    if (calculation.totalPoints <= 0) {
      return {
        pointsEarned: 0,
        multiplier: calculation.multiplier,
        newBalance: customer.loyaltyPoints,
        tierName: currentTier?.name || 'Regular',
      };
    }

    // Atomically increment points and create transaction to prevent race conditions
    const updatedCustomer = await this.repository.incrementCustomerPoints(
      customerId,
      calculation.totalPoints,
    );
    const newBalance = updatedCustomer.loyaltyPoints;

    await this.repository.createTransaction({
      customerId,
      transactionId,
      type: 'earned',
      points: calculation.totalPoints,
      balanceAfter: newBalance,
      description: `Points earned from transaction`,
    });

    // Check for tier change
    const tiers = await this.repository.getTiers(businessId);
    const newTier = TierRules.findEligibleTier(newBalance, tiers);
    const tierName = newTier?.name || 'Regular';

    // Update tier if changed
    if (tierName !== (currentTier?.name || 'Regular')) {
      await this.repository.updateCustomerPoints(customerId, newBalance, tierName);
    }

    this.logger.log(
      `Customer ${customerId} earned ${calculation.totalPoints} points (${calculation.multiplier}x multiplier)`,
    );

    return {
      pointsEarned: calculation.totalPoints,
      multiplier: calculation.multiplier,
      newBalance,
      tierName,
    };
  }

  /**
   * Redeem points for discount
   */
  async redeemPoints(
    customerId: string,
    pointsToRedeem: number,
    businessId: string,
    transactionId?: string,
    employeeId?: string,
  ): Promise<RedeemPointsResult> {
    // Validate program exists
    const program = await this.repository.getProgram(businessId);
    if (!program) {
      throw new BadRequestException('Loyalty program not configured');
    }

    // Get customer
    const customer = await this.repository.getCustomer(customerId);
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    // Validate redemption
    const validation = PointsRules.validateRedemption(
      pointsToRedeem,
      customer.loyaltyPoints,
      program,
    );

    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // Calculate discount amount
    const discountAmount = PointsRules.calculateRedemptionValue(pointsToRedeem, program);

    // Atomically decrement points to prevent race conditions
    const updatedCustomer = await this.repository.incrementCustomerPoints(
      customerId,
      -pointsToRedeem,
    );
    const newBalance = updatedCustomer.loyaltyPoints;

    // Create redemption transaction
    await this.repository.createTransaction({
      customerId,
      transactionId,
      type: 'redeemed',
      points: -pointsToRedeem,
      balanceAfter: newBalance,
      description: `Redeemed for Rp ${discountAmount.toLocaleString()} discount`,
      employeeId,
    });

    // Check for tier change after point loss
    const tiers = await this.repository.getTiers(businessId);
    const newTier = TierRules.findEligibleTier(newBalance, tiers);
    const tierName = newTier?.name || 'Regular';

    // Update tier if changed
    const currentTierName =
      (await this.repository.getCustomerTier(businessId, customer.loyaltyPoints))?.name ||
      'Regular';
    if (tierName !== currentTierName) {
      await this.repository.updateCustomerPoints(customerId, newBalance, tierName);
    }

    this.logger.log(
      `Customer ${customerId} redeemed ${pointsToRedeem} points for Rp ${discountAmount}`,
    );

    return {
      pointsRedeemed: pointsToRedeem,
      discountAmount,
      newBalance,
    };
  }

  /**
   * Manual points adjustment (admin only)
   */
  async adjustPoints(
    customerId: string,
    points: number,
    reason: string,
    employeeId: string,
    businessId: string,
  ): Promise<{
    customerId: string;
    previousBalance: number;
    newBalance: number;
    tierName: string;
  }> {
    // Get customer
    const customer = await this.repository.getCustomer(customerId);
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    const previousBalance = customer.loyaltyPoints;

    // Atomically increment/decrement points to prevent race conditions
    const updatedCustomer = await this.repository.incrementCustomerPoints(customerId, points);
    const newBalance = updatedCustomer.loyaltyPoints;

    // Create adjustment transaction
    await this.repository.createTransaction({
      customerId,
      type: 'adjusted',
      points,
      balanceAfter: newBalance,
      description: reason,
      employeeId,
    });

    // Check for tier change
    const tiers = await this.repository.getTiers(businessId);
    const newTier = TierRules.findEligibleTier(newBalance, tiers);
    const tierName = newTier?.name || 'Regular';

    // Update tier if changed
    const currentTierName =
      (await this.repository.getCustomerTier(businessId, previousBalance))?.name || 'Regular';
    if (tierName !== currentTierName) {
      await this.repository.updateCustomerPoints(customerId, newBalance, tierName);
    }

    this.logger.log(
      `Customer ${customerId} points adjusted by ${points} (${reason}). Balance: ${previousBalance} -> ${newBalance}`,
    );

    return {
      customerId,
      previousBalance,
      newBalance,
      tierName,
    };
  }

  /**
   * Calculate potential points for a transaction (preview)
   */
  async calculatePotentialPoints(
    amount: number,
    businessId: string,
    customerId?: string,
  ): Promise<PointsCalculation> {
    const program = await this.repository.getProgram(businessId);
    if (!program) {
      return { basePoints: 0, multiplier: 1, totalPoints: 0 };
    }

    let customerTier = null;

    if (customerId) {
      const customer = await this.repository.getCustomer(customerId);
      if (customer) {
        customerTier = await this.repository.getCustomerTier(businessId, customer.loyaltyPoints);
      }
    }

    return PointsRules.calculatePotentialPoints(amount, program, customerTier);
  }

  /**
   * Calculate discount value for points
   */
  async calculateRedemptionValue(points: number, businessId: string): Promise<number> {
    const program = await this.repository.getProgram(businessId);
    if (!program) return 0;
    return PointsRules.calculateRedemptionValue(points, program);
  }
}

/**
 * Tier Management Service
 *
 * Handles tier operations, upgrades, and downgrades.
 */

import { Injectable, Logger } from '@nestjs/common';
import { LoyaltyRepository } from '../repositories/loyalty.repository';
import { TierRules } from '../business-rules/tier.rules';
import { LoyaltyConfig, TierConfig, CustomerLoyaltyInfo } from '../types/interfaces';
import { LoyaltyProgram, LoyaltyTier } from '@prisma/client';

export interface TierEvaluationSummary {
  evaluated: number;
  upgraded: number;
  downgraded: number;
  unchanged: number;
  changes: Array<{
    customerId: string;
    name: string;
    previousTier: string;
    newTier: string;
    change: string;
  }>;
}

@Injectable()
export class TierManagementService {
  private readonly logger = new Logger(TierManagementService.name);

  constructor(private readonly repository: LoyaltyRepository) {}

  // ========================================================================
  // PROGRAM MANAGEMENT
  // ========================================================================

  async getProgram(businessId: string): Promise<LoyaltyProgram | null> {
    return this.repository.getProgram(businessId);
  }

  async setupProgram(businessId: string, config: LoyaltyConfig): Promise<LoyaltyProgram> {
    const existing = await this.repository.getProgram(businessId);
    if (existing) {
      return this.repository.updateProgram(existing.id, config);
    }
    return this.repository.createProgram(businessId, config);
  }

  // ========================================================================
  // TIER CRUD OPERATIONS
  // ========================================================================

  async getTiers(businessId: string): Promise<LoyaltyTier[]> {
    return this.repository.getTiers(businessId);
  }

  async createTier(businessId: string, config: TierConfig): Promise<LoyaltyTier> {
    return this.repository.createTier(businessId, config);
  }

  async updateTier(id: string, config: Partial<TierConfig>): Promise<LoyaltyTier> {
    return this.repository.updateTier(id, config);
  }

  async deleteTier(id: string): Promise<void> {
    await this.repository.deleteTier(id);
  }

  // ========================================================================
  // TIER EVALUATION
  // ========================================================================

  /**
   * Check all customers' points vs tier thresholds and upgrade/downgrade
   */
  async checkAndUpgradeTiers(businessId: string): Promise<TierEvaluationSummary> {
    const result: TierEvaluationSummary = {
      evaluated: 0,
      upgraded: 0,
      downgraded: 0,
      unchanged: 0,
      changes: [],
    };

    const tiers = await this.repository.getTiers(businessId);
    if (tiers.length === 0) {
      return result;
    }

    const sortedTiers = TierRules.sortTiersByMinPoints(tiers);
    const customers = (await this.repository.getCustomersByBusiness(businessId)) as Array<{
      id: string;
      name: string;
      loyaltyPoints: number;
      loyaltyTier: string;
    }>;

    for (const customer of customers) {
      result.evaluated++;

      // Evaluate tier change
      const evaluation = TierRules.evaluateTierChange(
        customer.loyaltyPoints,
        customer.loyaltyTier,
        sortedTiers,
      );

      if (!evaluation.isChange) {
        result.unchanged++;
        continue;
      }

      // Count upgrade/downgrade
      if (evaluation.isUpgrade) {
        result.upgraded++;
      } else if (evaluation.isDowngrade) {
        result.downgraded++;
      }

      // Update customer tier
      await this.repository.updateCustomerPoints(
        customer.id,
        customer.loyaltyPoints,
        evaluation.tierName,
      );

      // Log tier change transaction
      await this.repository.createTransaction({
        customerId: customer.id,
        type: 'adjusted',
        points: 0,
        description: `Tier ${evaluation.isUpgrade ? 'upgraded' : 'downgraded'}: ${customer.loyaltyTier} -> ${evaluation.tierName}`,
      });

      result.changes.push({
        customerId: customer.id,
        name: customer.name,
        previousTier: customer.loyaltyTier,
        newTier: evaluation.tierName,
        change: evaluation.isUpgrade ? 'upgraded' : 'downgraded',
      });
    }

    this.logger.log(
      `Tier check for business ${businessId}: ${result.upgraded} upgraded, ${result.downgraded} downgraded, ${result.unchanged} unchanged`,
    );

    return result;
  }

  // ========================================================================
  // CUSTOMER LOYALTY INFO
  // ========================================================================

  async getCustomerLoyaltyInfo(
    customerId: string,
    businessId: string,
  ): Promise<CustomerLoyaltyInfo> {
    const customer = await this.repository.getCustomer(customerId);
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    const tiers = await this.repository.getTiers(businessId);
    const currentTier = TierRules.findEligibleTier(customer.loyaltyPoints, tiers);
    const nextTier = TierRules.findNextTier(customer.loyaltyPoints, tiers);
    const pointsToNextTier = TierRules.calculatePointsToNextTier(customer.loyaltyPoints, nextTier);
    const recentTransactions = await this.repository.getTransactions(customerId, 10);

    return {
      customer,
      currentTier,
      nextTier,
      pointsToNextTier,
      recentTransactions,
    };
  }
}

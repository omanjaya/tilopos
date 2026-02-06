/**
 * Loyalty Service (Facade)
 *
 * Main service that delegates to specialized services.
 * This maintains backward compatibility while organizing code better.
 */

import { Injectable } from '@nestjs/common';
import { PointsManagementService } from './services/points-management.service';
import { TierManagementService } from './services/tier-management.service';
import { ExpiryService } from './services/expiry.service';
import { AnalyticsService } from './services/analytics.service';
import {
  LoyaltyConfig,
  TierConfig,
  EarnPointsResult,
  RedeemPointsResult,
  CustomerLoyaltyInfo,
  PointsCalculation,
} from './types/interfaces';
import { LoyaltyProgram, LoyaltyTier } from '@prisma/client';

@Injectable()
export class LoyaltyService {
  constructor(
    private readonly pointsService: PointsManagementService,
    private readonly tierService: TierManagementService,
    private readonly expiryService: ExpiryService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  // ========================================================================
  // PROGRAM MANAGEMENT (delegated to TierManagementService)
  // ========================================================================

  async getProgram(businessId: string): Promise<LoyaltyProgram | null> {
    return this.tierService.getProgram(businessId);
  }

  async setupProgram(businessId: string, config: LoyaltyConfig): Promise<LoyaltyProgram> {
    return this.tierService.setupProgram(businessId, config);
  }

  // ========================================================================
  // TIER OPERATIONS (delegated to TierManagementService)
  // ========================================================================

  async getTiers(businessId: string): Promise<LoyaltyTier[]> {
    return this.tierService.getTiers(businessId);
  }

  async createTier(businessId: string, config: TierConfig): Promise<LoyaltyTier> {
    return this.tierService.createTier(businessId, config);
  }

  async updateTier(id: string, config: Partial<TierConfig>): Promise<LoyaltyTier> {
    return this.tierService.updateTier(id, config);
  }

  async deleteTier(id: string): Promise<void> {
    await this.tierService.deleteTier(id);
  }

  async checkAndUpgradeTiers(businessId: string) {
    return this.tierService.checkAndUpgradeTiers(businessId);
  }

  // ========================================================================
  // POINTS OPERATIONS (delegated to PointsManagementService)
  // ========================================================================

  async earnPoints(
    customerId: string,
    transactionId: string,
    transactionAmount: number,
    businessId: string,
  ): Promise<EarnPointsResult> {
    return this.pointsService.earnPoints(customerId, transactionId, transactionAmount, businessId);
  }

  async redeemPoints(
    customerId: string,
    pointsToRedeem: number,
    businessId: string,
    transactionId?: string,
    employeeId?: string,
  ): Promise<RedeemPointsResult> {
    return this.pointsService.redeemPoints(
      customerId,
      pointsToRedeem,
      businessId,
      transactionId,
      employeeId,
    );
  }

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
    return this.pointsService.adjustPoints(customerId, points, reason, employeeId, businessId);
  }

  async calculatePotentialPoints(
    amount: number,
    businessId: string,
    customerId?: string,
  ): Promise<PointsCalculation> {
    return this.pointsService.calculatePotentialPoints(amount, businessId, customerId);
  }

  async calculateRedemptionValue(points: number, businessId: string): Promise<number> {
    return this.pointsService.calculateRedemptionValue(points, businessId);
  }

  // ========================================================================
  // CUSTOMER INFO (delegated to TierManagementService)
  // ========================================================================

  async getCustomerLoyaltyInfo(
    customerId: string,
    businessId: string,
  ): Promise<CustomerLoyaltyInfo> {
    return this.tierService.getCustomerLoyaltyInfo(customerId, businessId);
  }

  // ========================================================================
  // EXPIRY PROCESSING (delegated to ExpiryService)
  // ========================================================================

  async processExpiredPoints(businessId: string) {
    return this.expiryService.processExpiredPoints(businessId);
  }

  // ========================================================================
  // ANALYTICS (delegated to AnalyticsService)
  // ========================================================================

  async getLoyaltyAnalytics(businessId: string) {
    return this.analyticsService.getLoyaltyAnalytics(businessId);
  }
}

// Export legacy types and repository for backward compatibility
export { LoyaltyRepository } from './repositories/loyalty.repository';
export type {
  LoyaltyConfig,
  TierConfig,
  EarnPointsResult,
  RedeemPointsResult,
  CustomerLoyaltyInfo,
  ILoyaltyRepository,
} from './types/interfaces';

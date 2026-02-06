/**
 * Tier Evaluation Business Rules
 *
 * Contains all business logic for tier evaluation, upgrades, and downgrades.
 */

import { LoyaltyTier } from '@prisma/client';

export interface TierEvaluationResult {
  newTier: LoyaltyTier | null;
  tierName: string;
  isUpgrade: boolean;
  isDowngrade: boolean;
  isChange: boolean;
}

export class TierRules {
  /**
   * Find the highest tier a customer qualifies for based on their points
   */
  static findEligibleTier(customerPoints: number, tiers: LoyaltyTier[]): LoyaltyTier | null {
    // Filter tiers customer qualifies for (points >= minPoints)
    const eligibleTiers = tiers.filter((tier) => customerPoints >= tier.minPoints);

    if (eligibleTiers.length === 0) {
      return null;
    }

    // Return highest tier (max minPoints)
    return eligibleTiers.reduce((highest, current) =>
      current.minPoints > highest.minPoints ? current : highest,
    );
  }

  /**
   * Find the next tier above customer's current points
   */
  static findNextTier(customerPoints: number, tiers: LoyaltyTier[]): LoyaltyTier | null {
    // Filter tiers above customer's current points
    const higherTiers = tiers.filter((tier) => tier.minPoints > customerPoints);

    if (higherTiers.length === 0) {
      return null;
    }

    // Return lowest of the higher tiers (min minPoints among higher tiers)
    return higherTiers.reduce((lowest, current) =>
      current.minPoints < lowest.minPoints ? current : lowest,
    );
  }

  /**
   * Calculate points needed to reach next tier
   */
  static calculatePointsToNextTier(customerPoints: number, nextTier: LoyaltyTier | null): number {
    if (!nextTier) {
      return 0; // Already at highest tier
    }
    return Math.max(0, nextTier.minPoints - customerPoints);
  }

  /**
   * Evaluate tier change (upgrade/downgrade/unchanged)
   */
  static evaluateTierChange(
    customerPoints: number,
    currentTierName: string,
    tiers: LoyaltyTier[],
  ): TierEvaluationResult {
    const newTier = this.findEligibleTier(customerPoints, tiers);
    const newTierName = newTier?.name || 'Regular';

    // No change
    if (newTierName === currentTierName) {
      return {
        newTier,
        tierName: newTierName,
        isUpgrade: false,
        isDowngrade: false,
        isChange: false,
      };
    }

    // Determine if upgrade or downgrade by comparing minPoints
    const currentTier = tiers.find((t) => t.name === currentTierName);
    const currentMinPoints = currentTier?.minPoints || 0;
    const newMinPoints = newTier?.minPoints || 0;

    const isUpgrade = newMinPoints > currentMinPoints;
    const isDowngrade = newMinPoints < currentMinPoints;

    return {
      newTier,
      tierName: newTierName,
      isUpgrade,
      isDowngrade,
      isChange: true,
    };
  }

  /**
   * Get tier benefit multiplier
   */
  static getTierMultiplier(tier: LoyaltyTier | null): number {
    return Number(tier?.pointMultiplier || 1);
  }

  /**
   * Check if customer qualifies for a specific tier
   */
  static qualifiesForTier(customerPoints: number, tier: LoyaltyTier): boolean {
    return customerPoints >= tier.minPoints;
  }

  /**
   * Sort tiers by minimum points (ascending)
   */
  static sortTiersByMinPoints(tiers: LoyaltyTier[]): LoyaltyTier[] {
    return [...tiers].sort((a, b) => a.minPoints - b.minPoints);
  }

  /**
   * Get tier index in sorted list (for comparison)
   */
  static getTierIndex(tierName: string, sortedTiers: LoyaltyTier[]): number {
    return sortedTiers.findIndex((t) => t.name === tierName);
  }
}

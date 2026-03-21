/**
 * Points Calculation Business Rules
 *
 * Contains all business logic for calculating points earning and redemption.
 */

import { LoyaltyProgram, LoyaltyTier } from '@prisma/client';
import { PointsCalculation } from '../types/interfaces';

export class PointsRules {
  /**
   * Calculate points to be earned from a transaction amount
   */
  static calculateEarnedPoints(
    transactionAmount: number,
    program: LoyaltyProgram,
    customerTier: LoyaltyTier | null,
  ): PointsCalculation {
    // Calculate base points: amount / pointsPerAmount
    const pointsPerAmount = Number(program.pointsPerAmount) || 0;
    if (pointsPerAmount <= 0) {
      return { basePoints: 0, multiplier: 1, totalPoints: 0 };
    }
    const basePoints = Math.floor(transactionAmount / pointsPerAmount);

    // Apply tier multiplier
    const multiplier = Number(customerTier?.pointMultiplier || 1);
    const totalPoints = Math.floor(basePoints * multiplier);

    return {
      basePoints,
      multiplier,
      totalPoints,
    };
  }

  /**
   * Calculate discount amount from points to be redeemed
   */
  static calculateRedemptionValue(points: number, program: LoyaltyProgram): number {
    return points * Number(program.amountPerPoint);
  }

  /**
   * Calculate potential points for a given amount (preview)
   */
  static calculatePotentialPoints(
    amount: number,
    program: LoyaltyProgram,
    customerTier?: LoyaltyTier | null,
  ): PointsCalculation {
    const pointsPerAmount = Number(program.pointsPerAmount) || 0;
    if (pointsPerAmount <= 0) {
      return { basePoints: 0, multiplier: 1, totalPoints: 0 };
    }
    const basePoints = Math.floor(amount / pointsPerAmount);
    const multiplier = customerTier ? Number(customerTier.pointMultiplier) : 1;
    const totalPoints = Math.floor(basePoints * multiplier);

    return {
      basePoints,
      multiplier,
      totalPoints,
    };
  }

  /**
   * Validate redemption request
   */
  static validateRedemption(
    pointsToRedeem: number,
    customerPoints: number,
    program: LoyaltyProgram,
  ): { valid: boolean; error?: string } {
    // Check minimum redemption amount
    if (pointsToRedeem < Number(program.redemptionRate)) {
      return {
        valid: false,
        error: `Minimum ${program.redemptionRate} points required for redemption`,
      };
    }

    // Check customer has enough points
    if (pointsToRedeem > customerPoints) {
      return {
        valid: false,
        error: `Insufficient points. Available: ${customerPoints}`,
      };
    }

    return { valid: true };
  }

  /**
   * Calculate new balance after earning points
   */
  static calculateNewBalance(currentBalance: number, pointsToAdd: number): number {
    return currentBalance + pointsToAdd;
  }

  /**
   * Calculate new balance after redeeming points
   */
  static calculateBalanceAfterRedemption(currentBalance: number, pointsToRedeem: number): number {
    return Math.max(0, currentBalance - pointsToRedeem);
  }

  /**
   * Calculate new balance after adjustment (can be positive or negative)
   */
  static calculateBalanceAfterAdjustment(currentBalance: number, adjustment: number): number {
    return Math.max(0, currentBalance + adjustment);
  }
}

/**
 * Loyalty System Type Definitions
 *
 * All TypeScript interfaces and types used across the loyalty module.
 */

import {
  Customer,
  LoyaltyProgram,
  LoyaltyTier,
  LoyaltyTransaction,
  LoyaltyTransactionType,
} from '@prisma/client';

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface LoyaltyConfig {
  pointsPerAmount: number; // e.g., 1 point per 10000 IDR
  amountPerPoint: number; // e.g., 1 point = 100 IDR discount
  redemptionRate: number; // Minimum points required for redemption
  pointExpiryDays?: number; // Days until points expire (null = never)
}

export interface TierConfig {
  name: string;
  minPoints: number;
  pointMultiplier: number; // Points multiplier (1.0 = 100%)
  benefits: unknown; // JSON benefits
}

// ============================================================================
// OPERATION RESULTS
// ============================================================================

export interface EarnPointsResult {
  pointsEarned: number;
  multiplier: number;
  newBalance: number;
  tierName: string;
}

export interface RedeemPointsResult {
  pointsRedeemed: number;
  discountAmount: number;
  newBalance: number;
}

export interface PointsCalculation {
  basePoints: number;
  multiplier: number;
  totalPoints: number;
}

// ============================================================================
// CUSTOMER INFO
// ============================================================================

export interface CustomerLoyaltyInfo {
  customer: Customer;
  currentTier: LoyaltyTier | null;
  nextTier: LoyaltyTier | null;
  pointsToNextTier: number;
  recentTransactions: LoyaltyTransaction[];
}

// ============================================================================
// REPOSITORY INTERFACE
// ============================================================================

export interface ILoyaltyRepository {
  // Program operations
  getProgram(businessId: string): Promise<LoyaltyProgram | null>;
  createProgram(businessId: string, config: LoyaltyConfig): Promise<LoyaltyProgram>;
  updateProgram(id: string, config: Partial<LoyaltyConfig>): Promise<LoyaltyProgram>;

  // Tier operations
  getTiers(businessId: string): Promise<LoyaltyTier[]>;
  createTier(businessId: string, config: TierConfig): Promise<LoyaltyTier>;
  updateTier(id: string, config: Partial<TierConfig>): Promise<LoyaltyTier>;
  deleteTier(id: string): Promise<void>;
  getCustomerTier(businessId: string, totalPoints: number): Promise<LoyaltyTier | null>;
  getNextTier(businessId: string, currentPoints: number): Promise<LoyaltyTier | null>;

  // Transaction operations
  createTransaction(data: {
    customerId: string;
    transactionId?: string;
    type: LoyaltyTransactionType;
    points: number;
    description?: string;
    employeeId?: string;
  }): Promise<LoyaltyTransaction>;
  getTransactions(customerId: string, limit?: number): Promise<LoyaltyTransaction[]>;

  // Customer operations
  updateCustomerPoints(customerId: string, points: number, tier?: string): Promise<Customer>;
}

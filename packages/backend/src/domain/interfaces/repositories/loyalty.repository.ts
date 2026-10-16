import type { Customer } from '@prisma/client';

export type LoyaltyProgramRecord = {
  id: string;
  businessId: string;
  name: string;
  pointsPerAmount: number;
  amountPerPoint: number;
  redemptionRate: number;
  pointExpiryDays: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type LoyaltyTierRecord = {
  id: string;
  businessId: string;
  name: string;
  minPoints: number;
  minSpent: number;
  pointMultiplier: number;
  benefits: Record<string, unknown>;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
};

export type LoyaltyTransactionRecord = {
  id: string;
  customerId: string;
  transactionId: string | null;
  type: 'earned' | 'redeemed' | 'adjusted' | 'expired' | 'reversed';
  points: number;
  balanceAfter: number;
  description: string | null;
  expiresAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
};

export interface ILoyaltyRepository {
  // Program
  findActiveProgram(businessId: string): Promise<LoyaltyProgramRecord | null>;
  findProgramById(id: string, businessId?: string): Promise<LoyaltyProgramRecord | null>;

  // Tier
  findTiersByBusiness(businessId: string): Promise<LoyaltyTierRecord[]>;
  findTierById(id: string, businessId?: string): Promise<LoyaltyTierRecord | null>;
  findEligibleTier(
    businessId: string,
    points: number,
    totalSpent: number,
  ): Promise<LoyaltyTierRecord | null>;

  // Transaction
  createTransaction(data: CreateLoyaltyTransactionData): Promise<LoyaltyTransactionRecord>;
  findTransactionsByCustomer(
    customerId: string,
    limit?: number,
    businessId?: string,
  ): Promise<LoyaltyTransactionRecord[]>;

  // Customer
  updateCustomerPoints(
    customerId: string,
    points: number,
    tier?: string,
    businessId?: string,
  ): Promise<void>;
  findCustomerById(customerId: string, businessId?: string): Promise<Customer | null>;
}

export interface CreateLoyaltyTransactionData {
  customerId: string;
  transactionId?: string;
  type: 'earned' | 'redeemed' | 'adjusted' | 'expired' | 'reversed';
  points: number;
  balanceAfter: number;
  description?: string;
  expiresAt?: Date;
  createdBy?: string;
}

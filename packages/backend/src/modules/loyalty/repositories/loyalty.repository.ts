/**
 * Loyalty Repository
 *
 * Database operations for loyalty program, tiers, and transactions.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  Customer,
  LoyaltyProgram,
  LoyaltyTier,
  LoyaltyTransaction,
  LoyaltyTransactionType,
  Prisma,
} from '@prisma/client';
import { LoyaltyConfig, TierConfig, ILoyaltyRepository } from '../types/interfaces';

@Injectable()
export class LoyaltyRepository implements ILoyaltyRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ========================================================================
  // PROGRAM OPERATIONS
  // ========================================================================

  async getProgram(businessId: string): Promise<LoyaltyProgram | null> {
    return this.prisma.loyaltyProgram.findFirst({
      where: { businessId, isActive: true },
    });
  }

  async createProgram(businessId: string, config: LoyaltyConfig): Promise<LoyaltyProgram> {
    return this.prisma.loyaltyProgram.create({
      data: {
        businessId,
        name: 'Loyalty Program',
        pointsPerAmount: config.pointsPerAmount,
        amountPerPoint: config.amountPerPoint,
        redemptionRate: config.redemptionRate,
        pointExpiryDays: config.pointExpiryDays,
      },
    });
  }

  async updateProgram(id: string, config: Partial<LoyaltyConfig>): Promise<LoyaltyProgram> {
    return this.prisma.loyaltyProgram.update({
      where: { id },
      data: config,
    });
  }

  // ========================================================================
  // TIER OPERATIONS
  // ========================================================================

  async getTiers(businessId: string): Promise<LoyaltyTier[]> {
    return this.prisma.loyaltyTier.findMany({
      where: { businessId, isActive: true },
      orderBy: { minPoints: 'asc' },
    });
  }

  async createTier(businessId: string, config: TierConfig): Promise<LoyaltyTier> {
    return this.prisma.loyaltyTier.create({
      data: {
        businessId,
        name: config.name,
        minPoints: config.minPoints,
        pointMultiplier: config.pointMultiplier,
        benefits: config.benefits as Prisma.InputJsonValue,
      },
    });
  }

  async updateTier(id: string, config: Partial<TierConfig>): Promise<LoyaltyTier> {
    return this.prisma.loyaltyTier.update({
      where: { id },
      data: {
        name: config.name,
        minPoints: config.minPoints,
        pointMultiplier: config.pointMultiplier,
        benefits: config.benefits as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async deleteTier(id: string): Promise<void> {
    await this.prisma.loyaltyTier.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getCustomerTier(businessId: string, totalPoints: number): Promise<LoyaltyTier | null> {
    return this.prisma.loyaltyTier.findFirst({
      where: {
        businessId,
        isActive: true,
        minPoints: { lte: totalPoints },
      },
      orderBy: { minPoints: 'desc' },
    });
  }

  async getNextTier(businessId: string, currentPoints: number): Promise<LoyaltyTier | null> {
    return this.prisma.loyaltyTier.findFirst({
      where: {
        businessId,
        isActive: true,
        minPoints: { gt: currentPoints },
      },
      orderBy: { minPoints: 'asc' },
    });
  }

  // ========================================================================
  // TRANSACTION OPERATIONS
  // ========================================================================

  async createTransaction(data: {
    customerId: string;
    transactionId?: string;
    type: LoyaltyTransactionType;
    points: number;
    description?: string;
    employeeId?: string;
  }): Promise<LoyaltyTransaction> {
    return this.prisma.loyaltyTransaction.create({
      data: {
        customerId: data.customerId,
        transactionId: data.transactionId,
        type: data.type,
        points: data.points,
        description: data.description,
        createdBy: data.employeeId,
        balanceAfter: 0, // Will be updated by service
      },
    });
  }

  async getTransactions(customerId: string, limit = 20): Promise<LoyaltyTransaction[]> {
    return this.prisma.loyaltyTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ========================================================================
  // CUSTOMER OPERATIONS
  // ========================================================================

  async updateCustomerPoints(customerId: string, points: number, tier?: string): Promise<Customer> {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        loyaltyPoints: points,
        ...(tier && { loyaltyTier: tier }),
      },
    });
  }

  async getCustomer(customerId: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({
      where: { id: customerId },
    });
  }

  async getCustomersByBusiness(
    businessId: string,
  ): Promise<Array<{ id: string; name: string; loyaltyPoints: number; loyaltyTier: string }>> {
    return this.prisma.customer.findMany({
      where: { businessId, isActive: true },
      select: {
        id: true,
        name: true,
        loyaltyPoints: true,
        loyaltyTier: true,
      },
    });
  }
}

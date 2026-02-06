/**
 * Loyalty Analytics Service
 *
 * Handles loyalty program analytics and reporting.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface LoyaltyAnalytics {
  totalMembers: number;
  pointsOutstanding: number;
  tierDistribution: Array<{ tier: string; count: number; percentage: number }>;
  redemptionRate: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  totalPointsExpired: number;
  averagePointsPerMember: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get loyalty program analytics
   */
  async getLoyaltyAnalytics(businessId: string): Promise<LoyaltyAnalytics> {
    // Total members
    const totalMembers = await this.prisma.customer.count({
      where: { businessId, isActive: true },
    });

    // Points outstanding (sum of all customer points)
    const pointsAgg = await this.prisma.customer.aggregate({
      where: { businessId, isActive: true },
      _sum: { loyaltyPoints: true },
    });
    const pointsOutstanding = pointsAgg._sum.loyaltyPoints ?? 0;

    // Tier distribution
    const tierGroups = await this.prisma.customer.groupBy({
      by: ['loyaltyTier'],
      where: { businessId, isActive: true },
      _count: { id: true },
    });

    const tierDistribution = tierGroups.map((g) => ({
      tier: g.loyaltyTier,
      count: g._count.id,
      percentage: totalMembers > 0 ? Math.round((g._count.id / totalMembers) * 10000) / 100 : 0,
    }));

    // Transaction aggregations
    const txAggregation = await this.prisma.loyaltyTransaction.groupBy({
      by: ['type'],
      where: { customer: { businessId } },
      _sum: { points: true },
    });

    let totalPointsEarned = 0;
    let totalPointsRedeemed = 0;
    let totalPointsExpired = 0;

    for (const agg of txAggregation) {
      const absPoints = Math.abs(agg._sum.points ?? 0);
      switch (agg.type) {
        case 'earned':
          totalPointsEarned = absPoints;
          break;
        case 'redeemed':
          totalPointsRedeemed = absPoints;
          break;
        case 'expired':
          totalPointsExpired = absPoints;
          break;
      }
    }

    // Calculate metrics
    const redemptionRate =
      totalPointsEarned > 0
        ? Math.round((totalPointsRedeemed / totalPointsEarned) * 10000) / 100
        : 0;

    const averagePointsPerMember =
      totalMembers > 0 ? Math.round(pointsOutstanding / totalMembers) : 0;

    return {
      totalMembers,
      pointsOutstanding,
      tierDistribution,
      redemptionRate,
      totalPointsEarned,
      totalPointsRedeemed,
      totalPointsExpired,
      averagePointsPerMember,
    };
  }

  /**
   * Get top customers by points balance
   */
  async getTopCustomers(
    businessId: string,
    limit = 10,
  ): Promise<Array<{ customerId: string; name: string; points: number; tier: string }>> {
    const customers = await this.prisma.customer.findMany({
      where: { businessId, isActive: true },
      orderBy: { loyaltyPoints: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        loyaltyPoints: true,
        loyaltyTier: true,
      },
    });

    return customers.map((c) => ({
      customerId: c.id,
      name: c.name,
      points: c.loyaltyPoints,
      tier: c.loyaltyTier,
    }));
  }

  /**
   * Get customers by tier
   */
  async getCustomersByTier(
    businessId: string,
    tierName: string,
  ): Promise<Array<{ customerId: string; name: string; points: number }>> {
    const customers = await this.prisma.customer.findMany({
      where: {
        businessId,
        isActive: true,
        loyaltyTier: tierName,
      },
      orderBy: { loyaltyPoints: 'desc' },
      select: {
        id: true,
        name: true,
        loyaltyPoints: true,
      },
    });

    return customers.map((c) => ({
      customerId: c.id,
      name: c.name,
      points: c.loyaltyPoints,
    }));
  }

  /**
   * Get transaction history summary
   */
  async getTransactionSummary(
    businessId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalTransactions: number;
    earned: number;
    redeemed: number;
    expired: number;
    adjusted: number;
  }> {
    const dateFilter = startDate && endDate ? { gte: startDate, lte: endDate } : undefined;

    const transactions = await this.prisma.loyaltyTransaction.groupBy({
      by: ['type'],
      where: {
        customer: { businessId },
        ...(dateFilter && { createdAt: dateFilter }),
      },
      _count: { id: true },
    });

    let earned = 0;
    let redeemed = 0;
    let expired = 0;
    let adjusted = 0;

    for (const tx of transactions) {
      switch (tx.type) {
        case 'earned':
          earned = tx._count.id;
          break;
        case 'redeemed':
          redeemed = tx._count.id;
          break;
        case 'expired':
          expired = tx._count.id;
          break;
        case 'adjusted':
          adjusted = tx._count.id;
          break;
      }
    }

    const totalTransactions = earned + redeemed + expired + adjusted;

    return {
      totalTransactions,
      earned,
      redeemed,
      expired,
      adjusted,
    };
  }
}

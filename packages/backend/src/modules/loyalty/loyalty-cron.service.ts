/**
 * Loyalty Cron Jobs
 *
 * - Tier auto-upgrade/downgrade (monthly)
 * - Points expiry handling (daily)
 * - Loyalty analytics
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { ILoyaltyRepository } from '../../domain/interfaces/repositories/loyalty.repository';

// ============================================================================
// INTERFACES
// ============================================================================

export interface TierEvaluationResult {
  evaluated: number;
  upgraded: number;
  downgraded: number;
  unchanged: number;
  details: TierChangeDetail[];
}

export interface TierChangeDetail {
  customerId: string;
  customerName: string;
  previousTier: string;
  newTier: string;
  currentPoints: number;
  totalSpent: number;
  change: 'upgraded' | 'downgraded' | 'unchanged';
}

export interface PointsExpiryResult {
  processed: number;
  expired: number;
  totalPointsExpired: number;
  details: PointsExpiryDetail[];
}

export interface PointsExpiryDetail {
  customerId: string;
  transactionId: string;
  pointsExpired: number;
  originalEarnedAt: Date;
  expiredAt: Date;
}

export interface LoyaltyAnalytics {
  programActive: boolean;
  totalMembers: number;
  membersByTier: { tier: string; count: number }[];
  pointsIssued: number;
  pointsRedeemed: number;
  pointsExpired: number;
  pointsAdjusted: number;
  netPointsOutstanding: number;
  redemptionRate: number;
  averagePointsPerMember: number;
  topRedeemers: { customerId: string; customerName: string; totalRedeemed: number }[];
  periodStart: Date;
  periodEnd: Date;
}

// ============================================================================
// CRON SERVICE
// ============================================================================

@Injectable()
export class LoyaltyCronService {
  private readonly logger = new Logger(LoyaltyCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REPOSITORY_TOKENS.LOYALTY)
    private readonly loyaltyRepo: ILoyaltyRepository,
  ) {}

  // ========================================================================
  // TIER AUTO-UPGRADE/DOWNGRADE (Daily at midnight)
  // ========================================================================

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleTierEvaluation(): Promise<void> {
    this.logger.log('Starting daily tier evaluation cron job');

    try {
      // Get all active businesses with loyalty programs
      const programs = await this.prisma.loyaltyProgram.findMany({
        where: { isActive: true },
        select: { businessId: true },
      });

      for (const program of programs) {
        const result = await this.evaluateTiersForBusiness(program.businessId);
        this.logger.log(
          `Tier evaluation for business ${program.businessId}: ` +
            `${result.upgraded} upgraded, ${result.downgraded} downgraded, ${result.unchanged} unchanged`,
        );
      }
    } catch (error) {
      this.logger.error(`Tier evaluation cron failed: ${(error as Error).message}`);
    }
  }

  /**
   * Evaluate and update tiers for all customers of a business.
   * Can be called manually via the API or automatically by the cron.
   */
  async evaluateTiersForBusiness(businessId: string): Promise<TierEvaluationResult> {
    const result: TierEvaluationResult = {
      evaluated: 0,
      upgraded: 0,
      downgraded: 0,
      unchanged: 0,
      details: [],
    };

    // Get all tiers sorted by sortOrder (ascending = lowest tier first)
    const tiers = await this.loyaltyRepo.findTiersByBusiness(businessId);

    if (tiers.length === 0) {
      this.logger.warn(`No tiers configured for business ${businessId}`);
      return result;
    }

    // Get all active customers for this business
    const customers = await this.prisma.customer.findMany({
      where: { businessId, isActive: true },
      select: {
        id: true,
        name: true,
        loyaltyPoints: true,
        loyaltyTier: true,
        totalSpent: true,
      },
    });

    for (const customer of customers) {
      result.evaluated++;

      const totalSpent = Number(customer.totalSpent);

      // Find the highest tier the customer qualifies for
      const eligibleTier = await this.loyaltyRepo.findEligibleTier(
        businessId,
        customer.loyaltyPoints,
        totalSpent,
      );

      const newTierName = eligibleTier ? eligibleTier.name : 'regular';
      const previousTier = customer.loyaltyTier;

      if (newTierName === previousTier) {
        result.unchanged++;
        result.details.push({
          customerId: customer.id,
          customerName: customer.name,
          previousTier,
          newTier: newTierName,
          currentPoints: customer.loyaltyPoints,
          totalSpent,
          change: 'unchanged',
        });
        continue;
      }

      // Determine if it's an upgrade or downgrade
      const previousTierIndex = tiers.findIndex((t) => t.name === previousTier);
      const newTierIndex = tiers.findIndex((t) => t.name === newTierName);

      const isUpgrade =
        newTierIndex > previousTierIndex || (previousTierIndex === -1 && newTierIndex >= 0);

      if (isUpgrade) {
        result.upgraded++;
      } else {
        result.downgraded++;
      }

      // Update customer tier
      await this.loyaltyRepo.updateCustomerPoints(customer.id, customer.loyaltyPoints, newTierName);

      // Create audit-style loyalty transaction for the tier change
      await this.loyaltyRepo.createTransaction({
        customerId: customer.id,
        type: 'adjusted',
        points: 0,
        balanceAfter: customer.loyaltyPoints,
        description: `Tier ${isUpgrade ? 'upgraded' : 'downgraded'} from ${previousTier} to ${newTierName}`,
      });

      result.details.push({
        customerId: customer.id,
        customerName: customer.name,
        previousTier,
        newTier: newTierName,
        currentPoints: customer.loyaltyPoints,
        totalSpent,
        change: isUpgrade ? 'upgraded' : 'downgraded',
      });
    }

    return result;
  }

  // ========================================================================
  // POINTS EXPIRY (Daily at 1 AM)
  // ========================================================================

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handlePointsExpiry(): Promise<void> {
    this.logger.log('Starting daily points expiry cron job');

    try {
      const programs = await this.prisma.loyaltyProgram.findMany({
        where: { isActive: true, pointExpiryDays: { not: null } },
        select: { businessId: true, pointExpiryDays: true },
      });

      for (const program of programs) {
        const result = await this.expirePointsForBusiness(program.businessId);
        this.logger.log(
          `Points expiry for business ${program.businessId}: ` +
            `${result.expired} transactions, ${result.totalPointsExpired} total points expired`,
        );
      }
    } catch (error) {
      this.logger.error(`Points expiry cron failed: ${(error as Error).message}`);
    }
  }

  /**
   * Expire points for earned transactions older than the program's expiry period.
   */
  async expirePointsForBusiness(businessId: string): Promise<PointsExpiryResult> {
    const result: PointsExpiryResult = {
      processed: 0,
      expired: 0,
      totalPointsExpired: 0,
      details: [],
    };

    const now = new Date();

    // Find earned loyalty transactions that have an expiresAt in the past
    // and have not yet been expired (positive points = still active earned points)
    const expiredTransactions = await this.prisma.loyaltyTransaction.findMany({
      where: {
        type: 'earned',
        points: { gt: 0 },
        expiresAt: { lte: now, not: null },
        customer: {
          businessId,
          isActive: true,
        },
      },
      include: {
        customer: { select: { id: true, loyaltyPoints: true } },
      },
    });

    result.processed = expiredTransactions.length;

    // Group by customer to batch-update
    const customerExpiries = new Map<
      string,
      { total: number; currentPoints: number; txDetails: PointsExpiryDetail[] }
    >();

    for (const tx of expiredTransactions) {
      const custId = tx.customerId;
      if (!customerExpiries.has(custId)) {
        customerExpiries.set(custId, {
          total: 0,
          currentPoints: tx.customer.loyaltyPoints,
          txDetails: [],
        });
      }

      const entry = customerExpiries.get(custId)!;
      entry.total += tx.points;
      entry.txDetails.push({
        customerId: custId,
        transactionId: tx.id,
        pointsExpired: tx.points,
        originalEarnedAt: tx.createdAt,
        expiredAt: now,
      });
    }

    // Process each customer
    for (const [customerId, data] of customerExpiries.entries()) {
      const newBalance = Math.max(0, data.currentPoints - data.total);

      // Create an expiry transaction
      await this.loyaltyRepo.createTransaction({
        customerId,
        type: 'expired',
        points: -data.total,
        balanceAfter: newBalance,
        description: `${data.total} points expired (${data.txDetails.length} transactions)`,
      });

      // Update customer balance
      await this.loyaltyRepo.updateCustomerPoints(
        customerId,
        newBalance,
        '', // tier will be re-evaluated by the monthly cron; pass empty to keep current
      );

      // Mark original earned transactions so they won't be processed again
      // by setting points to 0 (consumed/expired)
      const txIds = data.txDetails.map((d) => d.transactionId);
      await this.prisma.loyaltyTransaction.updateMany({
        where: { id: { in: txIds } },
        data: { points: 0, description: 'Points expired' },
      });

      result.expired += data.txDetails.length;
      result.totalPointsExpired += data.total;
      result.details.push(...data.txDetails);
    }

    return result;
  }

  // ========================================================================
  // LOYALTY ANALYTICS
  // ========================================================================

  /**
   * Get program analytics for a given date range.
   */
  async getLoyaltyAnalytics(
    businessId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<LoyaltyAnalytics> {
    const program = await this.loyaltyRepo.findActiveProgram(businessId);

    const periodStart = startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const periodEnd = endDate ?? new Date();

    const dateFilter = { gte: periodStart, lte: periodEnd };

    // Total members
    const totalMembers = await this.prisma.customer.count({
      where: { businessId, isActive: true, loyaltyPoints: { gt: 0 } },
    });

    // Members by tier
    const tierGroups = await this.prisma.customer.groupBy({
      by: ['loyaltyTier'],
      where: { businessId, isActive: true },
      _count: { id: true },
    });

    const membersByTier = tierGroups.map((g) => ({
      tier: g.loyaltyTier,
      count: g._count.id,
    }));

    // Points transactions aggregation
    const txAggregation = await this.prisma.loyaltyTransaction.groupBy({
      by: ['type'],
      where: {
        customer: { businessId },
        createdAt: dateFilter,
      },
      _sum: { points: true },
    });

    let pointsIssued = 0;
    let pointsRedeemed = 0;
    let pointsExpired = 0;
    let pointsAdjusted = 0;

    for (const agg of txAggregation) {
      const absPoints = Math.abs(agg._sum.points ?? 0);
      switch (agg.type) {
        case 'earned':
          pointsIssued = absPoints;
          break;
        case 'redeemed':
          pointsRedeemed = absPoints;
          break;
        case 'expired':
          pointsExpired = absPoints;
          break;
        case 'adjusted':
          pointsAdjusted = agg._sum.points ?? 0;
          break;
      }
    }

    const netPointsOutstanding = pointsIssued - pointsRedeemed - pointsExpired + pointsAdjusted;
    const redemptionRate =
      pointsIssued > 0 ? Math.round((pointsRedeemed / pointsIssued) * 10000) / 100 : 0;
    const averagePointsPerMember =
      totalMembers > 0 ? Math.round(netPointsOutstanding / totalMembers) : 0;

    // Top redeemers
    const topRedeemersRaw = await this.prisma.loyaltyTransaction.groupBy({
      by: ['customerId'],
      where: {
        customer: { businessId },
        type: 'redeemed',
        createdAt: dateFilter,
      },
      _sum: { points: true },
      orderBy: { _sum: { points: 'asc' } }, // negative values, so asc = most redeemed
      take: 10,
    });

    const topRedeemers: { customerId: string; customerName: string; totalRedeemed: number }[] = [];
    for (const row of topRedeemersRaw) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: row.customerId },
        select: { name: true },
      });

      topRedeemers.push({
        customerId: row.customerId,
        customerName: customer?.name ?? 'Unknown',
        totalRedeemed: Math.abs(row._sum.points ?? 0),
      });
    }

    return {
      programActive: !!program,
      totalMembers,
      membersByTier,
      pointsIssued,
      pointsRedeemed,
      pointsExpired,
      pointsAdjusted,
      netPointsOutstanding,
      redemptionRate,
      averagePointsPerMember,
      topRedeemers,
      periodStart,
      periodEnd,
    };
  }
}

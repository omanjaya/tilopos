/**
 * Loyalty background jobs
 *
 * - Tier auto-upgrade/downgrade (daily, 00:00 WIB)
 * - Points expiry (daily, 01:00 WIB)
 * - Loyalty analytics (on demand)
 *
 * Every @Cron runs in BUSINESS_TZ and inside DistributedLockService.runExclusive
 * so only one replica executes it (Docs/ENGINEERING-RULES.md R9).
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { DistributedLockService } from '../../shared/locks/distributed-lock.service';
import { BUSINESS_TZ, addBusinessDays } from '../../shared/utils/business-time';
import { toNumber } from '../../shared/utils/money';
import {
  DEFAULT_LOYALTY_TIER,
  pickEligibleTier,
} from '../../application/use-cases/loyalty/loyalty-tier.util';

// ============================================================================
// INTERFACES
// ============================================================================

export interface TierEvaluationResult {
  evaluated: number;
  upgraded: number;
  downgraded: number;
  unchanged: number;
  /** Only customers whose tier changed (bounded by MAX_DETAILS). */
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
  lots: number;
  pointsExpired: number;
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
  /** Points taken back because the earning sale was voided (negative or 0). */
  pointsReversed: number;
  netPointsOutstanding: number;
  redemptionRate: number;
  averagePointsPerMember: number;
  topRedeemers: { customerId: string; customerName: string; totalRedeemed: number }[];
  periodStart: Date;
  periodEnd: Date;
}

const BATCH_SIZE = 500;
const MAX_DETAILS = 200;
const LOCK_TTL_SECONDS = 30 * 60;

// ============================================================================
// CRON SERVICE
// ============================================================================

@Injectable()
export class LoyaltyCronService {
  private readonly logger = new Logger(LoyaltyCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lock: DistributedLockService,
  ) {}

  // ========================================================================
  // TIER AUTO-UPGRADE/DOWNGRADE (Daily at 00:00 WIB)
  // ========================================================================

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: BUSINESS_TZ })
  async handleTierEvaluation(): Promise<void> {
    await this.lock.runExclusive('loyalty:tier-evaluation', LOCK_TTL_SECONDS, async () => {
      this.logger.log('Starting daily tier evaluation');
      const programs = await this.prisma.loyaltyProgram.findMany({
        where: { isActive: true },
        select: { businessId: true },
        distinct: ['businessId'],
      });

      for (const program of programs) {
        try {
          const result = await this.evaluateTiersForBusiness(program.businessId);
          this.logger.log(
            `Tier evaluation for business ${program.businessId}: ` +
              `${result.upgraded} upgraded, ${result.downgraded} downgraded, ${result.unchanged} unchanged`,
          );
        } catch (error) {
          // One failing business must not stop the others; surfaced at error level for alerting.
          this.logger.error(
            `Tier evaluation failed for business ${program.businessId}: ${(error as Error).message}`,
            (error as Error).stack,
          );
        }
      }
    });
  }

  /**
   * Re-evaluates every active customer's tier. Tiers are loaded once and customers
   * are walked in id-ordered batches. Only `loyaltyTier` is written (conditionally
   * on the tier we read) so concurrent point changes are never overwritten.
   */
  async evaluateTiersForBusiness(businessId: string): Promise<TierEvaluationResult> {
    const result: TierEvaluationResult = {
      evaluated: 0,
      upgraded: 0,
      downgraded: 0,
      unchanged: 0,
      details: [],
    };

    const tiers = await this.prisma.loyaltyTier.findMany({
      where: { businessId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (tiers.length === 0) {
      this.logger.warn(`No tiers configured for business ${businessId}`);
      return result;
    }
    const rank = (name: string): number => {
      const tier = tiers.find((t) => t.name === name);
      return tier ? tier.sortOrder : Number.NEGATIVE_INFINITY;
    };

    let cursor: string | undefined;
    for (;;) {
      const customers = await this.prisma.customer.findMany({
        where: { businessId, isActive: true },
        select: { id: true, name: true, loyaltyPoints: true, loyaltyTier: true, totalSpent: true },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      if (customers.length === 0) break;
      cursor = customers[customers.length - 1].id;

      for (const customer of customers) {
        result.evaluated++;
        const eligible = pickEligibleTier(tiers, customer.loyaltyPoints, customer.totalSpent);
        const newTierName = eligible ? eligible.name : DEFAULT_LOYALTY_TIER;
        const previousTier = customer.loyaltyTier;

        if (newTierName === previousTier) {
          result.unchanged++;
          continue;
        }

        const isUpgrade = rank(newTierName) > rank(previousTier);
        const changed = await this.prisma.$transaction(async (tx) => {
          const { count } = await tx.customer.updateMany({
            where: { id: customer.id, businessId, loyaltyTier: previousTier },
            data: { loyaltyTier: newTierName },
          });
          if (count === 0) return false;
          await tx.loyaltyTransaction.create({
            data: {
              customerId: customer.id,
              type: 'adjusted',
              points: 0,
              balanceAfter: customer.loyaltyPoints,
              description: `Tier ${isUpgrade ? 'upgraded' : 'downgraded'} from ${previousTier} to ${newTierName}`,
            },
          });
          return true;
        });

        if (!changed) {
          result.unchanged++;
          continue;
        }
        if (isUpgrade) result.upgraded++;
        else result.downgraded++;

        if (result.details.length < MAX_DETAILS) {
          result.details.push({
            customerId: customer.id,
            customerName: customer.name,
            previousTier,
            newTier: newTierName,
            currentPoints: customer.loyaltyPoints,
            totalSpent: toNumber(customer.totalSpent),
            change: isUpgrade ? 'upgraded' : 'downgraded',
          });
        }
      }

      if (customers.length < BATCH_SIZE) break;
    }

    return result;
  }

  // ========================================================================
  // POINTS EXPIRY (Daily at 01:00 WIB)
  // ========================================================================

  @Cron(CronExpression.EVERY_DAY_AT_1AM, { timeZone: BUSINESS_TZ })
  async handlePointsExpiry(): Promise<void> {
    await this.lock.runExclusive('loyalty:points-expiry', LOCK_TTL_SECONDS, async () => {
      this.logger.log('Starting daily points expiry');
      const programs = await this.prisma.loyaltyProgram.findMany({
        where: { isActive: true, pointExpiryDays: { not: null } },
        select: { businessId: true },
        distinct: ['businessId'],
      });

      for (const program of programs) {
        try {
          const result = await this.expirePointsForBusiness(program.businessId);
          this.logger.log(
            `Points expiry for business ${program.businessId}: ` +
              `${result.expired} lots, ${result.totalPointsExpired} points expired`,
          );
        } catch (error) {
          this.logger.error(
            `Points expiry failed for business ${program.businessId}: ${(error as Error).message}`,
            (error as Error).stack,
          );
        }
      }
    });
  }

  /**
   * Expires earned lots whose expiresAt has passed.
   *
   * Points are consumed FIFO, so the part of an expiring lot that is still unspent is
   *   min(sum of expiring lots, credits up to the newest expiring lot − all debits so far)
   * capped by the current balance. Already redeemed/expired points are therefore never
   * deducted twice. Each customer is processed in one DB transaction under a row lock;
   * lots are claimed with a conditional update (expiresAt still set) so a lot can only
   * be processed once.
   */
  async expirePointsForBusiness(businessId: string): Promise<PointsExpiryResult> {
    const result: PointsExpiryResult = {
      processed: 0,
      expired: 0,
      totalPointsExpired: 0,
      details: [],
    };
    const now = new Date();

    for (;;) {
      const lots = await this.prisma.loyaltyTransaction.findMany({
        where: {
          type: 'earned',
          points: { gt: 0 },
          expiresAt: { lte: now, not: null },
          customer: { businessId },
        },
        select: { id: true, customerId: true, points: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: BATCH_SIZE,
      });
      if (lots.length === 0) break;
      result.processed += lots.length;

      const byCustomer = new Map<string, typeof lots>();
      for (const lot of lots) {
        const list = byCustomer.get(lot.customerId) ?? [];
        list.push(lot);
        byCustomer.set(lot.customerId, list);
      }

      for (const [customerId, customerLots] of byCustomer) {
        const expiredPoints = await this.expireCustomerLots(businessId, customerId, customerLots);
        result.expired += customerLots.length;
        result.totalPointsExpired += expiredPoints;
        if (result.details.length < MAX_DETAILS) {
          result.details.push({
            customerId,
            lots: customerLots.length,
            pointsExpired: expiredPoints,
            expiredAt: now,
          });
        }
      }

      if (lots.length < BATCH_SIZE) break;
    }

    return result;
  }

  private async expireCustomerLots(
    businessId: string,
    customerId: string,
    lots: { id: string; points: number; createdAt: Date }[],
  ): Promise<number> {
    const lotIds = lots.map((l) => l.id);
    const cutoff = lots.reduce(
      (max, l) => (l.createdAt > max ? l.createdAt : max),
      lots[0].createdAt,
    );
    const expiringTotal = lots.reduce((sum, l) => sum + l.points, 0);

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM customers WHERE id = ${customerId}::uuid FOR UPDATE`;

      // Claim the lots; if another runner already processed them, do nothing.
      const claimed = await tx.loyaltyTransaction.updateMany({
        where: { id: { in: lotIds }, customerId, expiresAt: { not: null } },
        data: { expiresAt: null },
      });
      if (claimed.count !== lotIds.length) {
        throw new Error(`Expiry lots for customer ${customerId} were processed concurrently`);
      }

      const [credits, debits, legacyRedeems, customer] = await Promise.all([
        tx.loyaltyTransaction.aggregate({
          where: {
            customerId,
            type: { in: ['earned', 'adjusted'] },
            points: { gt: 0 },
            createdAt: { lte: cutoff },
          },
          _sum: { points: true },
        }),
        tx.loyaltyTransaction.aggregate({
          where: { customerId, points: { lt: 0 } },
          _sum: { points: true },
        }),
        // Older redeem rows were stored with positive points; they are still debits.
        tx.loyaltyTransaction.aggregate({
          where: { customerId, type: 'redeemed', points: { gt: 0 } },
          _sum: { points: true },
        }),
        tx.customer.findFirstOrThrow({
          where: { id: customerId, businessId },
          select: { loyaltyPoints: true },
        }),
      ]);

      const unspentOld =
        (credits._sum.points ?? 0) + (debits._sum.points ?? 0) - (legacyRedeems._sum.points ?? 0);
      const toExpire = Math.max(0, Math.min(expiringTotal, unspentOld, customer.loyaltyPoints));
      if (toExpire === 0) return 0;

      const updated = await tx.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: { decrement: toExpire } },
        select: { loyaltyPoints: true },
      });

      await tx.loyaltyTransaction.create({
        data: {
          customerId,
          type: 'expired',
          points: -toExpire,
          balanceAfter: updated.loyaltyPoints,
          description: `${toExpire} points expired (${lots.length} lots)`,
        },
      });

      return toExpire;
    });
  }

  // ========================================================================
  // LOYALTY ANALYTICS
  // ========================================================================

  async getLoyaltyAnalytics(
    businessId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<LoyaltyAnalytics> {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { businessId, isActive: true },
      select: { id: true },
    });

    const periodEnd = endDate ?? new Date();
    const periodStart = startDate ?? addBusinessDays(periodEnd, -30);
    const dateFilter = { gte: periodStart, lte: periodEnd };

    const [totalMembers, tierGroups, txAggregation, topRedeemersRaw] = await Promise.all([
      this.prisma.customer.count({
        where: { businessId, isActive: true, loyaltyPoints: { gt: 0 } },
      }),
      this.prisma.customer.groupBy({
        by: ['loyaltyTier'],
        where: { businessId, isActive: true },
        _count: { id: true },
      }),
      this.prisma.loyaltyTransaction.groupBy({
        by: ['type'],
        where: { customer: { businessId }, createdAt: dateFilter },
        _sum: { points: true },
      }),
      this.prisma.loyaltyTransaction.groupBy({
        by: ['customerId'],
        where: { customer: { businessId }, type: 'redeemed', createdAt: dateFilter },
        _sum: { points: true },
        orderBy: { _sum: { points: 'asc' } }, // deductions are negative: asc = most redeemed
        take: 10,
      }),
    ]);

    const membersByTier = tierGroups.map((g) => ({ tier: g.loyaltyTier, count: g._count.id }));

    let pointsIssued = 0;
    let pointsRedeemed = 0;
    let pointsExpired = 0;
    let pointsAdjusted = 0;
    let pointsReversed = 0;
    for (const agg of txAggregation) {
      const sum = agg._sum.points ?? 0;
      switch (agg.type) {
        case 'earned':
          pointsIssued = Math.abs(sum);
          break;
        case 'redeemed':
          pointsRedeemed = Math.abs(sum);
          break;
        case 'expired':
          pointsExpired = Math.abs(sum);
          break;
        case 'adjusted':
          pointsAdjusted = sum;
          break;
        case 'reversed':
          pointsReversed = sum;
          break;
      }
    }

    const netPointsOutstanding =
      pointsIssued - pointsRedeemed - pointsExpired + pointsAdjusted + pointsReversed;
    const redemptionRate =
      pointsIssued > 0 ? Math.round((pointsRedeemed / pointsIssued) * 10000) / 100 : 0;
    const averagePointsPerMember =
      totalMembers > 0 ? Math.round(netPointsOutstanding / totalMembers) : 0;

    const redeemerIds = topRedeemersRaw.map((r) => r.customerId);
    const names = redeemerIds.length
      ? await this.prisma.customer.findMany({
          where: { id: { in: redeemerIds }, businessId },
          select: { id: true, name: true },
        })
      : [];
    const nameById = new Map(names.map((c) => [c.id, c.name]));
    const topRedeemers = topRedeemersRaw.map((row) => ({
      customerId: row.customerId,
      customerName: nameById.get(row.customerId) ?? 'Unknown',
      totalRedeemed: Math.abs(row._sum.points ?? 0),
    }));

    return {
      programActive: !!program,
      totalMembers,
      membersByTier,
      pointsIssued,
      pointsRedeemed,
      pointsExpired,
      pointsAdjusted,
      pointsReversed,
      netPointsOutstanding,
      redemptionRate,
      averagePointsPerMember,
      topRedeemers,
      periodStart,
      periodEnd,
    };
  }
}

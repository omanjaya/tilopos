/**
 * Loyalty Points System
 * 
 * Features:
 * - Points earning based on spend
 * - Points redemption for discounts
 * - Tier-based multipliers
 * - Points expiration
 * - Transaction history
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Customer, LoyaltyProgram, LoyaltyTier, LoyaltyTransaction, LoyaltyTransactionType, Prisma } from '@prisma/client';

// Types
export interface LoyaltyConfig {
    pointsPerAmount: number;         // e.g., 1 point per 10000 IDR
    amountPerPoint: number;          // e.g., 1 point = 100 IDR discount
    redemptionRate: number;          // Redemption rate
    pointExpiryDays?: number;        // Days until points expire (null = never)
}

export interface TierConfig {
    name: string;
    minPoints: number;
    pointMultiplier: number;         // Points multiplier (1.0 = 100%)
    benefits: unknown;               // Json benefits
}

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

export interface CustomerLoyaltyInfo {
    customer: Customer;
    currentTier: LoyaltyTier | null;
    nextTier: LoyaltyTier | null;
    pointsToNextTier: number;
    recentTransactions: LoyaltyTransaction[];
}

// Repository Interface
export interface ILoyaltyRepository {
    getProgram(businessId: string): Promise<LoyaltyProgram | null>;
    createProgram(businessId: string, config: LoyaltyConfig): Promise<LoyaltyProgram>;
    updateProgram(id: string, config: Partial<LoyaltyConfig>): Promise<LoyaltyProgram>;

    getTiers(businessId: string): Promise<LoyaltyTier[]>;
    createTier(businessId: string, config: TierConfig): Promise<LoyaltyTier>;
    updateTier(id: string, config: Partial<TierConfig>): Promise<LoyaltyTier>;
    deleteTier(id: string): Promise<void>;

    getCustomerTier(businessId: string, totalPoints: number): Promise<LoyaltyTier | null>;
    getNextTier(businessId: string, currentPoints: number): Promise<LoyaltyTier | null>;

    createTransaction(data: {
        customerId: string;
        transactionId?: string;
        type: LoyaltyTransactionType;
        points: number;
        description?: string;
        employeeId?: string;
    }): Promise<LoyaltyTransaction>;

    getTransactions(customerId: string, limit?: number): Promise<LoyaltyTransaction[]>;
    updateCustomerPoints(customerId: string, points: number, tier?: string): Promise<Customer>;
}

@Injectable()
export class LoyaltyRepository implements ILoyaltyRepository {
    constructor(private readonly prisma: PrismaService) { }

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
                balanceAfter: 0,
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

    async updateCustomerPoints(customerId: string, points: number, tier?: string): Promise<Customer> {
        return this.prisma.customer.update({
            where: { id: customerId },
            data: {
                loyaltyPoints: points,
                ...(tier && { loyaltyTier: tier }),
            },
        });
    }
}

// ========================================
// LOYALTY SERVICE
// ========================================

@Injectable()
export class LoyaltyService {
    private readonly logger = new Logger(LoyaltyService.name);

    constructor(
        private readonly repository: LoyaltyRepository,
        private readonly prisma: PrismaService,
    ) { }

    // ========================================
    // PROGRAM MANAGEMENT
    // ========================================

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

    // ========================================
    // POINTS OPERATIONS
    // ========================================

    /**
     * Earn points from a transaction
     */
    async earnPoints(
        customerId: string,
        transactionId: string,
        transactionAmount: number,
        businessId: string,
    ): Promise<EarnPointsResult> {
        const program = await this.repository.getProgram(businessId);
        if (!program) {
            throw new BadRequestException('Loyalty program not configured');
        }

        const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
            throw new NotFoundException(`Customer ${customerId} not found`);
        }

        // Get customer's current tier for multiplier
        const currentTier = await this.repository.getCustomerTier(businessId, customer.loyaltyPoints);
        const multiplier = Number(currentTier?.pointMultiplier || 1);

        // Calculate points: (amount / pointsPerAmount) * multiplier
        const basePoints = Math.floor(transactionAmount / Number(program.pointsPerAmount));
        const pointsEarned = Math.floor(basePoints * multiplier);

        if (pointsEarned <= 0) {
            return {
                pointsEarned: 0,
                multiplier,
                newBalance: customer.loyaltyPoints,
                tierName: currentTier?.name || 'Regular',
            };
        }

        // Create loyalty transaction
        await this.repository.createTransaction({
            customerId,
            transactionId,
            type: 'earned',
            points: pointsEarned,
            description: `Points earned from transaction`,
        });

        // Update customer points
        const newBalance = customer.loyaltyPoints + pointsEarned;

        // Check if tier changed
        const newTier = await this.repository.getCustomerTier(businessId, newBalance);
        const tierName = newTier?.name || 'Regular';

        await this.repository.updateCustomerPoints(customerId, newBalance, tierName);

        this.logger.log(`Customer ${customerId} earned ${pointsEarned} points (${multiplier}x multiplier)`);

        return {
            pointsEarned,
            multiplier,
            newBalance,
            tierName,
        };
    }

    /**
     * Redeem points for discount
     */
    async redeemPoints(
        customerId: string,
        pointsToRedeem: number,
        businessId: string,
        transactionId?: string,
        employeeId?: string,
    ): Promise<RedeemPointsResult> {
        const program = await this.repository.getProgram(businessId);
        if (!program) {
            throw new BadRequestException('Loyalty program not configured');
        }

        const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
            throw new NotFoundException(`Customer ${customerId} not found`);
        }

        // Validations
        if (pointsToRedeem < Number(program.redemptionRate)) {
            throw new BadRequestException(`Minimum ${program.redemptionRate} points required for redemption`);
        }

        if (pointsToRedeem > customer.loyaltyPoints) {
            throw new BadRequestException(`Insufficient points. Available: ${customer.loyaltyPoints}`);
        }

        // Calculate discount: points * amountPerPoint
        const discountAmount = pointsToRedeem * Number(program.amountPerPoint);

        // Create redemption transaction
        await this.repository.createTransaction({
            customerId,
            transactionId,
            type: 'redeemed',
            points: -pointsToRedeem,
            description: `Redeemed for Rp ${discountAmount.toLocaleString()} discount`,
            employeeId,
        });

        // Update customer points
        const newBalance = customer.loyaltyPoints - pointsToRedeem;
        await this.repository.updateCustomerPoints(customerId, newBalance);

        this.logger.log(`Customer ${customerId} redeemed ${pointsToRedeem} points for Rp ${discountAmount}`);

        return {
            pointsRedeemed: pointsToRedeem,
            discountAmount,
            newBalance,
        };
    }

    /**
     * Manual points adjustment (by admin)
     */
    async adjustPoints(
        customerId: string,
        points: number,
        reason: string,
        employeeId: string,
        businessId: string,
    ): Promise<Customer> {
        const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
            throw new NotFoundException(`Customer ${customerId} not found`);
        }

        await this.repository.createTransaction({
            customerId,
            type: 'adjusted',
            points,
            description: reason,
            employeeId,
        });

        const newBalance = Math.max(0, customer.loyaltyPoints + points);
        const newTier = await this.repository.getCustomerTier(businessId, newBalance);

        return this.repository.updateCustomerPoints(customerId, newBalance, newTier?.name);
    }

    // ========================================
    // CUSTOMER INFO
    // ========================================

    async getCustomerLoyaltyInfo(customerId: string, businessId: string): Promise<CustomerLoyaltyInfo> {
        const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
            throw new NotFoundException(`Customer ${customerId} not found`);
        }

        const currentTier = await this.repository.getCustomerTier(businessId, customer.loyaltyPoints);
        const nextTier = await this.repository.getNextTier(businessId, customer.loyaltyPoints);
        const recentTransactions = await this.repository.getTransactions(customerId, 10);

        return {
            customer,
            currentTier,
            nextTier,
            pointsToNextTier: nextTier ? nextTier.minPoints - customer.loyaltyPoints : 0,
            recentTransactions,
        };
    }

    /**
     * Calculate potential points for an amount
     */
    async calculatePotentialPoints(
        amount: number,
        businessId: string,
        customerId?: string,
    ): Promise<{ basePoints: number; multiplier: number; totalPoints: number }> {
        const program = await this.repository.getProgram(businessId);
        if (!program) {
            return { basePoints: 0, multiplier: 1, totalPoints: 0 };
        }

        const basePoints = Math.floor(amount / Number(program.pointsPerAmount));
        let multiplier = 1;

        if (customerId) {
            const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
            if (customer) {
                const tier = await this.repository.getCustomerTier(businessId, customer.loyaltyPoints);
                multiplier = Number(tier?.pointMultiplier || 1);
            }
        }

        return {
            basePoints,
            multiplier,
            totalPoints: Math.floor(basePoints * multiplier),
        };
    }

    /**
     * Calculate discount value for points
     */
    async calculateRedemptionValue(points: number, businessId: string): Promise<number> {
        const program = await this.repository.getProgram(businessId);
        if (!program) return 0;
        return points * Number(program.amountPerPoint);
    }

    // ========================================
    // TIER CHECK & UPGRADE/DOWNGRADE
    // ========================================

    /**
     * Check all customers' total points vs tier thresholds, auto-upgrade/downgrade.
     * Returns summary of changes made.
     */
    async checkAndUpgradeTiers(businessId: string): Promise<{
        evaluated: number;
        upgraded: number;
        downgraded: number;
        unchanged: number;
        changes: Array<{ customerId: string; name: string; previousTier: string; newTier: string; change: string }>;
    }> {
        const result = {
            evaluated: 0,
            upgraded: 0,
            downgraded: 0,
            unchanged: 0,
            changes: [] as Array<{ customerId: string; name: string; previousTier: string; newTier: string; change: string }>,
        };

        const tiers = await this.repository.getTiers(businessId);
        if (tiers.length === 0) {
            return result;
        }

        // Get all active customers for this business
        const customers = await this.prisma.customer.findMany({
            where: { businessId, isActive: true },
            select: { id: true, name: true, loyaltyPoints: true, loyaltyTier: true },
        });

        for (const customer of customers) {
            result.evaluated++;

            // Find the highest tier the customer qualifies for
            const eligibleTier = await this.repository.getCustomerTier(businessId, customer.loyaltyPoints);
            const newTierName = eligibleTier?.name || 'Regular';
            const previousTier = customer.loyaltyTier;

            if (newTierName === previousTier) {
                result.unchanged++;
                continue;
            }

            // Determine if upgrade or downgrade by comparing minPoints
            const previousTierObj = tiers.find(t => t.name === previousTier);
            const newTierObj = tiers.find(t => t.name === newTierName);
            const previousMinPoints = previousTierObj ? previousTierObj.minPoints : 0;
            const newMinPoints = newTierObj ? newTierObj.minPoints : 0;
            const isUpgrade = newMinPoints > previousMinPoints;

            if (isUpgrade) {
                result.upgraded++;
            } else {
                result.downgraded++;
            }

            await this.repository.updateCustomerPoints(customer.id, customer.loyaltyPoints, newTierName);

            // Log the tier change as an adjusted loyalty transaction
            await this.repository.createTransaction({
                customerId: customer.id,
                type: 'adjusted',
                points: 0,
                description: `Tier ${isUpgrade ? 'upgraded' : 'downgraded'}: ${previousTier} -> ${newTierName}`,
            });

            result.changes.push({
                customerId: customer.id,
                name: customer.name,
                previousTier,
                newTier: newTierName,
                change: isUpgrade ? 'upgraded' : 'downgraded',
            });
        }

        this.logger.log(
            `Tier check for business ${businessId}: ${result.upgraded} upgraded, ${result.downgraded} downgraded, ${result.unchanged} unchanged`,
        );

        return result;
    }

    // ========================================
    // EXPIRED POINTS PROCESSING
    // ========================================

    /**
     * Find loyalty transactions older than the program's expiry period, mark as expired.
     * Deducts expired points from customer balances.
     */
    async processExpiredPoints(businessId: string): Promise<{
        processed: number;
        expired: number;
        totalPointsExpired: number;
        details: Array<{ customerId: string; transactionId: string; pointsExpired: number; earnedAt: Date }>;
    }> {
        const result = {
            processed: 0,
            expired: 0,
            totalPointsExpired: 0,
            details: [] as Array<{ customerId: string; transactionId: string; pointsExpired: number; earnedAt: Date }>,
        };

        const program = await this.repository.getProgram(businessId);
        if (!program || !program.pointExpiryDays) {
            return result;
        }

        const now = new Date();
        const expiryThreshold = new Date(now.getTime() - Number(program.pointExpiryDays) * 24 * 60 * 60 * 1000);

        // Find earned transactions that are older than expiry period and have positive points
        // (positive points means they haven't been consumed/expired yet)
        const expiredTransactions = await this.prisma.loyaltyTransaction.findMany({
            where: {
                type: 'earned',
                points: { gt: 0 },
                createdAt: { lte: expiryThreshold },
                customer: { businessId, isActive: true },
            },
            include: {
                customer: { select: { id: true, loyaltyPoints: true } },
            },
        });

        result.processed = expiredTransactions.length;

        // Group by customer
        const customerExpiries = new Map<string, { total: number; currentPoints: number; txIds: string[]; details: typeof result.details }>();

        for (const tx of expiredTransactions) {
            if (!customerExpiries.has(tx.customerId)) {
                customerExpiries.set(tx.customerId, {
                    total: 0,
                    currentPoints: tx.customer.loyaltyPoints,
                    txIds: [],
                    details: [],
                });
            }
            const entry = customerExpiries.get(tx.customerId)!;
            entry.total += tx.points;
            entry.txIds.push(tx.id);
            entry.details.push({
                customerId: tx.customerId,
                transactionId: tx.id,
                pointsExpired: tx.points,
                earnedAt: tx.createdAt,
            });
        }

        // Process each customer
        for (const [customerId, data] of customerExpiries.entries()) {
            const newBalance = Math.max(0, data.currentPoints - data.total);

            // Create expiry transaction
            await this.repository.createTransaction({
                customerId,
                type: 'expired',
                points: -data.total,
                description: `${data.total} points expired (${data.txIds.length} transactions)`,
            });

            // Update customer balance
            await this.repository.updateCustomerPoints(customerId, newBalance);

            // Mark original earned transactions to prevent re-processing
            await this.prisma.loyaltyTransaction.updateMany({
                where: { id: { in: data.txIds } },
                data: { points: 0, description: 'Points expired' },
            });

            result.expired += data.txIds.length;
            result.totalPointsExpired += data.total;
            result.details.push(...data.details);
        }

        this.logger.log(
            `Points expiry for business ${businessId}: ${result.expired} transactions, ${result.totalPointsExpired} total points expired`,
        );

        return result;
    }

    // ========================================
    // LOYALTY ANALYTICS
    // ========================================

    /**
     * Return loyalty program analytics: total members, points outstanding, tier distribution, redemption rate.
     */
    async getLoyaltyAnalytics(businessId: string): Promise<{
        totalMembers: number;
        pointsOutstanding: number;
        tierDistribution: Array<{ tier: string; count: number; percentage: number }>;
        redemptionRate: number;
        totalPointsEarned: number;
        totalPointsRedeemed: number;
        totalPointsExpired: number;
        averagePointsPerMember: number;
    }> {
        // Total members with any loyalty points or tier
        const totalMembers = await this.prisma.customer.count({
            where: { businessId, isActive: true },
        });

        // Points outstanding (sum of all active customer points)
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

        const tierDistribution = tierGroups.map(g => ({
            tier: g.loyaltyTier,
            count: g._count.id,
            percentage: totalMembers > 0
                ? Math.round((g._count.id / totalMembers) * 10000) / 100
                : 0,
        }));

        // Points earned/redeemed/expired aggregation
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

        const redemptionRate = totalPointsEarned > 0
            ? Math.round((totalPointsRedeemed / totalPointsEarned) * 10000) / 100
            : 0;

        const averagePointsPerMember = totalMembers > 0
            ? Math.round(pointsOutstanding / totalMembers)
            : 0;

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
}

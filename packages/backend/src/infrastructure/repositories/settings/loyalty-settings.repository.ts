import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  LoyaltyProgramRecord,
  CreateLoyaltyProgramData,
  UpdateLoyaltyProgramData,
  LoyaltyTierRecord,
  CreateLoyaltyTierData,
  UpdateLoyaltyTierData,
} from '../../../domain/interfaces/repositories/settings.repository';

/**
 * Repository for managing loyalty programs and tiers.
 * Handles loyalty rewards, points, and tier management.
 */
@Injectable()
export class LoyaltySettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Loyalty Program ====================

  /**
   * Find loyalty program for a business
   */
  async findLoyaltyProgram(businessId: string): Promise<LoyaltyProgramRecord | null> {
    const program = await this.prisma.loyaltyProgram.findFirst({ where: { businessId } });

    if (!program) {
      return null;
    }

    return {
      ...program,
      amountPerPoint: program.amountPerPoint.toNumber(),
      redemptionRate: program.redemptionRate.toNumber(),
    };
  }

  /**
   * Create a new loyalty program
   */
  async createLoyaltyProgram(data: CreateLoyaltyProgramData): Promise<LoyaltyProgramRecord> {
    const program = await this.prisma.loyaltyProgram.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        amountPerPoint: data.amountPerPoint,
        redemptionRate: data.redemptionRate,
        pointExpiryDays: data.pointExpiryDays || null,
      },
    });

    return {
      ...program,
      amountPerPoint: program.amountPerPoint.toNumber(),
      redemptionRate: program.redemptionRate.toNumber(),
    };
  }

  /**
   * Update loyalty program
   */
  async updateLoyaltyProgram(
    businessId: string,
    data: UpdateLoyaltyProgramData,
  ): Promise<LoyaltyProgramRecord> {
    await this.prisma.loyaltyProgram.updateMany({
      where: { businessId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.amountPerPoint !== undefined && { amountPerPoint: data.amountPerPoint }),
        ...(data.redemptionRate !== undefined && { redemptionRate: data.redemptionRate }),
        ...(data.pointExpiryDays !== undefined && { pointExpiryDays: data.pointExpiryDays }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    // Fetch the updated record to return with converted Decimal fields
    const program = await this.prisma.loyaltyProgram.findFirst({ where: { businessId } });
    if (!program) {
      throw new NotFoundException('Loyalty program not found');
    }

    return {
      ...program,
      amountPerPoint: program.amountPerPoint.toNumber(),
      redemptionRate: program.redemptionRate.toNumber(),
    };
  }

  // ==================== Loyalty Tiers ====================

  /**
   * Find all loyalty tiers for a business
   */
  async findLoyaltyTiers(businessId: string): Promise<LoyaltyTierRecord[]> {
    const tiers = await this.prisma.loyaltyTier.findMany({
      where: { businessId },
      orderBy: { sortOrder: 'asc' },
    });

    return tiers.map((t) => ({
      ...t,
      minSpent: t.minSpent.toNumber(),
      pointMultiplier: t.pointMultiplier.toNumber(),
      updatedAt: t.createdAt, // Use createdAt as updatedAt since schema doesn't have it
    }));
  }

  /**
   * Create a new loyalty tier
   */
  async createLoyaltyTier(data: CreateLoyaltyTierData): Promise<LoyaltyTierRecord> {
    const tier = await this.prisma.loyaltyTier.create({
      data: {
        businessId: data.businessId,
        name: data.name,
        minPoints: data.minPoints,
        minSpent: data.minSpent ?? 0,
        pointMultiplier: data.pointMultiplier,
        benefits: (data.benefits || []) as never,
        sortOrder: data.sortOrder ?? 0,
      },
    });

    return {
      ...tier,
      minSpent: tier.minSpent.toNumber(),
      pointMultiplier: tier.pointMultiplier.toNumber(),
      updatedAt: tier.createdAt, // Use createdAt as updatedAt since schema doesn't have it
    };
  }

  /**
   * Update loyalty tier
   */
  async updateLoyaltyTier(id: string, data: UpdateLoyaltyTierData): Promise<LoyaltyTierRecord> {
    const tier = await this.prisma.loyaltyTier.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.minPoints !== undefined && { minPoints: data.minPoints }),
        ...(data.minSpent !== undefined && { minSpent: data.minSpent }),
        ...(data.pointMultiplier !== undefined && { pointMultiplier: data.pointMultiplier }),
        ...(data.benefits !== undefined && { benefits: data.benefits as never }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return {
      ...tier,
      minSpent: tier.minSpent.toNumber(),
      pointMultiplier: tier.pointMultiplier.toNumber(),
      updatedAt: tier.createdAt, // Use createdAt as updatedAt since schema doesn't have it
    };
  }

  /**
   * Soft delete a loyalty tier (set isActive to false)
   */
  async deleteLoyaltyTier(id: string): Promise<void> {
    await this.prisma.loyaltyTier.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

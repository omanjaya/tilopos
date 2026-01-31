import { Injectable } from '@nestjs/common';
import type {
  ILoyaltyRepository,
  LoyaltyProgramRecord,
  LoyaltyTierRecord,
  LoyaltyTransactionRecord,
  CreateLoyaltyTransactionData,
} from '../../domain/interfaces/repositories/loyalty.repository';
import { PrismaService } from '../database/prisma.service';
import { decimalToNumberRequired } from './decimal.helper';
import type { LoyaltyProgram, LoyaltyTier, LoyaltyTransaction } from '@prisma/client';

@Injectable()
export class PrismaLoyaltyRepository implements ILoyaltyRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Program ====================

  async findActiveProgram(businessId: string): Promise<LoyaltyProgramRecord | null> {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { businessId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!program) {
      return null;
    }

    return this.toProgramRecord(program);
  }

  async findProgramById(id: string): Promise<LoyaltyProgramRecord | null> {
    const program = await this.prisma.loyaltyProgram.findUnique({
      where: { id },
    });

    if (!program) {
      return null;
    }

    return this.toProgramRecord(program);
  }

  // ==================== Tier ====================

  async findTiersByBusiness(businessId: string): Promise<LoyaltyTierRecord[]> {
    const tiers = await this.prisma.loyaltyTier.findMany({
      where: { businessId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return tiers.map((t) => this.toTierRecord(t));
  }

  async findTierById(id: string): Promise<LoyaltyTierRecord | null> {
    const tier = await this.prisma.loyaltyTier.findUnique({
      where: { id },
    });

    if (!tier) {
      return null;
    }

    return this.toTierRecord(tier);
  }

  async findEligibleTier(
    businessId: string,
    points: number,
    totalSpent: number,
  ): Promise<LoyaltyTierRecord | null> {
    const tiers = await this.prisma.loyaltyTier.findMany({
      where: { businessId, isActive: true },
      orderBy: { sortOrder: 'desc' },
    });

    for (const tier of tiers) {
      const minPoints = tier.minPoints;
      const minSpent = decimalToNumberRequired(tier.minSpent);
      if (points >= minPoints && totalSpent >= minSpent) {
        return this.toTierRecord(tier);
      }
    }

    return null;
  }

  // ==================== Transaction ====================

  async createTransaction(data: CreateLoyaltyTransactionData): Promise<LoyaltyTransactionRecord> {
    const created = await this.prisma.loyaltyTransaction.create({
      data: {
        customerId: data.customerId,
        transactionId: data.transactionId,
        type: data.type,
        points: data.points,
        balanceAfter: data.balanceAfter,
        description: data.description,
        expiresAt: data.expiresAt,
        createdBy: data.createdBy,
      },
    });

    return this.toTransactionRecord(created);
  }

  async findTransactionsByCustomer(customerId: string, limit = 50): Promise<LoyaltyTransactionRecord[]> {
    const transactions = await this.prisma.loyaltyTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions.map((t) => this.toTransactionRecord(t));
  }

  // ==================== Customer ====================

  async updateCustomerPoints(customerId: string, points: number, tier: string): Promise<void> {
    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        loyaltyPoints: points,
        loyaltyTier: tier,
      },
    });
  }

  async findCustomerById(customerId: string) {
    return this.prisma.customer.findUnique({
      where: { id: customerId },
    });
  }

  // ==================== Mappers ====================

  private toProgramRecord(program: LoyaltyProgram): LoyaltyProgramRecord {
    return {
      id: program.id,
      businessId: program.businessId,
      name: program.name,
      pointsPerAmount: decimalToNumberRequired(program.pointsPerAmount),
      amountPerPoint: decimalToNumberRequired(program.amountPerPoint),
      redemptionRate: decimalToNumberRequired(program.redemptionRate),
      pointExpiryDays: program.pointExpiryDays,
      isActive: program.isActive,
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
    };
  }

  private toTierRecord(tier: LoyaltyTier): LoyaltyTierRecord {
    return {
      id: tier.id,
      businessId: tier.businessId,
      name: tier.name,
      minPoints: tier.minPoints,
      minSpent: decimalToNumberRequired(tier.minSpent),
      pointMultiplier: decimalToNumberRequired(tier.pointMultiplier),
      benefits: tier.benefits as Record<string, unknown>,
      sortOrder: tier.sortOrder,
      isActive: tier.isActive,
      createdAt: tier.createdAt,
    };
  }

  private toTransactionRecord(tx: LoyaltyTransaction): LoyaltyTransactionRecord {
    return {
      id: tx.id,
      customerId: tx.customerId,
      transactionId: tx.transactionId,
      type: tx.type,
      points: tx.points,
      balanceAfter: tx.balanceAfter,
      description: tx.description,
      expiresAt: tx.expiresAt,
      createdBy: tx.createdBy,
      createdAt: tx.createdAt,
    };
  }
}

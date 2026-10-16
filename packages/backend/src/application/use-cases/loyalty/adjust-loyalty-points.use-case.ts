import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { AppError } from '@shared/errors/app-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { pickEligibleTier } from './loyalty-tier.util';

export interface AdjustLoyaltyPointsParams {
  businessId: string;
  customerId: string;
  points: number;
  reason: string;
  employeeId: string;
}

export interface AdjustLoyaltyPointsResult {
  customerId: string;
  previousBalance: number;
  adjustment: number;
  newBalance: number;
  tier: string;
  reason: string;
  adjustedBy: string;
}

/**
 * Manual points correction by a manager. The balance never goes below zero; the
 * applied delta (possibly clamped) is what gets written to the ledger.
 */
@Injectable()
export class AdjustLoyaltyPointsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: AdjustLoyaltyPointsParams): Promise<AdjustLoyaltyPointsResult> {
    const { businessId, customerId } = params;
    if (!Number.isInteger(params.points) || params.points === 0) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'points must be a non-zero integer');
    }

    const exists = await this.prisma.customer.findFirst({
      where: { id: customerId, businessId },
      select: { id: true },
    });
    if (!exists) {
      throw new AppError(ErrorCode.CUSTOMER_NOT_FOUND, 'Customer not found', HttpStatus.NOT_FOUND);
    }

    const tiers = await this.prisma.loyaltyTier.findMany({
      where: { businessId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM customers WHERE id = ${customerId}::uuid FOR UPDATE`;
      const current = await tx.customer.findFirstOrThrow({
        where: { id: customerId, businessId },
        select: { loyaltyPoints: true, loyaltyTier: true, totalSpent: true },
      });

      const applied = Math.max(params.points, -current.loyaltyPoints);
      const updated = await tx.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: { increment: applied } },
        select: { loyaltyPoints: true },
      });

      await tx.loyaltyTransaction.create({
        data: {
          customerId,
          type: 'adjusted',
          points: applied,
          balanceAfter: updated.loyaltyPoints,
          description: params.reason,
          createdBy: params.employeeId,
        },
      });

      const eligible = pickEligibleTier(tiers, updated.loyaltyPoints, current.totalSpent);
      const newTier = eligible ? eligible.name : current.loyaltyTier;
      if (newTier !== current.loyaltyTier) {
        await tx.customer.update({ where: { id: customerId }, data: { loyaltyTier: newTier } });
      }

      return {
        customerId,
        previousBalance: current.loyaltyPoints,
        adjustment: applied,
        newBalance: updated.loyaltyPoints,
        tier: newTier,
        reason: params.reason,
        adjustedBy: params.employeeId,
      };
    });
  }
}

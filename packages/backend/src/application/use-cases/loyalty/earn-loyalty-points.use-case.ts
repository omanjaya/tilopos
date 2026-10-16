import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { AppError } from '@shared/errors/app-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { money } from '@shared/utils/money';
import { addBusinessDays } from '@shared/utils/business-time';
import { pickEligibleTier } from './loyalty-tier.util';
import { computeLoyaltyPoints } from '@application/services/loyalty-points';
import { AUDIT_ACTIONS } from '@modules/audit/audit-actions';

export interface EarnLoyaltyPointsParams {
  businessId: string;
  customerId: string;
  transactionId: string;
  employeeId?: string;
}

export interface EarnLoyaltyPointsResult {
  pointsEarned: number;
  totalPoints: number;
  tierChanged: boolean;
  newTier?: string;
}

/**
 * Credits loyalty points for a completed sale (R8/R9):
 * - customer and transaction are looked up inside the caller's business;
 * - the amount is the sale's grandTotal from the DB, never a client number;
 * - one 'earned' ledger row per transaction (checked under a row lock on the customer);
 * - balance/spend/visit are updated with atomic increments in the same DB transaction.
 */
@Injectable()
export class EarnLoyaltyPointsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: EarnLoyaltyPointsParams): Promise<EarnLoyaltyPointsResult> {
    const { businessId, customerId, transactionId } = params;

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, businessId, isActive: true },
      select: { id: true, loyaltyPoints: true, loyaltyTier: true },
    });
    if (!customer) {
      throw new AppError(ErrorCode.CUSTOMER_NOT_FOUND, 'Customer not found', HttpStatus.NOT_FOUND);
    }

    const sale = await this.prisma.transaction.findFirst({
      where: { id: transactionId, outlet: { businessId } },
      select: { id: true, customerId: true, status: true, transactionType: true, grandTotal: true },
    });
    if (!sale) {
      throw new AppError(
        ErrorCode.TRANSACTION_NOT_FOUND,
        'Transaction not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (sale.status !== 'completed' || sale.transactionType !== 'sale') {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Points can only be earned from a completed sale',
      );
    }
    if (sale.customerId && sale.customerId !== customerId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Transaction belongs to a different customer');
    }

    const zero: EarnLoyaltyPointsResult = {
      pointsEarned: 0,
      totalPoints: customer.loyaltyPoints,
      tierChanged: false,
    };

    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { businessId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    // amountPerPoint = rupiah spent per 1 point ("Jumlah per Poin" in settings).
    if (!program || money(program.amountPerPoint).lte(0)) {
      return zero;
    }

    const tiers = await this.prisma.loyaltyTier.findMany({
      where: { businessId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    const currentTier = tiers.find((t) => t.name === customer.loyaltyTier);
    const multiplier = currentTier ? money(currentTier.pointMultiplier) : money(1);

    // Same formula as the receipt preview and TransactionEventListener (R8).
    const pointsEarned = computeLoyaltyPoints(sale.grandTotal, program.amountPerPoint, multiplier);
    if (pointsEarned <= 0) {
      return zero;
    }

    const expiresAt = program.pointExpiryDays
      ? addBusinessDays(new Date(), program.pointExpiryDays)
      : null;

    return this.prisma.$transaction(async (tx) => {
      // Serialize concurrent earn/redeem for this customer so the duplicate check is reliable.
      await tx.$queryRaw`SELECT id FROM customers WHERE id = ${customerId}::uuid FOR UPDATE`;

      const alreadyEarned = await tx.loyaltyTransaction.findFirst({
        where: { transactionId, type: 'earned' },
        select: { id: true },
      });
      if (alreadyEarned) {
        throw new AppError(
          ErrorCode.CONFLICT,
          'Points were already earned for this transaction',
          HttpStatus.CONFLICT,
        );
      }

      // TransactionEventListener already counted spend/visit for this sale when its marker
      // exists; then only the points are added here (no double-counted totalSpent).
      const statsCounted =
        (await tx.auditLog.count({
          where: {
            entityType: 'transaction',
            entityId: transactionId,
            action: AUDIT_ACTIONS.TRANSACTION_CREATED,
          },
        })) > 0;

      const updated = await tx.customer.update({
        where: { id: customerId },
        data: {
          loyaltyPoints: { increment: pointsEarned },
          ...(statsCounted
            ? {}
            : {
                totalSpent: { increment: sale.grandTotal },
                visitCount: { increment: 1 },
                lastVisitAt: new Date(),
              }),
        },
        select: { loyaltyPoints: true, totalSpent: true, loyaltyTier: true },
      });

      await tx.loyaltyTransaction.create({
        data: {
          customerId,
          transactionId,
          type: 'earned',
          points: pointsEarned,
          balanceAfter: updated.loyaltyPoints,
          description: `Earned ${pointsEarned} points from transaction`,
          expiresAt,
          createdBy: params.employeeId ?? null,
        },
      });

      const eligible = pickEligibleTier(tiers, updated.loyaltyPoints, updated.totalSpent);
      const newTierName = eligible ? eligible.name : updated.loyaltyTier;
      if (newTierName !== updated.loyaltyTier) {
        await tx.customer.update({
          where: { id: customerId },
          data: { loyaltyTier: newTierName },
        });
      }

      const tierChanged = newTierName !== customer.loyaltyTier;
      return {
        pointsEarned,
        totalPoints: updated.loyaltyPoints,
        tierChanged,
        newTier: tierChanged ? newTierName : undefined,
      };
    });
  }
}

import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { AppError } from '@shared/errors/app-error';
import { ErrorCode } from '@shared/constants/error-codes';
import { multiplyMoney, roundRupiah, toNumber } from '@shared/utils/money';
import { MAX_POINTS_PER_OPERATION } from '@application/dtos/loyalty.dto';

export interface RedeemLoyaltyPointsParams {
  businessId: string;
  customerId: string;
  pointsToRedeem: number;
  transactionId?: string;
  employeeId?: string;
}

export interface RedeemLoyaltyPointsResult {
  discountAmount: number;
  pointsRedeemed: number;
  remainingPoints: number;
}

/**
 * Spends loyalty points (R9): the balance is decremented with a conditional
 * update (`loyaltyPoints >= n`) so two concurrent redeems can never overdraw,
 * and the ledger row is written in the same DB transaction.
 */
@Injectable()
export class RedeemLoyaltyPointsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(params: RedeemLoyaltyPointsParams): Promise<RedeemLoyaltyPointsResult> {
    const { businessId, customerId, pointsToRedeem } = params;

    if (
      !Number.isInteger(pointsToRedeem) ||
      pointsToRedeem < 1 ||
      pointsToRedeem > MAX_POINTS_PER_OPERATION
    ) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'pointsToRedeem must be a positive integer');
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, businessId, isActive: true },
      select: { id: true },
    });
    if (!customer) {
      throw new AppError(ErrorCode.CUSTOMER_NOT_FOUND, 'Customer not found', HttpStatus.NOT_FOUND);
    }

    if (params.transactionId) {
      const sale = await this.prisma.transaction.findFirst({
        where: { id: params.transactionId, outlet: { businessId } },
        select: { id: true },
      });
      if (!sale) {
        throw new AppError(
          ErrorCode.TRANSACTION_NOT_FOUND,
          'Transaction not found',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { businessId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!program) {
      throw new AppError(ErrorCode.LOYALTY_NOT_ENABLED, 'Loyalty program not enabled');
    }

    // redemptionRate = rupiah value of one point ("Nilai Tukar (Rp per poin)" in settings).
    const discountAmount = roundRupiah(multiplyMoney(pointsToRedeem, program.redemptionRate));

    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.customer.updateMany({
        where: { id: customerId, businessId, loyaltyPoints: { gte: pointsToRedeem } },
        data: { loyaltyPoints: { decrement: pointsToRedeem } },
      });
      if (count === 0) {
        throw new AppError(ErrorCode.INSUFFICIENT_POINTS, 'Insufficient loyalty points');
      }

      const after = await tx.customer.findFirstOrThrow({
        where: { id: customerId, businessId },
        select: { loyaltyPoints: true },
      });

      await tx.loyaltyTransaction.create({
        data: {
          customerId,
          transactionId: params.transactionId ?? null,
          type: 'redeemed',
          // Ledger convention: deductions are negative.
          points: -pointsToRedeem,
          balanceAfter: after.loyaltyPoints,
          description: `Redeemed ${pointsToRedeem} points for discount`,
          createdBy: params.employeeId ?? null,
        },
      });

      return {
        discountAmount: toNumber(discountAmount),
        pointsRedeemed: pointsToRedeem,
        remainingPoints: after.loyaltyPoints,
      };
    });
  }
}

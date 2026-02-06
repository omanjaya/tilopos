/**
 * Points Expiry Service
 *
 * Handles points expiration processing.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { LoyaltyRepository } from '../repositories/loyalty.repository';
import { ExpiryRules } from '../business-rules/expiry.rules';

export interface ExpiryResult {
  processed: number;
  expired: number;
  totalPointsExpired: number;
  details: Array<{
    customerId: string;
    transactionId: string;
    pointsExpired: number;
    earnedAt: Date;
  }>;
}

@Injectable()
export class ExpiryService {
  private readonly logger = new Logger(ExpiryService.name);

  constructor(
    private readonly repository: LoyaltyRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Process expired points for a business
   */
  async processExpiredPoints(businessId: string): Promise<ExpiryResult> {
    const result: ExpiryResult = {
      processed: 0,
      expired: 0,
      totalPointsExpired: 0,
      details: [],
    };

    // Get program and check if expiry is enabled
    const program = await this.repository.getProgram(businessId);
    if (!program || !ExpiryRules.hasExpiryEnabled(program)) {
      return result;
    }

    const now = new Date();
    const expiryThreshold = ExpiryRules.calculateExpiryThreshold(
      now,
      Number(program.pointExpiryDays),
    );

    // Find expired transactions
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
    const customerExpiries = ExpiryRules.groupExpiryByCustomer(
      expiredTransactions.map((tx) => ({
        customerId: tx.customerId,
        transactionId: tx.id,
        points: tx.points,
        earnedAt: tx.createdAt,
        currentPoints: tx.customer.loyaltyPoints,
      })),
    );

    // Process each customer's expiries
    for (const [customerId, data] of Array.from(customerExpiries.entries())) {
      const currentPoints = data.transactions[0].currentPoints;
      const newBalance = Math.max(0, currentPoints - data.total);

      // Create expiry transaction
      await this.repository.createTransaction({
        customerId,
        type: 'expired',
        points: -data.total,
        description: `${data.total} points expired (${data.transactions.length} transactions)`,
      });

      // Update customer balance
      await this.repository.updateCustomerPoints(customerId, newBalance);

      // Mark original transactions as expired
      const txIds = data.transactions.map((t) => t.transactionId);
      await this.prisma.loyaltyTransaction.updateMany({
        where: { id: { in: txIds } },
        data: { points: 0, description: 'Points expired' },
      });

      result.expired += data.transactions.length;
      result.totalPointsExpired += data.total;

      // Add details
      for (const tx of data.transactions) {
        result.details.push({
          customerId: tx.customerId,
          transactionId: tx.transactionId,
          pointsExpired: tx.points,
          earnedAt: tx.earnedAt,
        });
      }
    }

    this.logger.log(
      `Points expiry for business ${businessId}: ${result.expired} transactions, ${result.totalPointsExpired} total points expired`,
    );

    return result;
  }
}

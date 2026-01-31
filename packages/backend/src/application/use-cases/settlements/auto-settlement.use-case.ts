import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { QueueService } from '../../../infrastructure/queues/queue.service';

export interface AutoSettleParams {
  outletId: string;
  businessId: string;
  settlementDate?: Date;
}

export interface AutoSettleResult {
  settlementId: string;
  queued: boolean;
}

@Injectable()
export class AutoSettlementUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async execute(params: AutoSettleParams): Promise<AutoSettleResult[]> {
    const settlementDate = params.settlementDate ?? new Date();

    // Get all transactions for the outlet that need settlement
    const transactions = await this.prisma.transaction.findMany({
      where: {
        outletId: params.outletId,
        status: 'completed',
        createdAt: {
          gte: new Date(settlementDate.setHours(0, 0, 0, 0)),
          lt: new Date(settlementDate.setHours(23, 59, 59, 999)),
        },
      },
      include: {
        payments: true,
      },
    });

    if (transactions.length === 0) {
      return [];
    }

    // Group by payment method
    const paymentGroups = new Map<string, typeof transactions>();

    for (const tx of transactions) {
      for (const payment of tx.payments) {
        const method = payment.paymentMethod;
        if (!paymentGroups.has(method)) {
          paymentGroups.set(method, []);
        }
        paymentGroups.get(method)!.push(tx);
      }
    }

    const results: AutoSettleResult[] = [];

    // Create settlement for each payment method
    for (const [paymentMethod, txs] of paymentGroups) {
      const grossAmount = txs.reduce((sum, tx) => {
        const grandTotal = (tx as { grandTotal: { toNumber: () => number } }).grandTotal;
        return sum + grandTotal.toNumber();
      }, 0);

      // Calculate fee based on payment gateway rates
      const feeAmount = this.calculateFeeAmount(paymentMethod, grossAmount);
      const netAmount = grossAmount - feeAmount;

      const settlement = await this.prisma.paymentSettlement.create({
        data: {
          outletId: params.outletId,
          paymentMethod,
          settlementDate,
          totalTransactions: txs.length,
          grossAmount,
          feeAmount,
          netAmount,
          referenceNumber: null,
          status: 'pending',
        },
      });

      // Queue settlement job for async processing
      await this.queueService.addSettlementJob({
        outletId: params.outletId,
        paymentMethod,
        settlementDate: settlementDate.toISOString(),
        businessId: params.businessId,
      });

      results.push({
        settlementId: settlement.id,
        queued: true,
      });
    }

    return results;
  }

  private calculateFeeAmount(paymentMethod: string, grossAmount: number): number {
    // Payment gateway fee rates (example)
    const feeRates: Record<string, number> = {
      midtrans_qris: 0.007, // 0.7%
      midtrans_gopay: 0.02, // 2%
      midtrans_ovo: 0.02, // 2%
      midtrans_dana: 0.02, // 2%
      midtrans_shopeepay: 0.015, // 1.5%
      cash: 0, // No fee for cash
      card: 0.025, // 2.5% for card
    };

    const rate = feeRates[paymentMethod] ?? 0;
    return Math.floor(grossAmount * rate);
  }
}

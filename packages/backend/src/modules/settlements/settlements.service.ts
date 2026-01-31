/**
 * Settlements & Reconciliation Service
 *
 * Features:
 * - Auto-scheduling settlements
 * - Daily/weekly/monthly settlement periods
 * - Payment method breakdown
 * - Cash vs non-cash reconciliation
 * - Dispute handling
 * - Export reports
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentMethod, SettlementStatus, Prisma } from '@prisma/client';

// Types
export interface SettlementPeriod {
    start: Date;
    end: Date;
}

export interface PaymentBreakdown {
    method: PaymentMethod;
    transactionCount: number;
    totalAmount: number;
    refundAmount: number;
    netAmount: number;
}

export interface SettlementSummary {
    id: string;
    outletId: string;
    paymentMethod: string;
    settlementDate: Date;
    totalTransactions: number;
    grossAmount: number;
    feeAmount: number;
    netAmount: number;
    status: SettlementStatus;
    referenceNumber?: string;
    settledAt?: Date;
    metadata?: Record<string, unknown>;
}

export interface CreateSettlementDto {
    outletId: string;
    periodStart: Date;
    periodEnd: Date;
}

export interface CloseSettlementDto {
    actualCash: number;
    notes?: string;
    employeeId: string;
}

export interface SettlementReport {
    outlet: { id: string; name: string };
    period: SettlementPeriod;
    summary: SettlementSummary;
    transactions: Array<{
        id: string;
        receiptNumber: string;
        grandTotal: number;
        paymentMethod: PaymentMethod;
        createdAt: Date;
    }>;
}

// ========================================
// SETTLEMENTS SERVICE
// ========================================

@Injectable()
export class SettlementsService {
    private readonly logger = new Logger(SettlementsService.name);

    constructor(private readonly prisma: PrismaService) { }

    // ========================================
    // AUTO-SCHEDULING (CRON JOBS)
    // ========================================

    /**
     * Auto-create daily settlement at midnight
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async autoCreateDailySettlements(): Promise<void> {
        this.logger.log('Running auto-settlement job...');

        const outlets = await this.prisma.outlet.findMany({
            where: { isActive: true },
        });

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);

        for (const outlet of outlets) {
            try {
                // Check if settlement already exists
                const existing = await this.prisma.paymentSettlement.findFirst({
                    where: {
                        outletId: outlet.id,
                        settlementDate: yesterday,
                    },
                });

                if (!existing) {
                    await this.createSettlement({
                        outletId: outlet.id,
                        periodStart: yesterday,
                        periodEnd: endOfYesterday,
                    });
                    this.logger.log(`Created settlement for outlet ${outlet.id}`);
                }
            } catch (error) {
                this.logger.error(`Failed to create settlement for outlet ${outlet.id}: ${error}`);
            }
        }
    }

    // ========================================
    // SETTLEMENT CRUD
    // ========================================

    async getSettlements(
        outletId: string,
        options?: {
            status?: SettlementStatus;
            startDate?: Date;
            endDate?: Date;
            limit?: number;
        },
    ): Promise<SettlementSummary[]> {
        const where: Prisma.PaymentSettlementWhereInput = { outletId };

        if (options?.status) where.status = options.status;
        if (options?.startDate) where.settlementDate = { gte: options.startDate };
        if (options?.endDate) {
            where.settlementDate = {
                ...(where.settlementDate as Prisma.DateTimeFilter ?? {}),
                lte: options.endDate,
            };
        }

        const settlements = await this.prisma.paymentSettlement.findMany({
            where,
            orderBy: { settlementDate: 'desc' },
            take: options?.limit ?? 30,
        });

        return settlements.map(s => this.mapSettlementSummary(s));
    }

    async getSettlementById(id: string): Promise<SettlementSummary> {
        const settlement = await this.prisma.paymentSettlement.findUnique({
            where: { id },
        });

        if (!settlement) {
            throw new NotFoundException(`Settlement ${id} not found`);
        }

        return this.mapSettlementSummary(settlement);
    }

    async createSettlement(data: CreateSettlementDto): Promise<SettlementSummary> {
        const { outletId, periodStart, periodEnd } = data;

        // Calculate totals from transactions
        const transactions = await this.prisma.transaction.findMany({
            where: {
                outletId,
                createdAt: { gte: periodStart, lte: periodEnd },
                status: { in: ['completed', 'refunded'] },
            },
            include: {
                payments: true,
            },
        });

        // Calculate breakdown by payment method
        const breakdownMap = new Map<PaymentMethod, PaymentBreakdown>();

        for (const tx of transactions) {
            const isRefund = tx.transactionType === 'refund';

            for (const payment of tx.payments) {
                if (!breakdownMap.has(payment.paymentMethod)) {
                    breakdownMap.set(payment.paymentMethod, {
                        method: payment.paymentMethod,
                        transactionCount: 0,
                        totalAmount: 0,
                        refundAmount: 0,
                        netAmount: 0,
                    });
                }

                const breakdown = breakdownMap.get(payment.paymentMethod)!;
                breakdown.transactionCount++;

                if (isRefund) {
                    breakdown.refundAmount += Number(payment.amount);
                } else {
                    breakdown.totalAmount += Number(payment.amount);
                }
                breakdown.netAmount = breakdown.totalAmount - breakdown.refundAmount;
            }
        }

        const breakdown = Array.from(breakdownMap.values());

        // Calculate totals
        const grossAmount = breakdown.reduce((sum, b) => sum + b.totalAmount, 0);
        const totalRefunds = breakdown.reduce((sum, b) => sum + b.refundAmount, 0);
        const netAmount = grossAmount - totalRefunds;
        const totalTransactions = transactions.length;

        // Create settlement record
        const settlement = await this.prisma.paymentSettlement.create({
            data: {
                outletId,
                paymentMethod: 'mixed',
                settlementDate: periodStart,
                totalTransactions,
                grossAmount,
                feeAmount: 0,
                netAmount,
                status: 'pending',
                metadata: {
                    periodStart: periodStart.toISOString(),
                    periodEnd: periodEnd.toISOString(),
                    breakdown: breakdown,
                    totalRefunds,
                } as unknown as Prisma.InputJsonValue,
            },
        });

        return this.mapSettlementSummary(settlement);
    }

    async closeSettlement(id: string, data: CloseSettlementDto): Promise<SettlementSummary> {
        const settlement = await this.prisma.paymentSettlement.findUnique({
            where: { id },
        });

        if (!settlement) {
            throw new NotFoundException(`Settlement ${id} not found`);
        }

        const existingMeta = (settlement.metadata as Record<string, unknown>) || {};
        const variance = data.actualCash - Number(settlement.netAmount);

        const updated = await this.prisma.paymentSettlement.update({
            where: { id },
            data: {
                settledAt: new Date(),
                status: Math.abs(variance) < 1 ? 'settled' : 'disputed',
                metadata: {
                    ...existingMeta,
                    actualCash: data.actualCash,
                    variance,
                    notes: data.notes,
                    settledBy: data.employeeId,
                } as unknown as Prisma.InputJsonValue,
            },
        });

        this.logger.log(`Settlement ${id} closed. Variance: ${variance}`);

        return this.mapSettlementSummary(updated);
    }

    async disputeSettlement(id: string, reason: string): Promise<SettlementSummary> {
        const settlement = await this.prisma.paymentSettlement.findUnique({ where: { id } });
        if (!settlement) throw new NotFoundException(`Settlement ${id} not found`);

        const existingMeta = (settlement.metadata as Record<string, unknown>) || {};
        const updated = await this.prisma.paymentSettlement.update({
            where: { id },
            data: {
                status: 'disputed',
                metadata: {
                    ...existingMeta,
                    disputeReason: reason,
                } as unknown as Prisma.InputJsonValue,
            },
        });

        return this.mapSettlementSummary(updated);
    }

    async resolveDispute(id: string, resolution: string, employeeId: string): Promise<SettlementSummary> {
        const settlement = await this.prisma.paymentSettlement.findUnique({ where: { id } });
        if (!settlement) throw new NotFoundException(`Settlement ${id} not found`);

        const existingMeta = (settlement.metadata as Record<string, unknown>) || {};
        const updated = await this.prisma.paymentSettlement.update({
            where: { id },
            data: {
                status: 'settled',
                settledAt: new Date(),
                metadata: {
                    ...existingMeta,
                    resolution,
                    resolvedBy: employeeId,
                } as unknown as Prisma.InputJsonValue,
            },
        });

        return this.mapSettlementSummary(updated);
    }

    // ========================================
    // REPORTS
    // ========================================

    async getSettlementReport(id: string): Promise<SettlementReport> {
        const settlement = await this.prisma.paymentSettlement.findUnique({
            where: { id },
            include: { outlet: true },
        });

        if (!settlement) {
            throw new NotFoundException(`Settlement ${id} not found`);
        }

        const meta = (settlement.metadata as Record<string, unknown>) || {};
        const periodStart = meta.periodStart ? new Date(meta.periodStart as string) : settlement.settlementDate;
        const periodEnd = meta.periodEnd ? new Date(meta.periodEnd as string) : settlement.settlementDate;

        const transactions = await this.prisma.transaction.findMany({
            where: {
                outletId: settlement.outletId,
                createdAt: { gte: periodStart, lte: periodEnd },
                status: { in: ['completed', 'refunded'] },
            },
            include: { payments: true },
            orderBy: { createdAt: 'asc' },
        });

        return {
            outlet: { id: settlement.outlet.id, name: settlement.outlet.name },
            period: { start: periodStart, end: periodEnd },
            summary: this.mapSettlementSummary(settlement),
            transactions: transactions.map(tx => ({
                id: tx.id,
                receiptNumber: tx.receiptNumber,
                grandTotal: Number(tx.grandTotal),
                paymentMethod: tx.payments[0]?.paymentMethod || 'cash',
                createdAt: tx.createdAt,
            })),
        };
    }

    async getMonthlyReport(
        outletId: string,
        year: number,
        month: number,
    ): Promise<{
        month: string;
        totalSales: number;
        totalRefunds: number;
        netSales: number;
        settlementCount: number;
        pendingCount: number;
        disputedCount: number;
    }> {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const settlements = await this.prisma.paymentSettlement.findMany({
            where: {
                outletId,
                settlementDate: { gte: startDate, lte: endDate },
            },
        });

        return {
            month: `${year}-${month.toString().padStart(2, '0')}`,
            totalSales: settlements.reduce((sum, s) => sum + Number(s.grossAmount), 0),
            totalRefunds: settlements.reduce((sum, s) => sum + Number(s.feeAmount), 0),
            netSales: settlements.reduce((sum, s) => sum + Number(s.netAmount), 0),
            settlementCount: settlements.length,
            pendingCount: settlements.filter(s => s.status === 'pending').length,
            disputedCount: settlements.filter(s => s.status === 'disputed').length,
        };
    }

    // ========================================
    // RECONCILIATION
    // ========================================

    async reconcileWithPaymentProvider(
        outletId: string,
        periodStart: Date,
        periodEnd: Date,
        providerData: Array<{ referenceNumber: string; amount: number; status: string }>,
    ): Promise<{
        matched: number;
        unmatched: number;
        discrepancies: Array<{ referenceNumber: string; expected: number; actual: number }>;
    }> {
        const payments = await this.prisma.payment.findMany({
            where: {
                transaction: {
                    outletId,
                    createdAt: { gte: periodStart, lte: periodEnd },
                },
                paymentMethod: { not: 'cash' },
                referenceNumber: { not: null },
            },
        });

        let matched = 0;
        let unmatched = 0;
        const discrepancies: Array<{ referenceNumber: string; expected: number; actual: number }> = [];

        for (const payment of payments) {
            const providerRecord = providerData.find(p => p.referenceNumber === payment.referenceNumber);

            if (!providerRecord) {
                unmatched++;
                discrepancies.push({
                    referenceNumber: payment.referenceNumber!,
                    expected: Number(payment.amount),
                    actual: 0,
                });
            } else if (Math.abs(providerRecord.amount - Number(payment.amount)) > 1) {
                matched++;
                discrepancies.push({
                    referenceNumber: payment.referenceNumber!,
                    expected: Number(payment.amount),
                    actual: providerRecord.amount,
                });
            } else {
                matched++;
            }
        }

        return { matched, unmatched, discrepancies };
    }

    // ========================================
    // PRIVATE HELPERS
    // ========================================

    private mapSettlementSummary(settlement: {
        id: string;
        outletId: string;
        paymentMethod: string;
        settlementDate: Date;
        totalTransactions: number;
        grossAmount: Prisma.Decimal;
        feeAmount: Prisma.Decimal;
        netAmount: Prisma.Decimal;
        status: SettlementStatus;
        referenceNumber: string | null;
        settledAt: Date | null;
        metadata: Prisma.JsonValue;
        createdAt: Date;
        updatedAt: Date;
    }): SettlementSummary {
        return {
            id: settlement.id,
            outletId: settlement.outletId,
            paymentMethod: settlement.paymentMethod,
            settlementDate: settlement.settlementDate,
            totalTransactions: settlement.totalTransactions,
            grossAmount: Number(settlement.grossAmount),
            feeAmount: Number(settlement.feeAmount),
            netAmount: Number(settlement.netAmount),
            status: settlement.status,
            referenceNumber: settlement.referenceNumber || undefined,
            settledAt: settlement.settledAt || undefined,
            metadata: settlement.metadata as unknown as Record<string, unknown>,
        };
    }
}

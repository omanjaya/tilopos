import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { decimalToNumberRequired } from '../../infrastructure/repositories/decimal.helper';

@ApiTags('Settlements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
@Controller('settlements')
export class SettlementsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List settlements with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'outletId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('outletId') outletId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const where: Record<string, unknown> = {
      outlet: { businessId: user.businessId },
    };

    if (outletId) {
      where.outletId = outletId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      const settlementDate: Record<string, Date> = {};
      if (dateFrom) settlementDate.gte = new Date(dateFrom);
      if (dateTo) settlementDate.lte = new Date(dateTo);
      where.settlementDate = settlementDate;
    }

    const settlements = await this.prisma.paymentSettlement.findMany({
      where,
      include: {
        outlet: { select: { id: true, name: true, businessId: true } },
      },
      orderBy: { settlementDate: 'desc' },
    });

    // For each settlement, compute payment breakdown from transactions
    const result = await Promise.all(
      settlements.map(async (s) => {
        const meta = (s.metadata as Record<string, unknown>) || {};
        const breakdown =
          (meta.breakdown as Array<{
            method: string;
            transactionCount: number;
            totalAmount: number;
            netAmount: number;
          }>) || [];

        const grossAmount = decimalToNumberRequired(s.grossAmount);
        const netAmount = decimalToNumberRequired(s.netAmount);

        // Calculate cash vs non-cash from breakdown
        let cashAmount = 0;
        let nonCashAmount = 0;
        const paymentBreakdown: Array<{
          method: string;
          amount: number;
          transactionCount: number;
        }> = [];

        if (breakdown.length > 0) {
          for (const b of breakdown) {
            const amount = b.netAmount ?? b.totalAmount ?? 0;
            if (b.method === 'cash') {
              cashAmount += amount;
            } else {
              nonCashAmount += amount;
            }
            paymentBreakdown.push({
              method: b.method,
              amount,
              transactionCount: b.transactionCount ?? 0,
            });
          }
        } else {
          // Fallback: if no breakdown, use paymentMethod field
          if (s.paymentMethod === 'cash') {
            cashAmount = grossAmount;
          } else {
            nonCashAmount = grossAmount;
          }
          paymentBreakdown.push({
            method: s.paymentMethod,
            amount: grossAmount,
            transactionCount: s.totalTransactions,
          });
        }

        return {
          id: s.id,
          date: s.settlementDate.toISOString(),
          outletId: s.outletId,
          outletName: s.outlet.name,
          totalSales: grossAmount,
          cashAmount,
          nonCashAmount,
          settledAmount: s.status === 'settled' ? netAmount : 0,
          status: s.status,
          paymentBreakdown,
          notes: (meta.notes as string) || null,
          settledAt: s.settledAt ? s.settledAt.toISOString() : null,
          settledBy: (meta.settledBy as string) || null,
          businessId: s.outlet.businessId,
          createdAt: s.createdAt.toISOString(),
        };
      }),
    );

    return result;
  }

  // ======================================================================
  // RECONCILIATION REPORT
  // ======================================================================

  @Get('reconciliation')
  @ApiOperation({
    summary: 'Get payment reconciliation report',
    description:
      'Compares total transactions amount, total payments received by method, total settlements processed, and identifies discrepancies and unmatched payments.',
  })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'outletId', required: false, description: 'Filter by outlet' })
  async getReconciliationReport(
    @CurrentUser() user: AuthUser,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('outletId') outletId?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Build outlet filter
    const outletFilter = outletId ? { outletId } : { outlet: { businessId: user.businessId } };

    // 1. Total transactions amount (completed sales)
    const transactions = await this.prisma.transaction.findMany({
      where: {
        ...outletFilter,
        createdAt: { gte: start, lte: end },
        status: { in: ['completed', 'refunded'] },
      },
      select: {
        id: true,
        grandTotal: true,
        transactionType: true,
        status: true,
        receiptNumber: true,
      },
    });

    let totalSalesAmount = 0;
    let totalRefundsAmount = 0;
    let salesCount = 0;
    let refundsCount = 0;

    for (const tx of transactions) {
      const amount = decimalToNumberRequired(tx.grandTotal);
      if (tx.transactionType === 'refund') {
        totalRefundsAmount += amount;
        refundsCount++;
      } else {
        totalSalesAmount += amount;
        salesCount++;
      }
    }

    const netTransactionsAmount = totalSalesAmount - totalRefundsAmount;

    // 2. Total payments received (by method)
    const transactionIds = transactions.map((t) => t.id);
    const payments =
      transactionIds.length > 0
        ? await this.prisma.payment.findMany({
            where: {
              transactionId: { in: transactionIds },
              status: 'completed',
            },
            select: {
              id: true,
              transactionId: true,
              paymentMethod: true,
              amount: true,
              referenceNumber: true,
            },
          })
        : [];

    // Group payments by method
    const paymentsByMethod: Record<string, { count: number; total: number }> = {};
    let totalPaymentsReceived = 0;

    for (const payment of payments) {
      const method = payment.paymentMethod;
      const amount = decimalToNumberRequired(payment.amount);
      if (!paymentsByMethod[method]) {
        paymentsByMethod[method] = { count: 0, total: 0 };
      }
      paymentsByMethod[method].count++;
      paymentsByMethod[method].total += amount;
      totalPaymentsReceived += amount;
    }

    // 3. Total settlements processed
    const settlements = await this.prisma.paymentSettlement.findMany({
      where: {
        ...outletFilter,
        settlementDate: { gte: start, lte: end },
      },
      select: {
        id: true,
        status: true,
        grossAmount: true,
        netAmount: true,
        feeAmount: true,
        paymentMethod: true,
        totalTransactions: true,
      },
    });

    let totalSettledGross = 0;
    let totalSettledNet = 0;
    let settledCount = 0;
    let pendingCount = 0;
    let disputedCount = 0;

    for (const s of settlements) {
      const gross = decimalToNumberRequired(s.grossAmount);
      const net = decimalToNumberRequired(s.netAmount);
      totalSettledGross += gross;
      totalSettledNet += net;
      if (s.status === 'settled') settledCount++;
      else if (s.status === 'pending') pendingCount++;
      else if (s.status === 'disputed') disputedCount++;
    }

    // 4. Discrepancies
    const transactionVsPaymentDiff =
      Math.round((netTransactionsAmount - totalPaymentsReceived) * 100) / 100;
    const paymentVsSettlementDiff =
      Math.round((totalPaymentsReceived - totalSettledGross) * 100) / 100;

    // 5. Unmatched payments - transactions with no payments
    const transactionIdsWithPayments = new Set(payments.map((p) => p.transactionId));
    const unmatchedTransactions = transactions
      .filter((t) => !transactionIdsWithPayments.has(t.id) && t.transactionType !== 'refund')
      .map((t) => ({
        transactionId: t.id,
        receiptNumber: t.receiptNumber,
        amount: decimalToNumberRequired(t.grandTotal),
        issue: 'No payment record found',
      }));

    return {
      dateRange: { startDate: start.toISOString(), endDate: end.toISOString() },
      transactions: {
        salesCount,
        refundsCount,
        totalSalesAmount,
        totalRefundsAmount,
        netTransactionsAmount,
      },
      payments: {
        totalPaymentsReceived,
        byMethod: Object.entries(paymentsByMethod).map(([method, data]) => ({
          method,
          count: data.count,
          total: Math.round(data.total * 100) / 100,
        })),
      },
      settlements: {
        totalSettlements: settlements.length,
        settledCount,
        pendingCount,
        disputedCount,
        totalSettledGross,
        totalSettledNet,
      },
      discrepancies: {
        transactionVsPaymentDiff,
        paymentVsSettlementDiff,
        hasDiscrepancy:
          Math.abs(transactionVsPaymentDiff) > 1 || Math.abs(paymentVsSettlementDiff) > 1,
      },
      unmatchedPayments: unmatchedTransactions,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get settlement by ID' })
  async get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const s = await this.prisma.paymentSettlement.findUnique({
      where: { id },
      include: {
        outlet: { select: { id: true, name: true, businessId: true } },
      },
    });

    if (!s || s.outlet.businessId !== user.businessId) {
      throw new NotFoundException('Settlement not found');
    }

    const meta = (s.metadata as Record<string, unknown>) || {};
    const breakdown =
      (meta.breakdown as Array<{
        method: string;
        transactionCount: number;
        totalAmount: number;
        netAmount: number;
      }>) || [];

    const grossAmount = decimalToNumberRequired(s.grossAmount);
    const netAmount = decimalToNumberRequired(s.netAmount);

    let cashAmount = 0;
    let nonCashAmount = 0;
    const paymentBreakdown: Array<{ method: string; amount: number; transactionCount: number }> =
      [];

    if (breakdown.length > 0) {
      for (const b of breakdown) {
        const amount = b.netAmount ?? b.totalAmount ?? 0;
        if (b.method === 'cash') {
          cashAmount += amount;
        } else {
          nonCashAmount += amount;
        }
        paymentBreakdown.push({
          method: b.method,
          amount,
          transactionCount: b.transactionCount ?? 0,
        });
      }
    } else {
      if (s.paymentMethod === 'cash') {
        cashAmount = grossAmount;
      } else {
        nonCashAmount = grossAmount;
      }
      paymentBreakdown.push({
        method: s.paymentMethod,
        amount: grossAmount,
        transactionCount: s.totalTransactions,
      });
    }

    return {
      id: s.id,
      date: s.settlementDate.toISOString(),
      outletId: s.outletId,
      outletName: s.outlet.name,
      totalSales: grossAmount,
      cashAmount,
      nonCashAmount,
      settledAmount: s.status === 'settled' ? netAmount : 0,
      status: s.status,
      paymentBreakdown,
      notes: (meta.notes as string) || null,
      settledAt: s.settledAt ? s.settledAt.toISOString() : null,
      settledBy: (meta.settledBy as string) || null,
      businessId: s.outlet.businessId,
      createdAt: s.createdAt.toISOString(),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new settlement' })
  async create(
    @Body()
    dto: {
      outletId: string;
      paymentMethod: string;
      settlementDate: string;
      totalTransactions: number;
      grossAmount: number;
      feeAmount: number;
      netAmount: number;
      referenceNumber?: string;
    },
  ) {
    return this.prisma.paymentSettlement.create({
      data: {
        outletId: dto.outletId,
        paymentMethod: dto.paymentMethod,
        settlementDate: new Date(dto.settlementDate),
        totalTransactions: dto.totalTransactions,
        grossAmount: dto.grossAmount,
        feeAmount: dto.feeAmount,
        netAmount: dto.netAmount,
        referenceNumber: dto.referenceNumber || null,
      },
    });
  }

  // Frontend calls POST /settlements/:id/settle
  @Post(':id/settle')
  @ApiOperation({ summary: 'Confirm settlement (POST)' })
  async settlePost(
    @Param('id') id: string,
    @Body() dto?: { notes?: string },
    @CurrentUser() user?: AuthUser,
  ) {
    const settlement = await this.prisma.paymentSettlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('Settlement not found');

    const existingMeta = (settlement.metadata as Record<string, unknown>) || {};

    return this.prisma.paymentSettlement.update({
      where: { id },
      data: {
        status: 'settled',
        settledAt: new Date(),
        metadata: {
          ...existingMeta,
          ...(dto?.notes && { notes: dto.notes }),
          ...(user && { settledBy: user.employeeId }),
        },
      },
    });
  }

  // Also support PUT for backwards compatibility
  @Put(':id/settle')
  @ApiOperation({ summary: 'Confirm settlement (PUT)' })
  async settlePut(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const settlement = await this.prisma.paymentSettlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('Settlement not found');

    const existingMeta = (settlement.metadata as Record<string, unknown>) || {};

    return this.prisma.paymentSettlement.update({
      where: { id },
      data: {
        status: 'settled',
        settledAt: new Date(),
        metadata: {
          ...existingMeta,
          settledBy: user.employeeId,
        },
      },
    });
  }

  // Frontend calls POST /settlements/:id/dispute
  @Post(':id/dispute')
  @ApiOperation({ summary: 'Dispute settlement (POST)' })
  async disputePost(@Param('id') id: string, @Body() dto?: { reason?: string }) {
    const settlement = await this.prisma.paymentSettlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('Settlement not found');

    const existingMeta = (settlement.metadata as Record<string, unknown>) || {};

    return this.prisma.paymentSettlement.update({
      where: { id },
      data: {
        status: 'disputed',
        metadata: {
          ...existingMeta,
          ...(dto?.reason && { disputeReason: dto.reason }),
        },
      },
    });
  }

  // Also support PUT for backwards compatibility
  @Put(':id/dispute')
  @ApiOperation({ summary: 'Dispute settlement (PUT)' })
  async disputePut(@Param('id') id: string) {
    const settlement = await this.prisma.paymentSettlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('Settlement not found');

    return this.prisma.paymentSettlement.update({
      where: { id },
      data: { status: 'disputed' },
    });
  }
}

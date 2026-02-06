import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/roles.guard';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { getDateRange } from '../utils/date-range.util';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class PromotionReportsController {
  private readonly logger = new Logger(PromotionReportsController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get('promotions')
  @ApiOperation({
    summary: 'Promotion effectiveness report (revenue, discount, usage, basket size)',
  })
  async promotionReport(
    @CurrentUser() user: AuthUser,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const promotions = await this.prisma.promotion.findMany({
      where: {
        businessId: user.businessId,
        validFrom: { lte: end },
        validUntil: { gte: start },
      },
      include: {
        vouchers: {
          where: {
            usedAt: { gte: start, lte: end },
          },
          select: {
            id: true,
            code: true,
            initialValue: true,
            remainingValue: true,
            usedAt: true,
          },
        },
      },
    });

    // Get all completed transactions in the period for basket size analysis
    const allTransactions = await this.prisma.transaction.findMany({
      where: {
        outlet: { businessId: user.businessId },
        transactionType: 'sale',
        status: 'completed',
        createdAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        grandTotal: true,
        discountAmount: true,
        items: {
          select: { quantity: true },
        },
      },
    });

    // Separate transactions with and without discounts for basket analysis
    const withDiscount = allTransactions.filter((tx) => tx.discountAmount.toNumber() > 0);
    const withoutDiscount = allTransactions.filter((tx) => tx.discountAmount.toNumber() === 0);

    const avgBasketWithPromo =
      withDiscount.length > 0
        ? Math.round(
            (withDiscount.reduce((s, tx) => s + tx.grandTotal.toNumber(), 0) /
              withDiscount.length) *
              100,
          ) / 100
        : 0;

    const avgBasketWithoutPromo =
      withoutDiscount.length > 0
        ? Math.round(
            (withoutDiscount.reduce((s, tx) => s + tx.grandTotal.toNumber(), 0) /
              withoutDiscount.length) *
              100,
          ) / 100
        : 0;

    const avgItemsWithPromo =
      withDiscount.length > 0
        ? Math.round(
            (withDiscount.reduce(
              (s, tx) => s + tx.items.reduce((is, i) => is + i.quantity.toNumber(), 0),
              0,
            ) /
              withDiscount.length) *
              10,
          ) / 10
        : 0;

    const avgItemsWithoutPromo =
      withoutDiscount.length > 0
        ? Math.round(
            (withoutDiscount.reduce(
              (s, tx) => s + tx.items.reduce((is, i) => is + i.quantity.toNumber(), 0),
              0,
            ) /
              withoutDiscount.length) *
              10,
          ) / 10
        : 0;

    const report = promotions.map((promo) => {
      const vouchersUsed = promo.vouchers.filter((v) => v.usedAt !== null);
      const totalDiscountGiven = vouchersUsed.reduce((sum, v) => {
        const initial = v.initialValue?.toNumber() || 0;
        const remaining = v.remainingValue?.toNumber() || 0;
        return sum + (initial - remaining);
      }, 0);

      // Estimate revenue attributed to this promotion
      const revenueByPromo = vouchersUsed.reduce((sum, v) => {
        return sum + (v.initialValue?.toNumber() || 0);
      }, 0);

      return {
        promotionId: promo.id,
        name: promo.name,
        discountType: promo.discountType,
        discountValue: promo.discountValue.toNumber(),
        validFrom: promo.validFrom,
        validUntil: promo.validUntil,
        usageLimit: promo.usageLimit,
        usedCount: promo.usedCount,
        vouchersRedeemed: vouchersUsed.length,
        totalDiscountGiven,
        revenueAttributed: revenueByPromo,
        isActive: promo.isActive,
        utilizationRate: promo.usageLimit
          ? Math.round((promo.usedCount / promo.usageLimit) * 100 * 10) / 10
          : null,
      };
    });

    report.sort((a, b) => b.usedCount - a.usedCount);

    const topPerforming = [...report]
      .sort((a, b) => b.revenueAttributed - a.revenueAttributed)
      .slice(0, 5);

    return {
      period: { start, end },
      promotions: report,
      summary: {
        totalPromotions: report.length,
        totalRedemptions: report.reduce((s, p) => s + p.usedCount, 0),
        totalDiscountGiven: report.reduce((s, p) => s + p.totalDiscountGiven, 0),
        totalRevenueAttributed: report.reduce((s, p) => s + p.revenueAttributed, 0),
      },
      basketSizeAnalysis: {
        avgBasketWithPromo,
        avgBasketWithoutPromo,
        avgItemsWithPromo,
        avgItemsWithoutPromo,
        transactionsWithPromo: withDiscount.length,
        transactionsWithoutPromo: withoutDiscount.length,
      },
      topPerformingPromotions: topPerforming.map((p) => ({
        promotionId: p.promotionId,
        name: p.name,
        usedCount: p.usedCount,
        revenueAttributed: p.revenueAttributed,
        totalDiscountGiven: p.totalDiscountGiven,
      })),
    };
  }
}

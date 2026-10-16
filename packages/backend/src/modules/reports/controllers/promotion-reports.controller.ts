import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TenantAccessService } from '@shared/tenant';
import { AnalyticsQueriesService } from '../../../infrastructure/services/analytics-queries.service';
import { ReportQueryDto } from '../../../application/dtos/report-query.dto';
import { getDateRange } from '../utils/date-range.util';

/** Promotions listed per report (R13). */
const MAX_PROMOTIONS = 200;

@ApiTags('Reports')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class PromotionReportsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantAccessService,
    private readonly queries: AnalyticsQueriesService,
  ) {}

  @Get('promotions')
  @ApiOperation({
    summary: 'Promotion effectiveness report (revenue, discount, usage, basket size)',
  })
  async promotionReport(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { dateRange, startDate, endDate } = query;
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const promotions = await this.prisma.promotion.findMany({
      where: {
        businessId: user.businessId,
        validFrom: { lte: end },
        validUntil: { gte: start },
      },
      select: {
        id: true,
        name: true,
        discountType: true,
        discountValue: true,
        validFrom: true,
        validUntil: true,
        usageLimit: true,
        usedCount: true,
        isActive: true,
      },
      orderBy: { usedCount: 'desc' },
      take: MAX_PROMOTIONS,
    });

    // Voucher redemptions in the period, counted per promotion in SQL
    const promotionIds = promotions.map((p) => p.id);
    const redemptions =
      promotionIds.length > 0
        ? await this.prisma.voucher.groupBy({
            by: ['promotionId'],
            where: {
              businessId: user.businessId,
              promotionId: { in: promotionIds },
              usedAt: { gte: start, lte: end },
            },
            _count: { _all: true },
          })
        : [];
    const redemptionMap = new Map(redemptions.map((r) => [r.promotionId, r._count._all]));

    // Basket analysis aggregated in SQL (F0986)
    const outletIds = await this.tenant.resolveOutletIds(user);
    const basket = await this.queries.basketByDiscount({ outletIds, start, end });

    const report = promotions.map((promo) => ({
      promotionId: promo.id,
      name: promo.name,
      discountType: promo.discountType,
      discountValue: promo.discountValue.toNumber(),
      validFrom: promo.validFrom,
      validUntil: promo.validUntil,
      usageLimit: promo.usageLimit,
      usedCount: promo.usedCount,
      vouchersRedeemed: redemptionMap.get(promo.id) ?? 0,
      // Transactions do not record which promotion produced a discount, so the
      // discount given / revenue per promotion is unknown: null, not a fake 0 (F0985)
      totalDiscountGiven: null as number | null,
      revenueAttributed: null as number | null,
      isActive: promo.isActive,
      utilizationRate: promo.usageLimit
        ? Math.round((promo.usedCount / promo.usageLimit) * 100 * 10) / 10
        : null,
    }));

    report.sort((a, b) => b.usedCount - a.usedCount);

    const topPerforming = report.slice(0, 5);

    return {
      period: { start, end },
      promotions: report,
      summary: {
        totalPromotions: report.length,
        totalRedemptions: report.reduce((s, p) => s + p.usedCount, 0),
        totalDiscountGiven: null,
        totalRevenueAttributed: null,
      },
      basketSizeAnalysis: {
        avgBasketWithPromo: Math.round(basket.withDiscount.avgTotal * 100) / 100,
        avgBasketWithoutPromo: Math.round(basket.withoutDiscount.avgTotal * 100) / 100,
        avgItemsWithPromo: Math.round(basket.withDiscount.avgItems * 10) / 10,
        avgItemsWithoutPromo: Math.round(basket.withoutDiscount.avgItems * 10) / 10,
        transactionsWithPromo: basket.withDiscount.count,
        transactionsWithoutPromo: basket.withoutDiscount.count,
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

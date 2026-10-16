import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { TenantAccessService } from '@shared/tenant';
import { AnalyticsQueriesService } from '../../../infrastructure/services/analytics-queries.service';
import { ReportQueryDto } from '../../../application/dtos/report-query.dto';
import { getDateRange } from '../utils/date-range.util';
import { REPORT_CACHE_TTL_SECONDS } from '../utils/report-cache';

/** Products listed in the report (R13). */
const MAX_TOP_PRODUCTS = 200;

@ApiTags('Reports')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports')
export class ProductReportsController {
  private readonly CACHE_TTL = REPORT_CACHE_TTL_SECONDS;

  constructor(
    private readonly redis: RedisService,
    private readonly tenant: TenantAccessService,
    private readonly queries: AnalyticsQueriesService,
  ) {}

  @Get('products')
  @ApiOperation({ summary: 'Product sales report (top products by revenue and quantity)' })
  async productReport(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    const { dateRange, startDate, endDate } = query;
    const { start, end } = getDateRange(dateRange, startDate, endDate);

    const cacheKey = `report:products:${outletId}:${dateRange}:${startDate}:${endDate}`;
    const cached = await this.redis.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const scope = { outletIds: [outletId], start, end };
    // Grouped per product in SQL; revenue = item subtotal (after item discount),
    // deleted products keep their snapshotted name (F0977/F0978)
    const [rows, totals] = await Promise.all([
      this.queries.itemSales(scope, { limit: MAX_TOP_PRODUCTS }),
      this.queries.itemTotals(scope),
    ]);

    const topProducts = rows.map((r) => ({
      productId: r.productId ?? '',
      name: r.productName,
      category: r.categoryName,
      quantitySold: r.quantity,
      revenue: Math.round(r.revenue * 100) / 100,
    }));

    const result = {
      topProducts,
      totalProducts: totals.products,
      totalQuantitySold: totals.quantity,
    };

    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }
}

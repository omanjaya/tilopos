import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { TenantAccessService } from '@shared/tenant';
import { AnalyticsService } from '../../../infrastructure/services/analytics.service';
import {
  AnalyticsProductsQueryDto,
  ReportQueryDto,
} from '../../../application/dtos/report-query.dto';
import { getDateRange } from '../utils/date-range.util';
import { canViewCostData } from '../utils/report-access';

@ApiTags('Analytics')
@ApiBearerAuth()
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports/analytics')
export class AnalyticsController {
  constructor(
    private readonly tenant: TenantAccessService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('sales')
  @ApiOperation({ summary: 'Sales metrics with growth comparison' })
  async salesMetrics(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { startDate, endDate } = query;
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    const { start, end } = getDateRange(undefined, startDate, endDate);
    return this.analyticsService.getSalesMetrics(outletId, { start, end });
  }

  @Get('products')
  @ApiOperation({ summary: 'Product analytics — top/low performers, categories, product mix' })
  async productAnalytics(@CurrentUser() user: AuthUser, @Query() query: AnalyticsProductsQueryDto) {
    const { startDate, endDate } = query;
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    const { start, end } = getDateRange(undefined, startDate, endDate);
    return this.analyticsService.getProductAnalytics(
      outletId,
      { start, end },
      query.limit ?? 10,
      canViewCostData(user.role),
    );
  }

  @Get('time')
  @ApiOperation({ summary: 'Time-based analytics — hourly, daily, weekly, monthly' })
  async timeAnalytics(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { startDate, endDate } = query;
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    const { start, end } = getDateRange(undefined, startDate, endDate);
    return this.analyticsService.getTimeAnalytics(outletId, { start, end });
  }

  @Get('customers')
  @ApiOperation({ summary: 'Customer analytics — CLV, churn risk, loyalty tiers' })
  async customerAnalytics(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { startDate, endDate } = query;
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    const { start, end } = getDateRange(undefined, startDate, endDate);
    return this.analyticsService.getCustomerAnalytics(outletId, { start, end });
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Inventory analytics — stock value, turnover, reorder suggestions' })
  async inventoryAnalytics(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    return this.analyticsService.getInventoryAnalytics(outletId);
  }

  @Get('employees')
  @ApiOperation({ summary: 'Employee analytics — top performers, sales breakdown, shifts' })
  async employeeAnalytics(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { startDate, endDate } = query;
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    const { start, end } = getDateRange(undefined, startDate, endDate);
    return this.analyticsService.getEmployeeAnalytics(
      outletId,
      { start, end },
      canViewCostData(user.role),
    );
  }

  @Get('predictions')
  @ApiOperation({ summary: 'Predictive insights — demand forecast, revenue projection, anomalies' })
  async predictiveInsights(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { startDate, endDate } = query;
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    const { start, end } = getDateRange(undefined, startDate, endDate);
    return this.analyticsService.getPredictiveInsights(outletId, { start, end });
  }

  @Get('comprehensive')
  @ApiOperation({ summary: 'Comprehensive report — all analytics in one call' })
  async comprehensiveReport(@CurrentUser() user: AuthUser, @Query() query: ReportQueryDto) {
    const { startDate, endDate } = query;
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    const { start, end } = getDateRange(undefined, startDate, endDate);
    return this.analyticsService.generateReport(
      outletId,
      { start, end },
      canViewCostData(user.role),
    );
  }
}

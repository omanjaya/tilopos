import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/roles.guard';
import { Roles } from '../../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../../shared/constants/roles';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AnalyticsService } from '../../../infrastructure/services/analytics.service';
import { getDateRange } from '../utils/date-range.util';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER, EmployeeRole.SUPERVISOR)
@Controller('reports/analytics')
export class AnalyticsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  private async validateOutlet(outletId: string, businessId: string) {
    if (!outletId) {
      throw new BadRequestException('outletId is required');
    }
    const outlet = await this.prisma.outlet.findUnique({
      where: { id: outletId },
      select: { id: true, businessId: true },
    });
    if (!outlet) {
      throw new NotFoundException(`Outlet with ID ${outletId} not found`);
    }
    if (outlet.businessId !== businessId) {
      throw new ForbiddenException('Access denied to this outlet');
    }
  }

  @Get('sales')
  @ApiOperation({ summary: 'Sales metrics with growth comparison' })
  async salesMetrics(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    await this.validateOutlet(outletId, user.businessId);
    const { start, end } = getDateRange(undefined, startDate, endDate);
    return this.analyticsService.getSalesMetrics(outletId, { start, end });
  }

  @Get('products')
  @ApiOperation({ summary: 'Product analytics — top/low performers, categories, product mix' })
  async productAnalytics(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    await this.validateOutlet(outletId, user.businessId);
    const { start, end } = getDateRange(undefined, startDate, endDate);
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.analyticsService.getProductAnalytics(outletId, { start, end }, parsedLimit);
  }

  @Get('time')
  @ApiOperation({ summary: 'Time-based analytics — hourly, daily, weekly, monthly' })
  async timeAnalytics(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    await this.validateOutlet(outletId, user.businessId);
    const { start, end } = getDateRange(undefined, startDate, endDate);
    return this.analyticsService.getTimeAnalytics(outletId, { start, end });
  }

  @Get('customers')
  @ApiOperation({ summary: 'Customer analytics — CLV, churn risk, loyalty tiers' })
  async customerAnalytics(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    await this.validateOutlet(outletId, user.businessId);
    const { start, end } = getDateRange(undefined, startDate, endDate);
    return this.analyticsService.getCustomerAnalytics(outletId, { start, end });
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Inventory analytics — stock value, turnover, reorder suggestions' })
  async inventoryAnalytics(@CurrentUser() user: AuthUser, @Query('outletId') outletId: string) {
    await this.validateOutlet(outletId, user.businessId);
    return this.analyticsService.getInventoryAnalytics(outletId);
  }

  @Get('employees')
  @ApiOperation({ summary: 'Employee analytics — top performers, sales breakdown, shifts' })
  async employeeAnalytics(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    await this.validateOutlet(outletId, user.businessId);
    const { start, end } = getDateRange(undefined, startDate, endDate);
    return this.analyticsService.getEmployeeAnalytics(outletId, { start, end });
  }

  @Get('predictions')
  @ApiOperation({ summary: 'Predictive insights — demand forecast, revenue projection, anomalies' })
  async predictiveInsights(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    await this.validateOutlet(outletId, user.businessId);
    const { start, end } = getDateRange(undefined, startDate, endDate);
    return this.analyticsService.getPredictiveInsights(outletId, { start, end });
  }

  @Get('comprehensive')
  @ApiOperation({ summary: 'Comprehensive report — all analytics in one call' })
  async comprehensiveReport(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    await this.validateOutlet(outletId, user.businessId);
    const { start, end } = getDateRange(undefined, startDate, endDate);
    return this.analyticsService.generateReport(outletId, { start, end });
  }
}

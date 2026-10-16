import { Controller, Post, Body, Get, Query, Put, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { TenantAccessService } from '../../shared/tenant';
import { startOfBusinessDay } from '../../shared/utils/business-time';
import { BumpOrderUseCase } from '../../application/use-cases/kds/bump-order.use-case';
import { GetStationOrdersUseCase } from '../../application/use-cases/kds/get-station-orders.use-case';
import { KdsAnalyticsService } from './kds-analytics.service';
import { KdsService } from './kds.service';
import {
  BumpOrderDto,
  CookingTimerSettingsDto,
  KdsAnalyticsQueryDto,
  KdsOrdersQueryDto,
  KdsOutletQueryDto,
  KdsPerformanceQueryDto,
  MarkItemPreparingDto,
  RecallItemDto,
} from './dto/kds.dto';

/** Kitchen actions: kitchen staff and supervisors up. */
const KITCHEN_ROLES = [
  EmployeeRole.KITCHEN,
  EmployeeRole.SUPERVISOR,
  EmployeeRole.MANAGER,
  EmployeeRole.OWNER,
];

const PRIORITY_MAP: Record<string, number> = { normal: 0, urgent: 5, vip: 10 };

@ApiTags('KDS')
@ApiBearerAuth()
@Controller('kds')
export class KdsController {
  constructor(
    private readonly bumpOrderUseCase: BumpOrderUseCase,
    private readonly getStationOrdersUseCase: GetStationOrdersUseCase,
    private readonly analyticsService: KdsAnalyticsService,
    private readonly kdsService: KdsService,
    private readonly tenant: TenantAccessService,
  ) {}

  @Post('bump')
  @Roles(...KITCHEN_ROLES)
  @ApiOperation({ summary: 'Bump an order item (mark as ready)' })
  async bumpOrder(@Body() dto: BumpOrderDto, @CurrentUser() user: AuthUser) {
    return this.bumpOrderUseCase.execute({
      orderItemId: dto.orderItemId,
      businessId: user.businessId,
      employeeId: user.employeeId,
      station: dto.station,
    });
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get order items for the KDS display of one outlet' })
  async getStationOrders(@Query() query: KdsOrdersQueryDto, @CurrentUser() user: AuthUser) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    const result = await this.getStationOrdersUseCase.execute({
      outletId,
      station: query.station,
      status: query.status,
      includeCompleted: query.includeCompleted === true,
    });

    if (query.priority) {
      const targetPriority = PRIORITY_MAP[query.priority];
      const items = result.items.filter((item) => item.priority === targetPriority);
      const served = items.filter((i) => i.status === 'served').length;
      return {
        items,
        summary: {
          total: items.length,
          pending: items.filter((i) => i.status === 'pending').length,
          preparing: items.filter((i) => i.status === 'preparing').length,
          ready: items.filter((i) => i.status === 'ready').length,
          served,
          completed: served,
        },
      };
    }

    return result;
  }

  @Get('stations')
  @ApiOperation({ summary: 'Get available stations for an outlet' })
  async getAvailableStations(@Query() query: KdsOutletQueryDto, @CurrentUser() user: AuthUser) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    return this.getStationOrdersUseCase.getAvailableStations(outletId);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Kitchen analytics for one business day (Asia/Jakarta)' })
  async getAnalytics(@Query() query: KdsAnalyticsQueryDto, @CurrentUser() user: AuthUser) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    return this.analyticsService.getAnalytics(outletId, user.businessId, query.date);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Kitchen performance report (max 92 days)' })
  async getPerformanceReport(
    @Query() query: KdsPerformanceQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    const start = query.startDate ? new Date(query.startDate) : startOfBusinessDay();
    const end = query.endDate ? new Date(query.endDate) : new Date();
    return this.analyticsService.getPerformanceReport(outletId, user.businessId, start, end);
  }

  @Put('items/:id/preparing')
  @Roles(...KITCHEN_ROLES)
  @ApiOperation({ summary: 'Mark order item as preparing' })
  async markItemPreparing(
    @Param('id', ParseUUIDPipe) orderItemId: string,
    @Body() dto: MarkItemPreparingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.analyticsService.markItemPreparing(orderItemId, user.businessId, dto.station);
  }

  @Put('items/:id/ready')
  @Roles(...KITCHEN_ROLES)
  @ApiOperation({ summary: 'Mark order item as ready (same as POST /kds/bump)' })
  async markItemReady(
    @Param('id', ParseUUIDPipe) orderItemId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bumpOrderUseCase.execute({
      orderItemId,
      businessId: user.businessId,
      employeeId: user.employeeId,
    });
  }

  @Put('items/:id/recall')
  @Roles(...KITCHEN_ROLES)
  @ApiOperation({ summary: 'Recall order item (send back for re-preparation)' })
  async recallItem(
    @Param('id', ParseUUIDPipe) orderItemId: string,
    @Body() dto: RecallItemDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.analyticsService.recallItem(orderItemId, user.businessId, dto.reason);
  }

  // ======================================================================
  // COOKING TIMER SETTINGS
  // ======================================================================

  @Get('timer-settings')
  @ApiOperation({ summary: 'Get cooking timer SLA settings per order type' })
  async getTimerSettings(@CurrentUser() user: AuthUser) {
    return this.kdsService.getCookingTimerSettings(user.businessId);
  }

  @Put('timer-settings')
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @ApiOperation({ summary: 'Update cooking timer SLA settings (dine-in, takeaway, delivery)' })
  async updateTimerSettings(@CurrentUser() user: AuthUser, @Body() dto: CookingTimerSettingsDto) {
    return this.kdsService.updateCookingTimerSettings(user.businessId, {
      dineIn: dto.dineIn,
      takeaway: dto.takeaway,
      delivery: dto.delivery,
    });
  }

  // ======================================================================
  // OVERDUE ORDERS
  // ======================================================================

  @Get('overdue')
  @ApiOperation({ summary: 'Get orders exceeding SLA cooking time' })
  async getOverdueOrders(@CurrentUser() user: AuthUser, @Query() query: KdsOutletQueryDto) {
    const outletId = await this.tenant.assertOutlet(user, query.outletId);
    return this.kdsService.getOverdueOrders(user.businessId, outletId);
  }

  // ======================================================================
  // NOTIFY CASHIER ORDER READY
  // ======================================================================

  @Post('orders/:id/notify-ready')
  @Roles(...KITCHEN_ROLES)
  @ApiOperation({ summary: 'Notify cashier that an order is ready (WebSocket event)' })
  async notifyOrderReady(
    @Param('id', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.kdsService.notifyCashierOrderReady(orderId, user.businessId);
  }
}

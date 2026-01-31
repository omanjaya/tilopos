import { Controller, Post, Body, UseGuards, Get, Query, Put, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { BumpOrderUseCase } from '../../application/use-cases/kds/bump-order.use-case';
import { GetStationOrdersUseCase } from '../../application/use-cases/kds/get-station-orders.use-case';
import { KitchenStation } from './kds.gateway';
import { KdsAnalyticsService } from './kds-analytics.service';
import { KdsService, type CookingTimerSettings } from './kds.service';

@ApiTags('KDS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kds')
export class KdsController {
  constructor(
    private readonly bumpOrderUseCase: BumpOrderUseCase,
    private readonly getStationOrdersUseCase: GetStationOrdersUseCase,
    private readonly analyticsService: KdsAnalyticsService,
    private readonly kdsService: KdsService,
  ) { }

  @Post('bump')
  @ApiOperation({ summary: 'Bump an order item (mark as completed)' })
  async bumpOrder(@Body() dto: { orderItemId: string; station: string }, @CurrentUser() user: AuthUser) {
    return this.bumpOrderUseCase.execute({
      orderItemId: dto.orderItemId,
      employeeId: user.employeeId,
      station: dto.station,
    });
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get orders for KDS display, optionally filtered by priority' })
  @ApiQuery({ name: 'outletId', required: true, type: String })
  @ApiQuery({ name: 'station', required: false, enum: ['grill', 'fryer', 'cold', 'hot', 'drinks', 'dessert', 'general'] })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'preparing', 'ready', 'completed'] })
  @ApiQuery({ name: 'priority', required: false, enum: ['normal', 'urgent', 'vip'], description: 'Filter by priority level' })
  @ApiQuery({ name: 'includeCompleted', required: false, type: Boolean })
  async getStationOrders(
    @Query('outletId') outletId: string,
    @Query('station') station?: KitchenStation,
    @Query('status') status?: string,
    @Query('priority') priority?: 'normal' | 'urgent' | 'vip',
    @Query('includeCompleted') includeCompleted?: boolean,
  ) {
    const result = await this.getStationOrdersUseCase.execute({
      outletId,
      station,
      status,
      includeCompleted: includeCompleted === true,
    });

    if (priority) {
      const priorityMap: Record<string, number> = { normal: 0, urgent: 5, vip: 10 };
      const targetPriority = priorityMap[priority];
      const filteredItems = result.items.filter(
        (item) => item.priority === targetPriority,
      );
      return {
        items: filteredItems,
        summary: {
          total: filteredItems.length,
          pending: filteredItems.filter((i) => i.status === 'pending').length,
          preparing: filteredItems.filter((i) => i.status === 'preparing').length,
          ready: filteredItems.filter((i) => i.status === 'ready').length,
          completed: filteredItems.filter((i) => i.status === 'completed').length,
        },
      };
    }

    return result;
  }

  @Get('stations')
  @ApiOperation({ summary: 'Get available stations for an outlet' })
  @ApiQuery({ name: 'outletId', required: true, type: String })
  async getAvailableStations(@Query('outletId') outletId: string) {
    return this.getStationOrdersUseCase.getAvailableStations(outletId);
  }

  // Analytics endpoints
  @Get('analytics')
  @ApiOperation({ summary: 'Get kitchen analytics for outlet' })
  @ApiQuery({ name: 'outletId', required: true, type: String })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Date in ISO format (defaults to today)' })
  async getAnalytics(
    @Query('outletId') outletId: string,
    @Query('date') date?: string,
  ) {
    const targetDate = date ? new Date(date) : undefined;
    return this.analyticsService.getAnalytics(outletId, targetDate);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get kitchen performance report' })
  @ApiQuery({ name: 'outletId', required: true, type: String })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  async getPerformanceReport(
    @Query('outletId') outletId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getPerformanceReport(
      outletId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Put('items/:id/preparing')
  @ApiOperation({ summary: 'Mark order item as preparing' })
  async markItemPreparing(
    @Param('id') orderItemId: string,
    @Body() dto: { station: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.analyticsService.markItemPreparing(orderItemId, user.employeeId, dto.station);
  }

  @Put('items/:id/ready')
  @ApiOperation({ summary: 'Mark order item as ready' })
  async markItemReady(
    @Param('id') orderItemId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.analyticsService.markItemReady(orderItemId, user.employeeId);
  }

  @Put('items/:id/recall')
  @ApiOperation({ summary: 'Recall order item (send back for re-preparation)' })
  async recallItem(
    @Param('id') orderItemId: string,
    @Body() dto: { reason?: string },
  ) {
    return this.analyticsService.recallItem(orderItemId, dto.reason);
  }

  // ======================================================================
  // COOKING TIMER SETTINGS
  // ======================================================================

  @Get('timer-settings')
  @ApiOperation({ summary: 'Get cooking timer SLA settings per order type' })
  async getTimerSettings(@CurrentUser() user: AuthUser) {
    return this.kdsService.getCookingTimerSettings(user.businessId);
  }

  @UseGuards(RolesGuard)
  @Roles(EmployeeRole.OWNER, EmployeeRole.MANAGER)
  @Put('timer-settings')
  @ApiOperation({ summary: 'Update cooking timer SLA settings (dine-in, takeaway, delivery)' })
  async updateTimerSettings(
    @CurrentUser() user: AuthUser,
    @Body() dto: Partial<CookingTimerSettings>,
  ) {
    return this.kdsService.updateCookingTimerSettings(user.businessId, dto);
  }

  // ======================================================================
  // OVERDUE ORDERS
  // ======================================================================

  @Get('overdue')
  @ApiOperation({ summary: 'Get orders exceeding SLA cooking time' })
  @ApiQuery({ name: 'outletId', required: true, type: String })
  async getOverdueOrders(
    @CurrentUser() user: AuthUser,
    @Query('outletId') outletId: string,
  ) {
    return this.kdsService.getOverdueOrders(user.businessId, outletId);
  }

  // ======================================================================
  // NOTIFY CASHIER ORDER READY
  // ======================================================================

  @Post('orders/:id/notify-ready')
  @ApiOperation({ summary: 'Notify cashier that an order is ready (WebSocket event)' })
  async notifyOrderReady(@Param('id') orderId: string) {
    return this.kdsService.notifyCashierOrderReady(orderId);
  }
}

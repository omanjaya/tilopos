import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import { Roles } from '../../infrastructure/auth/roles.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { EmployeeRole } from '../../shared/constants/roles';
import { TenantAccessService } from '../../shared/tenant';
import { CreateOrderUseCase } from '../../application/use-cases/orders/create-order.use-case';
import { UpdateOrderStatusUseCase } from '../../application/use-cases/orders/update-order-status.use-case';
import { ModifyOrderUseCase } from '../../application/use-cases/orders/modify-order.use-case';
import { CancelOrderUseCase } from '../../application/use-cases/orders/cancel-order.use-case';
import { OrdersService } from './orders.service';
import { SetOrderPriorityDto } from '../../application/dtos/order-priority.dto';
import {
  CancelOrderDto,
  CreateOrderDto,
  ListOrdersQueryDto,
  ModifyOrderDto,
  ModifyOrderItemsDto,
  UpdateOrderStatusDto,
} from '../../application/dtos/order.dto';
import { BusinessScoped } from '../../shared/guards/business-scope.guard';

/** Front-of-house roles that take and manage orders. */
const FRONT_OF_HOUSE = [
  EmployeeRole.CASHIER,
  EmployeeRole.SUPERVISOR,
  EmployeeRole.MANAGER,
  EmployeeRole.OWNER,
];
/** Status updates also come from the kitchen display. */
const ORDER_STATUS_ROLES = [...FRONT_OF_HOUSE, EmployeeRole.KITCHEN];
/** DELETE /orders/:id is the back-office cancel: supervisor and above. */
const ORDER_DELETE_ROLES = [EmployeeRole.SUPERVISOR, EmployeeRole.MANAGER, EmployeeRole.OWNER];

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
    private readonly modifyOrderUseCase: ModifyOrderUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
    private readonly ordersService: OrdersService,
    private readonly tenant: TenantAccessService,
  ) {}

  @Post()
  @Roles(...FRONT_OF_HOUSE)
  @ApiOperation({ summary: 'Create a new order' })
  async createOrder(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUser) {
    const outletId = await this.tenant.assertOutlet(user, dto.outletId ?? user.outletId);
    return this.createOrderUseCase.execute({
      businessId: user.businessId,
      outletId,
      orderType: dto.orderType,
      tableId: dto.tableId,
      customerId: dto.customerId,
      items: dto.items,
      priority: dto.priority,
      notes: dto.notes,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'List orders (active by default) for one outlet, or every outlet of the business',
  })
  async listOrders(@Query() query: ListOrdersQueryDto, @CurrentUser() user: AuthUser) {
    const outletIds = await this.tenant.resolveOutletIds(user, query.outletId);
    return this.ordersService.listOrders(outletIds, { status: query.status, limit: query.limit });
  }

  @Get(':id')
  @BusinessScoped({ resource: 'order', param: 'id' })
  @ApiOperation({ summary: 'Get order by ID' })
  async getOrder(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    // Same shape as a list row (tableName, customerName), scoped to the caller's business.
    return this.ordersService.getOrder(id, user.businessId);
  }

  @Put(':id/status')
  @Roles(...ORDER_STATUS_ROLES)
  @BusinessScoped({ resource: 'order', param: 'id' })
  @ApiOperation({ summary: 'Update order status (use PUT /orders/:id/cancel to cancel)' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.updateOrderStatusUseCase.execute({
      orderId: id,
      businessId: user.businessId,
      status: dto.status,
      employeeId: user.employeeId,
    });
  }

  @Put(':id/items')
  @Roles(...FRONT_OF_HOUSE)
  @BusinessScoped({ resource: 'order', param: 'id' })
  @ApiOperation({ summary: 'Modify order items (add/remove/update quantity)' })
  async modifyOrderItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModifyOrderItemsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.modifyOrderUseCase.execute({
      orderId: id,
      businessId: user.businessId,
      employeeId: user.employeeId,
      addItems: dto.addItems,
      removeItemIds: dto.removeItemIds,
      updateItems: dto.updateItems,
    });
  }

  @Put(':id/cancel')
  @Roles(...FRONT_OF_HOUSE)
  @BusinessScoped({ resource: 'order', param: 'id' })
  @ApiOperation({ summary: 'Cancel an order with reason' })
  async cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cancelOrderUseCase.execute({
      orderId: id,
      businessId: user.businessId,
      employeeId: user.employeeId,
      reason: dto.reason,
    });
  }

  @Put(':id')
  @Roles(...FRONT_OF_HOUSE)
  @BusinessScoped({ resource: 'order', param: 'id' })
  @ApiOperation({ summary: 'Modify order (add/remove/update items, notes, priority)' })
  async modifyOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModifyOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.modifyOrderUseCase.execute({
      orderId: id,
      businessId: user.businessId,
      employeeId: user.employeeId,
      addItems: dto.addItems,
      removeItemIds: dto.removeItemIds,
      updateItems: dto.updateItems,
      notes: dto.notes,
      priority: dto.priority,
    });
  }

  @Put(':id/priority')
  @Roles(...FRONT_OF_HOUSE)
  @BusinessScoped({ resource: 'order', param: 'id' })
  @ApiOperation({ summary: 'Set order priority (normal, urgent, vip)' })
  async setPriority(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetOrderPriorityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.setPriority(id, user.businessId, dto.priority);
  }

  @Delete(':id')
  @Roles(...ORDER_DELETE_ROLES)
  @BusinessScoped({ resource: 'order', param: 'id' })
  @ApiOperation({ summary: 'Cancel order with reason (same as PUT /orders/:id/cancel)' })
  async deleteOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cancelOrderUseCase.execute({
      orderId: id,
      businessId: user.businessId,
      employeeId: user.employeeId,
      reason: dto.reason,
    });
  }
}

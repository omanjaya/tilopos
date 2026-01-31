import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '../../infrastructure/auth/current-user.decorator';
import type { AuthUser } from '../../infrastructure/auth/auth-user.interface';
import { CreateOrderUseCase } from '../../application/use-cases/orders/create-order.use-case';
import { UpdateOrderStatusUseCase } from '../../application/use-cases/orders/update-order-status.use-case';
import { ModifyOrderUseCase } from '../../application/use-cases/orders/modify-order.use-case';
import { CancelOrderUseCase } from '../../application/use-cases/orders/cancel-order.use-case';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import type { IOrderRepository } from '../../domain/interfaces/repositories/order.repository';
import { OrdersService } from './orders.service';
import type { OrderPriorityLevel } from '../../application/dtos/order-priority.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly updateOrderStatusUseCase: UpdateOrderStatusUseCase,
    private readonly modifyOrderUseCase: ModifyOrderUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
    @Inject(REPOSITORY_TOKENS.ORDER)
    private readonly orderRepo: IOrderRepository,
    private readonly ordersService: OrdersService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  async createOrder(@Body() dto: { outletId: string; orderType: 'dine_in' | 'takeaway' | 'delivery'; tableId?: string; customerId?: string; items: { productId: string; variantId?: string; quantity: number; station?: string; notes?: string }[]; priority?: number; notes?: string }, @CurrentUser() user: AuthUser) {
    return this.createOrderUseCase.execute({ ...dto, outletId: dto.outletId || user.outletId || '' });
  }

  @Get()
  @ApiOperation({ summary: 'List active orders for an outlet' })
  async listOrders(@Query('outletId') outletId: string) {
    return this.orderRepo.findActiveByOutletId(outletId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  async getOrder(@Param('id') id: string) {
    return this.orderRepo.findById(id);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  async updateStatus(@Param('id') id: string, @Body() dto: { status: 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled' }, @CurrentUser() user: AuthUser) {
    return this.updateOrderStatusUseCase.execute({ orderId: id, status: dto.status, employeeId: user.employeeId });
  }

  @Put(':id/items')
  @ApiOperation({ summary: 'Modify order items (add/remove/update quantity)' })
  async modifyOrderItems(
    @Param('id') id: string,
    @Body() dto: {
      addItems?: Array<{ productId: string; variantId?: string; quantity: number; station?: string; notes?: string }>;
      removeItemIds?: string[];
      updateItems?: Array<{ itemId: string; quantity?: number; notes?: string }>;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.modifyItems(id, user.employeeId, dto);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order with reason' })
  async cancelOrder(
    @Param('id') id: string,
    @Body() dto: { reason: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.cancel(id, user.employeeId, dto.reason);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modify order (add/remove/update items)' })
  async modifyOrder(
    @Param('id') id: string,
    @Body() dto: {
      addItems?: Array<{ productId: string; variantId?: string; quantity: number; station?: string; notes?: string }>;
      removeItemIds?: string[];
      updateItems?: Array<{ itemId: string; quantity?: number; notes?: string }>;
      notes?: string;
      priority?: number;
    },
    @CurrentUser() user: AuthUser,
  ) {
    return this.modifyOrderUseCase.execute({
      orderId: id,
      employeeId: user.employeeId,
      addItems: dto.addItems,
      removeItemIds: dto.removeItemIds,
      updateItems: dto.updateItems,
      notes: dto.notes,
      priority: dto.priority,
    });
  }

  @Put(':id/priority')
  @ApiOperation({ summary: 'Set order priority (normal, urgent, vip)' })
  async setPriority(
    @Param('id') id: string,
    @Body() dto: { priority: OrderPriorityLevel },
  ) {
    return this.ordersService.setPriority(id, dto.priority);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel order with reason' })
  async deleteOrder(
    @Param('id') id: string,
    @Body() dto: { reason: string },
    @CurrentUser() user: AuthUser,
  ) {
    return this.cancelOrderUseCase.execute({
      orderId: id,
      employeeId: user.employeeId,
      reason: dto.reason,
    });
  }
}

import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { TransactionToOrderHandler } from './transaction-to-order.handler';
import { CreateOrderUseCase } from '../../application/use-cases/orders/create-order.use-case';
import { UpdateOrderStatusUseCase } from '../../application/use-cases/orders/update-order-status.use-case';
import { ModifyOrderUseCase } from '../../application/use-cases/orders/modify-order.use-case';
import { CancelOrderUseCase } from '../../application/use-cases/orders/cancel-order.use-case';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaOrderRepository } from '../../infrastructure/repositories/prisma-order.repository';

// Self-Order & Online Store Services (Refactored)
import { SelfOrderService, OnlineStoreService } from './self-order.service';
import {
  SelfOrderSessionService,
  SelfOrderMenuService,
  SelfOrderCartService,
  SelfOrderSubmissionService,
  OnlineStoreConfigService,
  OnlineStoreCatalogService,
  OnlineStoreOrderService,
} from './services';

@Module({
  controllers: [OrdersController],
  providers: [
    OrdersService,
    TransactionToOrderHandler,
    CreateOrderUseCase,
    UpdateOrderStatusUseCase,
    ModifyOrderUseCase,
    CancelOrderUseCase,
    { provide: REPOSITORY_TOKENS.ORDER, useClass: PrismaOrderRepository },
    // Self-Order Services
    SelfOrderService,
    SelfOrderSessionService,
    SelfOrderMenuService,
    SelfOrderCartService,
    SelfOrderSubmissionService,
    // Online Store Services
    OnlineStoreService,
    OnlineStoreConfigService,
    OnlineStoreCatalogService,
    OnlineStoreOrderService,
  ],
  exports: [
    SelfOrderService,
    OnlineStoreService,
    SelfOrderSessionService,
    SelfOrderMenuService,
    SelfOrderCartService,
    SelfOrderSubmissionService,
    OnlineStoreConfigService,
    OnlineStoreCatalogService,
    OnlineStoreOrderService,
  ],
})
export class OrdersModule {}

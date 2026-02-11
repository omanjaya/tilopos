import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './infrastructure/database/database.module';
import { EventBusModule } from './infrastructure/events/event-bus.module';
import { EventStoreModule } from './infrastructure/events/event-store.module';
import { RedisModule } from './infrastructure/cache/redis.module';
import { QueueModule } from './infrastructure/queues/queue.module';
import { LoggerModule } from './infrastructure/logging/logger.module';
import { HealthModule } from './infrastructure/health/health.module';
import { RabbitMqModule } from './infrastructure/messaging/rabbitmq.module';
import { SentryModule } from './infrastructure/monitoring/sentry.module';
import { throttleConfig } from './infrastructure/security/throttle.config';
import { AuthModule } from './modules/auth/auth.module';
import { PosModule } from './modules/pos/pos.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { KdsModule } from './modules/kds/kds.module';
import { CustomersModule } from './modules/customers/customers.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TablesModule } from './modules/tables/tables.module';
import { SelfOrderModule } from './modules/self-order/self-order.module';
import { OnlineStoreModule } from './modules/online-store/online-store.module';
import { IngredientsModule } from './modules/ingredients/ingredients.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { StockTransfersModule } from './modules/stock-transfers/stock-transfers.module';
import { DevicesModule } from './modules/devices/devices.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { SettlementsModule } from './modules/settlements/settlements.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WaitingListModule } from './modules/waiting-list/waiting-list.module';
import { BusinessModule } from './modules/business/business.module';
import { PriceTiersModule } from './modules/price-tiers/price-tiers.module';
import { UnitConversionModule } from './modules/unit-conversion/unit-conversion.module';
import { BatchTrackingModule } from './modules/batch-tracking/batch-tracking.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { SerialNumbersModule } from './modules/serial-numbers/serial-numbers.module';
import { ItemTrackingModule } from './modules/item-tracking/item-tracking.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { CreditModule } from './modules/credit/credit.module';
import { BusinessScopeGuard } from './shared/guards/business-scope.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot(throttleConfig),
    DatabaseModule,
    RedisModule,
    QueueModule,
    LoggerModule,
    HealthModule,
    RabbitMqModule,
    SentryModule,
    EventBusModule,
    EventStoreModule,
    AuthModule,
    PosModule,
    InventoryModule,
    OrdersModule,
    KdsModule,
    CustomersModule,
    EmployeesModule,
    PromotionsModule,
    ReportsModule,
    TablesModule,
    SelfOrderModule,
    OnlineStoreModule,
    IngredientsModule,
    SuppliersModule,
    StockTransfersModule,
    DevicesModule,
    NotificationsModule,
    AuditModule,
    LoyaltyModule,
    SettlementsModule,
    SettingsModule,
    UploadsModule,
    PaymentsModule,
    WaitingListModule,
    BusinessModule,
    PriceTiersModule,
    UnitConversionModule,
    BatchTrackingModule,
    AppointmentsModule,
    WorkOrdersModule,
    SerialNumbersModule,
    ItemTrackingModule,
    PricingModule,
    CreditModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: BusinessScopeGuard,
    },
  ],
})
export class AppModule {}

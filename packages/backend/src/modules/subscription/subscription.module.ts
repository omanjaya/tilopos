import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionScheduler } from './subscription.scheduler';

// PrismaService, DistributedLockService and DocumentNumberService are global.
@Module({
  imports: [PaymentsModule, NotificationsModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionScheduler],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}

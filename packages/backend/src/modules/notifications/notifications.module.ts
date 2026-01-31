import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaNotificationRepository } from '../../infrastructure/repositories/prisma-notification.repository';
import { EventBusModule } from '../../infrastructure/events/event-bus.module';
import { RealtimeMetricsService } from '../../infrastructure/services/realtime-metrics.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Module({
  imports: [EventBusModule],
  controllers: [NotificationsController],
  providers: [
    { provide: REPOSITORY_TOKENS.NOTIFICATION, useClass: PrismaNotificationRepository },
    NotificationsGateway,
    PrismaService,
    RealtimeMetricsService,
  ],
  exports: [NotificationsGateway, RealtimeMetricsService],
})
export class NotificationsModule {}

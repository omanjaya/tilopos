import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import {
  NotificationsService,
  PushNotificationChannel,
  EmailChannel,
  SMSChannel,
  WhatsAppChannel,
} from './notifications.service';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaNotificationRepository } from '../../infrastructure/repositories/prisma-notification.repository';
import { EventBusModule } from '../../infrastructure/events/event-bus.module';
import { RealtimeMetricsService } from '../../infrastructure/services/realtime-metrics.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Module({
  imports: [
    EventBusModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    { provide: REPOSITORY_TOKENS.NOTIFICATION, useClass: PrismaNotificationRepository },
    NotificationsGateway,
    PrismaService,
    RealtimeMetricsService,
    // Real notification channels
    PushNotificationChannel,
    EmailChannel,
    SMSChannel,
    WhatsAppChannel,
    NotificationsService,
  ],
  exports: [NotificationsGateway, RealtimeMetricsService, NotificationsService],
})
export class NotificationsModule {}

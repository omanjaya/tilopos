import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from './queue.constants';
import { EmailProcessor } from './processors/email.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { ReportProcessor } from './processors/report.processor';
import { StockAlertProcessor } from './processors/stock-alert.processor';
import { SettlementProcessor } from './processors/settlement.processor';
import { QueueService } from './queue.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAIL },
      { name: QUEUE_NAMES.NOTIFICATION },
      { name: QUEUE_NAMES.REPORT },
      { name: QUEUE_NAMES.STOCK_ALERT },
      { name: QUEUE_NAMES.SETTLEMENT },
    ),
  ],
  providers: [
    EmailProcessor,
    NotificationProcessor,
    ReportProcessor,
    StockAlertProcessor,
    SettlementProcessor,
    QueueService,
  ],
  exports: [BullModule, QueueService],
})
export class QueueModule {}

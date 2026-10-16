import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisConnectionOptions } from '../cache/redis-connection';

/**
 * Shared BullMQ connection (Redis settings validated by redisConnectionOptions, R16).
 * No queue is registered at the moment: the former email/notification/report/stock-alert
 * processors were log-only stubs with no producers, and settlement reconciliation is not
 * implemented (nothing enqueues it). Register queues next to a real producer + processor.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: redisConnectionOptions(configService),
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}

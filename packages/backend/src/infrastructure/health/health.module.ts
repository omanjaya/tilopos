import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health';
import { MetricsModule } from '../monitoring/metrics.module';

@Module({
  // MetricsModule is imported here so /metrics is registered without touching AppModule.
  imports: [TerminusModule, MetricsModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
})
export class HealthModule {}

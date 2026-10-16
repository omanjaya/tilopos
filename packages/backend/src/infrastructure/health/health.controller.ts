import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { RabbitMqHealthIndicator } from '../messaging/rabbitmq.health';
import { RedisHealthIndicator } from './redis.health';
import { Public } from '@shared/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly rabbitMqHealth: RabbitMqHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () => this.redisHealth.pingCheck('redis'),
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),
      () => this.rabbitMqHealth.check('rabbitmq'),
    ]);
  }

  @Public()
  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () => this.redisHealth.pingCheck('redis'),
    ]);
  }

  @Public()
  @Get('live')
  @HealthCheck()
  liveness() {
    return this.health.check([() => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024)]);
  }
}

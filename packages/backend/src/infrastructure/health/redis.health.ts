import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import type Redis from 'ioredis';

const PING_TIMEOUT_MS = 2000;

/** Pings Redis (locks, BullMQ queues, held bills and cache all depend on it). */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    super();
  }

  async pingCheck(key = 'redis'): Promise<HealthIndicatorResult> {
    let timer: NodeJS.Timeout | undefined;
    try {
      const reply = await Promise.race([
        this.redis.ping(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), PING_TIMEOUT_MS);
        }),
      ]);
      if (reply !== 'PONG') throw new Error(`unexpected reply ${String(reply)}`);
      return this.getStatus(key, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false, { message }),
      );
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

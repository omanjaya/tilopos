import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { randomUUID } from 'crypto';

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end`;

/**
 * Redis-based mutual exclusion for work that must run once across replicas
 * (Docs/ENGINEERING-RULES.md R9): every @Cron handler goes through runExclusive.
 */
@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  /**
   * Runs `fn` only if this process acquires `lock:<key>`. Returns undefined when
   * another replica already holds it. `ttlSeconds` must exceed the job's runtime.
   */
  async runExclusive<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<T | undefined> {
    const lockKey = `lock:${key}`;
    const token = randomUUID();
    const acquired = await this.redis.set(lockKey, token, 'EX', ttlSeconds, 'NX');
    if (acquired !== 'OK') {
      this.logger.debug(`Skipped ${key}: lock held by another instance`);
      return undefined;
    }
    try {
      return await fn();
    } finally {
      await this.redis.eval(RELEASE_SCRIPT, 1, lockKey, token);
    }
  }
}

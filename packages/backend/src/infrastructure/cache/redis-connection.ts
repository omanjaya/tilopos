import { ConfigService } from '@nestjs/config';

export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  db: number;
}

/**
 * Redis connection settings shared by the cache/lock client and BullMQ (R16).
 * In production REDIS_HOST is mandatory (also enforced by env.validation); the localhost
 * fallback exists only for local development.
 */
export function redisConnectionOptions(config: ConfigService): RedisConnectionOptions {
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const host = config.get<string>('REDIS_HOST');
  if (!host && isProd) {
    throw new Error('REDIS_HOST is required in production');
  }
  const port = Number(config.get<string | number>('REDIS_PORT') ?? 6379);
  const db = Number(config.get<string | number>('REDIS_DB') ?? 0);
  if (!Number.isInteger(port) || !Number.isInteger(db)) {
    throw new Error('REDIS_PORT and REDIS_DB must be integers');
  }
  return {
    host: host || 'localhost',
    port,
    password: config.get<string>('REDIS_PASSWORD') || undefined,
    db,
  };
}

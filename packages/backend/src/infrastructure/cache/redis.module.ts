import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { redisConnectionOptions } from './redis-connection';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const Redis = (await import('ioredis')).default;
        return new Redis({
          ...redisConnectionOptions(configService),
          maxRetriesPerRequest: 3,
          retryStrategy: (times: number) => Math.min(times * 100, 3000),
        });
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {}

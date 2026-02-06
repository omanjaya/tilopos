import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from './redis.service';
import { CACHE_DEFAULTS } from './cache.constants';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(private readonly redis: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    if (request.method !== 'GET') {
      return next.handle() as Observable<unknown>;
    }

    const cacheKey = `http:${request.url}`;
    const cached = await this.redis.get<unknown>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return of(cached) as Observable<unknown>;
    }

    return next.handle().pipe(
      tap(async (response: unknown) => {
        await this.redis.set(cacheKey, response, CACHE_DEFAULTS.MEDIUM_TTL);
      }),
    ) as Observable<unknown>;
  }
}

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service';
import { isMetricsEnabled } from './metrics.config';

/** Records http_requests_total / duration for every HTTP request when metrics are enabled. */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly enabled: boolean;

  constructor(
    private readonly metrics: MetricsService,
    config: ConfigService,
  ) {
    this.enabled = isMetricsEnabled(config);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.enabled || context.getType() !== 'http') return next.handle();

    const started = Date.now();
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    // Route pattern (e.g. /api/v1/products/:id) keeps label cardinality bounded.
    const path = `${req.baseUrl ?? ''}${(req.route as { path?: string } | undefined)?.path ?? req.path}`;
    const record = (status: number) =>
      this.metrics.recordHttpRequest(
        req.method,
        path,
        status,
        Date.now() - started,
        Number(req.headers['content-length'] ?? 0),
        Number(res.getHeader('content-length') ?? 0),
      );

    return next.handle().pipe(
      tap({
        next: () => record(res.statusCode),
        error: (err: { status?: number; getStatus?: () => number }) =>
          record(err?.getStatus?.() ?? err?.status ?? 500),
      }),
    );
  }
}

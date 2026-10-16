import {
  Controller,
  Get,
  Header,
  Headers,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { timingSafeEqual } from 'crypto';
import { Public } from '@shared/decorators/public.decorator';
import { MetricsService } from './metrics.service';
import { isMetricsEnabled } from './metrics.config';

/** Constant-time comparison of the presented bearer token with the configured one. */
export function bearerMatches(header: string | undefined, token: string): boolean {
  const presented = header?.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(presented);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Prometheus scrape endpoint: GET /api/v1/metrics (global prefix). @Public because scrapers carry
 * no JWT; it answers 404 unless METRICS_ENABLED=true and, when METRICS_TOKEN is set, requires
 * `Authorization: Bearer <METRICS_TOKEN>` (k8s ServiceMonitor bearerTokenSecret).
 */
@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  private readonly enabled: boolean;
  private readonly token: string | undefined;

  constructor(
    private readonly metrics: MetricsService,
    config: ConfigService,
  ) {
    this.enabled = isMetricsEnabled(config);
    this.token = config.get<string>('METRICS_TOKEN') || undefined;
  }

  @Public()
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async scrape(@Headers('authorization') authorization?: string): Promise<string> {
    if (!this.enabled) throw new NotFoundException();
    if (this.token && !bearerMatches(authorization, this.token)) {
      throw new UnauthorizedException();
    }
    return this.metrics.getMetrics();
  }
}

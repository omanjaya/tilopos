import { ConfigService } from '@nestjs/config';

/**
 * Prometheus metrics are opt-in: METRICS_ENABLED=true (ENABLE_METRICS=true, used by the k8s
 * configmap, is accepted as an alias). When disabled, GET /metrics answers 404 and no HTTP
 * metrics are recorded.
 */
export function isMetricsEnabled(config: ConfigService): boolean {
  const value = config.get<string>('METRICS_ENABLED') ?? config.get<string>('ENABLE_METRICS');
  return value === 'true';
}

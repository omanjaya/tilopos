import { ConfigService } from '@nestjs/config';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

const build = (env: Record<string, string>) =>
  new MetricsController(new MetricsService(), new ConfigService(env));

describe('MetricsController', () => {
  it('is hidden (404) unless METRICS_ENABLED=true', async () => {
    await expect(build({}).scrape()).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires the bearer token when METRICS_TOKEN is set', async () => {
    const controller = build({ METRICS_ENABLED: 'true', METRICS_TOKEN: 'secret-token' });
    await expect(controller.scrape()).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller.scrape('Bearer wrong-token!')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(controller.scrape('Bearer secret-token')).resolves.toContain(
      'http_requests_total',
    );
  });

  it('serves Prometheus text when enabled without a token', async () => {
    await expect(build({ ENABLE_METRICS: 'true' }).scrape()).resolves.toContain('# HELP');
  });
});

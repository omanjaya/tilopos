import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { RabbitMqService } from './rabbitmq.service';

/**
 * NestJS Terminus health indicator for RabbitMQ connectivity.
 *
 * Reports:
 * - healthy if connected
 * - healthy with "not_configured" detail if RABBITMQ_URL is not set
 * - unhealthy if configured but disconnected or in error state
 */
@Injectable()
export class RabbitMqHealthIndicator extends HealthIndicator {
  constructor(private readonly rabbitMqService: RabbitMqService) {
    super();
  }

  /**
   * Checks RabbitMQ connection status.
   * @param key - The key under which the health status appears in the response
   */
  check(key = 'rabbitmq'): HealthIndicatorResult {
    if (!this.rabbitMqService.isConfigured()) {
      return this.getStatus(key, true, {
        status: 'not_configured',
        message: 'RabbitMQ URL not set — using RxJS event bus',
      });
    }

    const status = this.rabbitMqService.getStatus();
    const isHealthy = status === 'connected';

    const result = this.getStatus(key, isHealthy, {
      status,
    });

    if (!isHealthy) {
      throw new HealthCheckError('RabbitMQ health check failed', result);
    }

    return result;
  }
}

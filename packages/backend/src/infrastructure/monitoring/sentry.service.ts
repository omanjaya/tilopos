import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const dsn = this.configService.get<string>('SENTRY_DSN');
    if (!dsn) {
      this.logger.warn('SENTRY_DSN not configured, error tracking disabled');
      return;
    }
    // In production, this would initialize Sentry SDK:
    // Sentry.init({ dsn, environment, tracesSampleRate });
    this.initialized = true;
    this.logger.log('Sentry error tracking initialized');
  }

  captureException(error: Error, context?: Record<string, unknown>): void {
    if (!this.initialized) {
      this.logger.error(`[Untracked Error] ${error.message}`, error.stack);
      return;
    }
    // In production: Sentry.captureException(error, { extra: context });
    this.logger.error(`[Sentry] ${error.message}`, {
      ...context,
      stack: error.stack,
    });
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (!this.initialized) return;
    // In production: Sentry.captureMessage(message, level);
    this.logger.log(`[Sentry ${level}] ${message}`);
  }

  setUser(_user: { id: string; email?: string; role?: string }): void {
    if (!this.initialized) return;
    // In production: Sentry.setUser(_user);
  }
}

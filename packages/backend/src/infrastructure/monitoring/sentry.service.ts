import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Error-reporting facade. The Sentry SDK is NOT integrated yet (@sentry/node is not a
 * dependency), so every capture is written to the application log only. When SENTRY_DSN is set
 * we say so loudly at boot instead of claiming errors are shipped to Sentry (R10).
 */
@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    if (this.configService.get<string>('SENTRY_DSN')) {
      this.logger.warn(
        'SENTRY_DSN is set but the Sentry SDK is not integrated; errors are only written to the local log',
      );
    }
  }

  captureException(error: Error, context?: Record<string, unknown>): void {
    this.logger.error(`[Untracked Error] ${error.message}`, { ...context, stack: error.stack });
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (level === 'error') this.logger.error(message);
    else if (level === 'warning') this.logger.warn(message);
    else this.logger.log(message);
  }
}

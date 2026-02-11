import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');
  private readonly sensitiveParams = ['token', 'code', 'secret', 'password', 'key', 'api_key'];

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const contentLength = res.get('content-length') || 0;

      const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';

      this.logger[logLevel](
        `${method} ${this.sanitizeUrl(originalUrl)} ${statusCode} ${contentLength}B ${duration}ms - ${ip}`,
      );
    });

    next();
  }

  private sanitizeUrl(url: string): string {
    const queryIndex = url.indexOf('?');
    if (queryIndex === -1) return url;

    try {
      const parsed = new URL(url, 'http://localhost');
      for (const param of this.sensitiveParams) {
        if (parsed.searchParams.has(param)) {
          parsed.searchParams.set(param, '[REDACTED]');
        }
      }
      return parsed.pathname + parsed.search;
    } catch {
      return url.split('?')[0];
    }
  }
}

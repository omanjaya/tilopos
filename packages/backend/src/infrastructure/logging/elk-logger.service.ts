import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import { ElasticsearchTransport, type ElasticsearchAuth } from './elasticsearch-transport';
import { RequestContextService } from './request-context.middleware';

interface BusinessLogFields {
  userId?: string;
  outletId?: string;
  businessId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

interface TransactionLogData extends BusinessLogFields {
  transactionId: string;
  type: 'sale' | 'refund' | 'void';
  amount: number;
  paymentMethod?: string;
}

interface StockChangeLogData extends BusinessLogFields {
  productId: string;
  variantId?: string;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
}

interface AuditLogData extends BusinessLogFields {
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

interface SecurityEventData extends BusinessLogFields {
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  isSuccess: boolean;
  details?: string;
}

/**
 * Elasticsearch credentials (R16): when ELASTICSEARCH_URL is set, either ELASTICSEARCH_API_KEY or
 * ELASTICSEARCH_USERNAME + ELASTICSEARCH_PASSWORD is required in production (the ELK compose
 * stack runs with security enabled). Unauthenticated shipping is allowed only outside production.
 */
export function resolveElasticsearchAuth(config: ConfigService): ElasticsearchAuth | undefined {
  const apiKey = config.get<string>('ELASTICSEARCH_API_KEY');
  const username = config.get<string>('ELASTICSEARCH_USERNAME');
  const password = config.get<string>('ELASTICSEARCH_PASSWORD');
  if (apiKey) return { apiKey };
  if (username || password) {
    if (!username || !password) {
      throw new Error('ELASTICSEARCH_USERNAME and ELASTICSEARCH_PASSWORD must be set together');
    }
    return { username, password };
  }
  const url = config.get<string>('ELASTICSEARCH_URL');
  const fromUrl = url ? ElasticsearchTransport.authFromUrl(url) : undefined;
  if (fromUrl) return fromUrl;
  if (config.get<string>('NODE_ENV') === 'production') {
    throw new Error(
      'ELASTICSEARCH_URL is set but no credentials (ELASTICSEARCH_API_KEY or USERNAME/PASSWORD)',
    );
  }
  return undefined;
}

@Injectable()
export class ElkLoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;
  private readonly serviceName: string;

  constructor(
    private readonly requestContext: RequestContextService,
    config: ConfigService,
  ) {
    this.serviceName = config.get<string>('SERVICE_NAME') || 'tilo-backend';

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
            const ctx = context ? `[${String(context)}]` : '';
            const traceId = meta['traceId'] ? `[${String(meta['traceId'])}]` : '';
            const metaKeys = Object.keys(meta).filter((k) => !['traceId', 'splat'].includes(k));
            const metaStr =
              metaKeys.length > 0
                ? ` ${JSON.stringify(Object.fromEntries(metaKeys.map((k) => [k, meta[k]])))}`
                : '';
            return `${String(timestamp)} ${level} ${traceId}${ctx} ${String(message)}${metaStr}`;
          }),
        ),
      }),
    ];

    const esUrl = config.get<string>('ELASTICSEARCH_URL');
    if (esUrl) {
      transports.push(
        new ElasticsearchTransport({
          elasticsearchUrl: esUrl,
          indexPrefix: config.get<string>('ELASTICSEARCH_INDEX_PREFIX') || 'tilo-logs',
          auth: resolveElasticsearchAuth(config),
          level: 'info',
        }),
      );
    }

    this.logger = winston.createLogger({
      level: config.get<string>('LOG_LEVEL') || 'info',
      defaultMeta: { service: this.serviceName },
      transports,
    });
  }

  log(message: string, ...optionalParams: unknown[]): void {
    const meta = this.buildMeta(optionalParams);
    this.logger.info(message, meta);
  }

  error(message: string, ...optionalParams: unknown[]): void {
    const meta = this.buildMeta(optionalParams);
    if (optionalParams[0] instanceof Error) {
      meta['error'] = {
        name: optionalParams[0].name,
        message: optionalParams[0].message,
        stack: optionalParams[0].stack,
      };
    }
    this.logger.error(message, meta);
  }

  warn(message: string, ...optionalParams: unknown[]): void {
    const meta = this.buildMeta(optionalParams);
    this.logger.warn(message, meta);
  }

  debug(message: string, ...optionalParams: unknown[]): void {
    const meta = this.buildMeta(optionalParams);
    this.logger.debug(message, meta);
  }

  verbose(message: string, ...optionalParams: unknown[]): void {
    const meta = this.buildMeta(optionalParams);
    this.logger.verbose(message, meta);
  }

  logTransaction(data: TransactionLogData): void {
    this.logger.info('Transaction processed', {
      ...this.getRequestContext(),
      ...data,
      action: 'transaction',
      logType: 'business_event',
    });
  }

  logStockChange(data: StockChangeLogData): void {
    this.logger.info('Stock changed', {
      ...this.getRequestContext(),
      ...data,
      action: 'stock_change',
      logType: 'business_event',
    });
  }

  logAudit(data: AuditLogData): void {
    this.logger.info(`Audit: ${data.operation} ${data.entityType}`, {
      ...this.getRequestContext(),
      ...data,
      action: 'audit',
      logType: 'audit',
    });
  }

  logSecurityEvent(data: SecurityEventData): void {
    const level = data.isSuccess ? 'info' : 'warn';
    this.logger[level](`Security event: ${data.eventType}`, {
      ...this.getRequestContext(),
      ...data,
      action: 'security',
      logType: 'security',
    });
  }

  private buildMeta(optionalParams: unknown[]): Record<string, unknown> {
    const context = this.getRequestContext();
    const meta: Record<string, unknown> = { ...context };

    for (const param of optionalParams) {
      if (typeof param === 'string') {
        meta['context'] = param;
      } else if (typeof param === 'object' && param !== null && !(param instanceof Error)) {
        Object.assign(meta, param);
      }
    }

    return meta;
  }

  private getRequestContext(): Record<string, string | undefined> {
    const ctx = this.requestContext.getContext();
    if (!ctx) {
      return {};
    }
    return {
      traceId: ctx.traceId,
      userId: ctx.userId,
      outletId: ctx.outletId,
    };
  }
}

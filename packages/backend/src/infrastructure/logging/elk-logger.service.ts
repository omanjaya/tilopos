import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { ElasticsearchTransport } from './elasticsearch-transport';
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

@Injectable()
export class ElkLoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;
  private readonly serviceName: string;

  constructor(private readonly requestContext: RequestContextService) {
    this.serviceName = process.env['SERVICE_NAME'] ?? 'tilo-backend';

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
            const ctx = context ? `[${String(context)}]` : '';
            const traceId = meta['traceId'] ? `[${String(meta['traceId'])}]` : '';
            const metaKeys = Object.keys(meta).filter(
              (k) => !['traceId', 'splat'].includes(k),
            );
            const metaStr = metaKeys.length > 0
              ? ` ${JSON.stringify(
                Object.fromEntries(metaKeys.map((k) => [k, meta[k]])),
              )}`
              : '';
            return `${String(timestamp)} ${level} ${traceId}${ctx} ${String(message)}${metaStr}`;
          }),
        ),
      }),
    ];

    const esUrl = process.env['ELASTICSEARCH_URL'];
    const esIndexPrefix = process.env['ELASTICSEARCH_INDEX_PREFIX'] ?? 'tilo-logs';

    if (esUrl) {
      transports.push(
        new ElasticsearchTransport({
          elasticsearchUrl: esUrl,
          indexPrefix: esIndexPrefix,
          level: 'info',
        }),
      );
    }

    this.logger = winston.createLogger({
      level: process.env['LOG_LEVEL'] ?? 'info',
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

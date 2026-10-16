/**
 * Prometheus Metrics Service
 *
 * Collects and exposes application metrics for Prometheus scraping
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: Registry;

  // HTTP Metrics
  readonly httpRequestsTotal: Counter;
  readonly httpRequestDuration: Histogram;
  readonly httpRequestSize: Histogram;
  readonly httpResponseSize: Histogram;

  // POS Metrics
  readonly transactionTotal: Counter;
  readonly transactionAmount: Counter;
  readonly transactionDuration: Histogram;
  readonly transactionSuccess: Counter;
  readonly transactionFailed: Counter;

  // Database Metrics
  readonly dbQueryDuration: Histogram;
  readonly dbConnectionPool: Gauge;
  readonly dbConnectionsIdle: Gauge;
  readonly dbConnectionsPending: Gauge;

  // Cache Metrics
  readonly cacheHits: Counter;
  readonly cacheMisses: Counter;
  readonly cacheLatency: Histogram;

  // Queue Metrics
  readonly queueJobsProcessed: Counter;
  readonly queueJobsFailed: Counter;
  readonly queueJobDuration: Histogram;
  readonly queueWaitingCount: Gauge;
  readonly queueActiveCount: Gauge;

  // Business Metrics
  readonly activeOutlets: Gauge;
  readonly activeUsers: Gauge;
  readonly productsCount: Gauge;
  readonly ordersInProgress: Gauge;

  constructor() {
    this.registry = new Registry();

    // HTTP Metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status', 'app'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status', 'app'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestSize = new Histogram({
      name: 'http_request_size_bytes',
      help: 'HTTP request size in bytes',
      labelNames: ['method', 'path'],
      buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
      registers: [this.registry],
    });

    this.httpResponseSize = new Histogram({
      name: 'http_response_size_bytes',
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'path'],
      buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000],
      registers: [this.registry],
    });

    // POS Metrics
    this.transactionTotal = new Counter({
      name: 'pos_transaction_count',
      help: 'Total number of POS transactions',
      labelNames: ['outlet_id', 'type', 'payment_method'],
      registers: [this.registry],
    });

    this.transactionAmount = new Counter({
      name: 'pos_transaction_total_amount',
      help: 'Total amount of POS transactions in IDR',
      labelNames: ['outlet_id', 'type'],
      registers: [this.registry],
    });

    this.transactionDuration = new Histogram({
      name: 'pos_transaction_duration_seconds',
      help: 'Time to process a transaction',
      labelNames: ['outlet_id', 'type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });

    this.transactionSuccess = new Counter({
      name: 'pos_transaction_success',
      help: 'Number of successful transactions',
      labelNames: ['outlet_id'],
      registers: [this.registry],
    });

    this.transactionFailed = new Counter({
      name: 'pos_transaction_failed',
      help: 'Number of failed transactions',
      labelNames: ['outlet_id', 'reason'],
      registers: [this.registry],
    });

    // Database Metrics
    this.dbQueryDuration = new Histogram({
      name: 'prisma_query_duration_seconds',
      help: 'Prisma query duration',
      labelNames: ['operation', 'model'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [this.registry],
    });

    this.dbConnectionPool = new Gauge({
      name: 'prisma_pool_connections_total',
      help: 'Total number of connections in pool',
      registers: [this.registry],
    });

    this.dbConnectionsIdle = new Gauge({
      name: 'prisma_pool_connections_idle',
      help: 'Number of idle connections',
      registers: [this.registry],
    });

    this.dbConnectionsPending = new Gauge({
      name: 'prisma_pool_connections_pending',
      help: 'Number of pending connection requests',
      registers: [this.registry],
    });

    // Cache Metrics
    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total cache hits',
      labelNames: ['cache', 'key_pattern'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total cache misses',
      labelNames: ['cache', 'key_pattern'],
      registers: [this.registry],
    });

    this.cacheLatency = new Histogram({
      name: 'cache_operation_duration_seconds',
      help: 'Cache operation latency',
      labelNames: ['cache', 'operation'],
      buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1],
      registers: [this.registry],
    });

    // Queue Metrics
    this.queueJobsProcessed = new Counter({
      name: 'bull_jobs_processed_total',
      help: 'Total processed jobs',
      labelNames: ['queue', 'job_name'],
      registers: [this.registry],
    });

    this.queueJobsFailed = new Counter({
      name: 'bull_jobs_failed_total',
      help: 'Total failed jobs',
      labelNames: ['queue', 'job_name', 'error'],
      registers: [this.registry],
    });

    this.queueJobDuration = new Histogram({
      name: 'bull_job_duration_seconds',
      help: 'Job processing duration',
      labelNames: ['queue', 'job_name'],
      buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300],
      registers: [this.registry],
    });

    this.queueWaitingCount = new Gauge({
      name: 'bull_queue_waiting_count',
      help: 'Number of waiting jobs in queue',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queueActiveCount = new Gauge({
      name: 'bull_queue_active_count',
      help: 'Number of active jobs in queue',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    // Business Metrics
    this.activeOutlets = new Gauge({
      name: 'tilopos_active_outlets',
      help: 'Number of active outlets',
      registers: [this.registry],
    });

    this.activeUsers = new Gauge({
      name: 'tilopos_active_users',
      help: 'Number of currently active users',
      registers: [this.registry],
    });

    this.productsCount = new Gauge({
      name: 'tilopos_products_total',
      help: 'Total number of products',
      labelNames: ['outlet_id'],
      registers: [this.registry],
    });

    this.ordersInProgress = new Gauge({
      name: 'tilopos_orders_in_progress',
      help: 'Number of orders currently being processed',
      labelNames: ['outlet_id'],
      registers: [this.registry],
    });
  }

  onModuleInit() {
    // Collect default Node.js metrics
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'nodejs_',
      labels: { app: 'tilopos-backend' },
    });
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get content type for metrics
   */
  getContentType(): string {
    return this.registry.contentType;
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    requestSize: number,
    responseSize: number,
  ): void {
    const labels = {
      method,
      path: this.normalizePath(path),
      status: String(statusCode),
      app: 'tilopos-backend',
    };

    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationMs / 1000);
    this.httpRequestSize.observe({ method, path: this.normalizePath(path) }, requestSize);
    this.httpResponseSize.observe({ method, path: this.normalizePath(path) }, responseSize);
  }

  /**
   * Record POS transaction
   */
  recordTransaction(
    outletId: string,
    type: string,
    paymentMethod: string,
    amount: number,
    durationMs: number,
    success: boolean,
    failureReason?: string,
  ): void {
    this.transactionTotal.inc({ outlet_id: outletId, type, payment_method: paymentMethod });
    this.transactionAmount.inc({ outlet_id: outletId, type }, amount);
    this.transactionDuration.observe({ outlet_id: outletId, type }, durationMs / 1000);

    if (success) {
      this.transactionSuccess.inc({ outlet_id: outletId });
    } else {
      this.transactionFailed.inc({ outlet_id: outletId, reason: failureReason || 'unknown' });
    }
  }

  /**
   * Record database query
   */
  recordDbQuery(operation: string, model: string, durationMs: number): void {
    this.dbQueryDuration.observe({ operation, model }, durationMs / 1000);
  }

  /**
   * Record cache operation
   */
  recordCacheOperation(cache: string, hit: boolean, keyPattern: string, durationMs: number): void {
    if (hit) {
      this.cacheHits.inc({ cache, key_pattern: keyPattern });
    } else {
      this.cacheMisses.inc({ cache, key_pattern: keyPattern });
    }
    this.cacheLatency.observe({ cache, operation: hit ? 'hit' : 'miss' }, durationMs / 1000);
  }

  /**
   * Record job processing
   */
  recordJobProcessed(
    queue: string,
    jobName: string,
    durationMs: number,
    success: boolean,
    error?: string,
  ): void {
    if (success) {
      this.queueJobsProcessed.inc({ queue, job_name: jobName });
    } else {
      this.queueJobsFailed.inc({ queue, job_name: jobName, error: error || 'unknown' });
    }
    this.queueJobDuration.observe({ queue, job_name: jobName }, durationMs / 1000);
  }

  /**
   * Update queue counts
   */
  setQueueCounts(queue: string, waiting: number, active: number): void {
    this.queueWaitingCount.set({ queue }, waiting);
    this.queueActiveCount.set({ queue }, active);
  }

  /**
   * Normalize path for metrics labels (remove IDs)
   */
  private normalizePath(path: string): string {
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')
      .replace(/\?.*$/, '');
  }
}

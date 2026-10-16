// winston-transport is CommonJS (module.exports = class); without esModuleInterop a default
// import is undefined at runtime, so use import = require.
import TransportStream = require('winston-transport');
import * as http from 'http';
import * as https from 'https';

export interface ElasticsearchAuth {
  username?: string;
  password?: string;
  apiKey?: string;
}

interface ElasticsearchTransportOptions extends TransportStream.TransportStreamOptions {
  elasticsearchUrl: string;
  indexPrefix: string;
  auth?: ElasticsearchAuth;
  flushInterval?: number;
  batchSize?: number;
  /** Max buffered entries while ES is unreachable; oldest entries are dropped beyond it. */
  maxBufferSize?: number;
}

interface LogEntry {
  '@timestamp': string;
  level: string;
  message: string;
  service?: string;
  traceId?: string;
  userId?: string;
  outletId?: string;
  action?: string;
  context?: string;
  [key: string]: unknown;
}

export class ElasticsearchTransport extends TransportStream {
  private readonly elasticsearchUrl: string;
  private readonly indexPrefix: string;
  private readonly flushInterval: number;
  private readonly batchSize: number;
  private readonly maxBufferSize: number;
  private readonly authHeader: string | undefined;
  private buffer: LogEntry[] = [];
  private droppedCount = 0;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isAvailable = true;
  private retryCount = 0;
  private readonly maxRetries = 3;
  private readonly retryDelay = 5000;

  constructor(opts: ElasticsearchTransportOptions) {
    super(opts);
    this.elasticsearchUrl = opts.elasticsearchUrl;
    this.indexPrefix = opts.indexPrefix;
    this.flushInterval = opts.flushInterval ?? 5000;
    this.batchSize = opts.batchSize ?? 100;
    this.maxBufferSize = opts.maxBufferSize ?? 10_000;
    this.authHeader = ElasticsearchTransport.buildAuthHeader(
      opts.auth ?? ElasticsearchTransport.authFromUrl(opts.elasticsearchUrl),
    );

    this.startFlushTimer();
    this.checkConnection();
  }

  override log(info: Record<string, unknown>, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const entry: LogEntry = {
      '@timestamp': (info['timestamp'] as string) ?? new Date().toISOString(),
      level: info['level'] as string,
      message: info['message'] as string,
      service: info['service'] as string | undefined,
      traceId: info['traceId'] as string | undefined,
      userId: info['userId'] as string | undefined,
      outletId: info['outletId'] as string | undefined,
      action: info['action'] as string | undefined,
      context: info['context'] as string | undefined,
    };

    const knownKeys = new Set([
      'timestamp',
      'level',
      'message',
      'service',
      'traceId',
      'userId',
      'outletId',
      'action',
      'context',
    ]);
    for (const [key, value] of Object.entries(info)) {
      if (!knownKeys.has(key)) {
        entry[key] = value;
      }
    }

    this.buffer.push(entry);
    this.enforceBufferCap();

    if (this.buffer.length >= this.batchSize) {
      void this.flush();
    }

    callback();
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.isAvailable) {
      return;
    }

    const entries = this.buffer.splice(0, this.batchSize);
    const indexName = this.getIndexName();

    const bulkBody =
      entries
        .map((entry) => {
          const action = JSON.stringify({ index: { _index: indexName } });
          const doc = JSON.stringify(entry);
          return `${action}\n${doc}`;
        })
        .join('\n') + '\n';

    try {
      await this.sendToElasticsearch('/_bulk', bulkBody);
      this.retryCount = 0;
    } catch (_error: unknown) {
      // Keep the batch for the next attempt, but never grow past the cap (ES outage).
      this.buffer.unshift(...entries);
      this.enforceBufferCap();
      this.handleConnectionError();
    }
  }

  /** Credentials embedded in ELASTICSEARCH_URL (http://user:pass@host:9200). */
  static authFromUrl(url: string): ElasticsearchAuth | undefined {
    try {
      const parsed = new URL(url);
      if (!parsed.username) return undefined;
      return {
        username: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
      };
    } catch {
      return undefined; // intentionally ignored: an invalid URL fails loudly on the first request
    }
  }

  private static buildAuthHeader(auth?: ElasticsearchAuth): string | undefined {
    if (auth?.apiKey) return `ApiKey ${auth.apiKey}`;
    if (auth?.username && auth.password) {
      return `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`;
    }
    return undefined;
  }

  /** Drops the oldest entries beyond maxBufferSize and reports how many were lost. */
  private enforceBufferCap(): void {
    const overflow = this.buffer.length - this.maxBufferSize;
    if (overflow <= 0) return;
    this.buffer.splice(0, overflow);
    this.droppedCount += overflow;
    // Every 1000 drops, say so on stderr (not through winston, to avoid recursion).
    if (this.droppedCount % 1000 < overflow) {
      process.stderr.write(
        `[ElasticsearchTransport] buffer full, ${this.droppedCount} log entries dropped so far\n`,
      );
    }
  }

  override close(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    void this.flush();
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.flushInterval);
  }

  private getIndexName(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${this.indexPrefix}-${year}.${month}.${day}`;
  }

  private async checkConnection(): Promise<void> {
    try {
      await this.sendToElasticsearch('/', '');
      this.isAvailable = true;
      this.retryCount = 0;
    } catch {
      this.isAvailable = false;
    }
  }

  private handleConnectionError(): void {
    this.retryCount++;
    if (this.retryCount >= this.maxRetries) {
      this.isAvailable = false;
      setTimeout(() => {
        void this.checkConnection();
      }, this.retryDelay * this.retryCount);
    }
  }

  private sendToElasticsearch(path: string, body: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.elasticsearchUrl);
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;

      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 9200),
        path: url.pathname,
        method: body ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/x-ndjson',
          ...(this.authHeader ? { Authorization: this.authHeader } : {}),
        },
        timeout: 10000,
      };

      const req = transport.request(options, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(
              new Error(`Elasticsearch returned status ${res.statusCode ?? 'unknown'}: ${data}`),
            );
          }
        });
      });

      req.on('error', (error: Error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Elasticsearch request timed out'));
      });

      if (body) {
        req.write(body);
      }
      req.end();
    });
  }
}

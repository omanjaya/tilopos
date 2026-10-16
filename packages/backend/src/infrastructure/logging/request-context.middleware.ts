import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface RequestContext {
  traceId: string;
  userId?: string;
  outletId?: string;
  startTime: number;
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  run<T>(context: RequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  getContext(): RequestContext | undefined {
    return this.storage.getStore();
  }

  getTraceId(): string | undefined {
    return this.storage.getStore()?.traceId;
  }

  setUserId(userId: string): void {
    const store = this.storage.getStore();
    if (store) {
      store.userId = userId;
    }
  }

  setOutletId(outletId: string): void {
    const store = this.storage.getStore();
    if (store) {
      store.outletId = outletId;
    }
  }
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly contextService: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Accept a caller-supplied trace id only if it is short and header/log safe.
    const incoming = req.headers['x-trace-id'];
    const traceId =
      typeof incoming === 'string' && /^[A-Za-z0-9._-]{1,64}$/.test(incoming)
        ? incoming
        : randomUUID();

    const context: RequestContext = {
      traceId,
      startTime: Date.now(),
    };

    const userPayload = req['user'] as { id?: string; outletId?: string } | undefined;
    if (userPayload?.id) {
      context.userId = userPayload.id;
    }
    if (userPayload?.outletId) {
      context.outletId = userPayload.outletId;
    }

    res.setHeader('X-Trace-Id', traceId);

    this.contextService.run(context, () => {
      next();
    });
  }
}

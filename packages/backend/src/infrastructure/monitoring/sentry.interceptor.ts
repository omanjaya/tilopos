import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SentryService } from './sentry.service';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  constructor(private readonly sentryService: SentryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        const request = context.switchToHttp().getRequest();
        this.sentryService.captureException(error as Error, {
          url: request?.url,
          method: request?.method,
          userId: request?.user?.employeeId,
        });
        return throwError(() => error);
      }),
    ) as Observable<unknown>;
  }
}

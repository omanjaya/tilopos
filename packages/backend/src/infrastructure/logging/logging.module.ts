import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ElkLoggerService } from './elk-logger.service';
import {
  RequestContextMiddleware,
  RequestContextService,
} from './request-context.middleware';

@Global()
@Module({
  providers: [
    RequestContextService,
    ElkLoggerService,
  ],
  exports: [
    RequestContextService,
    ElkLoggerService,
  ],
})
export class LoggingModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}

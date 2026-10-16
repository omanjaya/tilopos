import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = (request.headers['x-correlation-id'] as string) || randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;
        code = (resp.code as string) || `HTTP_${status}`;
        details = resp.details;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Map well-known Prisma errors; never echo the raw message (it leaks
      // table/column/constraint names and values).
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        code = 'CONFLICT';
        message = 'Resource already exists';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        code = 'NOT_FOUND';
        message = 'Resource not found';
      }
    } else if (exception instanceof Error) {
      const errWithCode = exception as Error & { statusCode?: number; code?: string };
      if (
        typeof errWithCode.statusCode === 'number' &&
        errWithCode.statusCode >= 400 &&
        errWithCode.statusCode < 500
      ) {
        // Deliberate client errors thrown as plain Errors keep their message.
        status = errWithCode.statusCode;
        message = exception.message;
        if (typeof errWithCode.code === 'string') {
          code = errWithCode.code;
        }
      }
      // Anything else is a 5xx: the generic message is returned and the
      // details are only logged server-side.
    }

    if (status >= 500) {
      const internalMessage = exception instanceof Error ? exception.message : message;
      this.logger.error(
        `[${correlationId}] ${request.method} ${request.url} ${status} - ${internalMessage}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${correlationId}] ${request.method} ${request.url} ${status} - ${message}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      code,
      message,
      ...(details ? { details } : {}),
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

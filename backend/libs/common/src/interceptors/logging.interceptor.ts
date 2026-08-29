// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import pino from 'pino';
import { CORRELATION_ID_HEADER } from '../middleware/correlation-id.middleware';
import { TcpEnvelope } from '../microservice/tcp-envelope.interface';

const logger = pino({
  name: 'request',
  level: process.env.LOG_LEVEL ?? 'info',
});

/** One structured JSON line per request/RPC call, always carrying the correlation id (§13.1). */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();

    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest<Request>();
      const response = context.switchToHttp().getResponse<Response>();
      const correlationId = request.headers[CORRELATION_ID_HEADER] as string;
      return next.handle().pipe(
        tap({
          next: () =>
            logger.info(
              {
                correlationId,
                method: request.method,
                path: request.originalUrl,
                statusCode: response.statusCode,
                durationMs: Date.now() - start,
              },
              'http_request',
            ),
          error: (error: Error) =>
            logger.error(
              {
                correlationId,
                method: request.method,
                path: request.originalUrl,
                durationMs: Date.now() - start,
                error: error.message,
              },
              'http_request_failed',
            ),
        }),
      );
    }

    const envelope = context.switchToRpc().getData<TcpEnvelope<unknown>>();
    const pattern = context.getHandler().name;
    return next.handle().pipe(
      tap({
        next: () =>
          logger.info(
            {
              correlationId: envelope?.meta?.correlationId,
              pattern,
              durationMs: Date.now() - start,
            },
            'rpc_call',
          ),
        error: (error: Error) =>
          logger.error(
            {
              correlationId: envelope?.meta?.correlationId,
              pattern,
              durationMs: Date.now() - start,
              error: error.message,
            },
            'rpc_call_failed',
          ),
      }),
    );
  }
}

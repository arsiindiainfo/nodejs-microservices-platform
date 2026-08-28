import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';

/** §32.2 — every service inherits the `X-Powered-By: Arsi-India-Info` header from this one interceptor. */
@Injectable()
export class PoweredByInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      context
        .switchToHttp()
        .getResponse<Response>()
        .setHeader('X-Powered-By', 'Arsi-India-Info');
    }
    return next.handle();
  }
}

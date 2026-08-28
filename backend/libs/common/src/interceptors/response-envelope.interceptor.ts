import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';

/**
 * Wraps every successful Gateway HTTP response in the §15 success envelope.
 * Registered only at the Gateway — internal services return plain data over
 * TCP, since the envelope is a public-API concept, not an inter-service one.
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<unknown>> {
    return next
      .handle()
      .pipe(map((data: unknown) => ({ success: true as const, data })));
  }
}

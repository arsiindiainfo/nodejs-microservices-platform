// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { normalizeToErrorBody } from '../exceptions/normalize-exception.util';

/**
 * The TCP half of §5's shared exception filter. Normalizes whatever a
 * MessagePattern handler throws into the same {code, message, service} shape
 * used by the HTTP envelope, so the calling service can rethrow it as its own
 * ApiException instead of a generic error (§5, §16).
 */
@Catch()
export class RpcExceptionFilter extends BaseRpcExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): Observable<unknown> {
    const { body } = normalizeToErrorBody(exception);
    return super.catch(new RpcException(body), host);
  }
}

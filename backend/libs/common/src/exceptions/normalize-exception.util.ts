import { HttpException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ErrorCode } from '../constants/error-code.enum';
import { ApiErrorBody } from '../interfaces/api-response.interface';
import { ApiException } from './api.exception';

type ErrorCodeOrGeneric = ErrorCode | 'NOT_FOUND' | 'CONFLICT';

/**
 * Single normalization used by both the HTTP and RPC halves of the shared
 * exception filter (§5) — so a plain `UnauthorizedException` thrown inside a
 * TCP handler still crosses the service boundary as `{ code: 'UNAUTHORIZED' }`
 * instead of collapsing to a generic 500 once it leaves the throwing service.
 */
export function normalizeToErrorBody(exception: unknown): {
  status: number;
  body: ApiErrorBody;
} {
  if (exception instanceof ApiException) {
    return { status: exception.getStatus(), body: exception.toErrorBody() };
  }
  if (exception instanceof RpcException) {
    const error = exception.getError();
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const body = error as ApiErrorBody;
      return { status: fallbackStatus(body.code), body };
    }
    return {
      status: 500,
      body: {
        code: ErrorCode.INTERNAL_ERROR,
        message: typeof error === 'string' ? error : 'Unexpected error.',
      },
    };
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const raw = exception.getResponse();
    const message =
      typeof raw === 'string'
        ? raw
        : ((raw as { message?: string | string[] }).message ??
          exception.message);
    return {
      status,
      body: {
        code: fallbackCode(status),
        message: Array.isArray(message) ? message.join(' ') : message,
      },
    };
  }
  return {
    status: 500,
    body: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred.',
    },
  };
}

/**
 * `NOT_FOUND`/`CONFLICT` aren't in §16's catalog — they only ever surface
 * for a plain Nest exception thrown directly (e.g. `NotFoundException` for a
 * resource §16 has no dedicated code for, like a notification). A typed
 * `ApiException` always carries its own catalog code via the branch above.
 */
function fallbackCode(status: number): ErrorCodeOrGeneric {
  switch (status) {
    case 400:
      return ErrorCode.VALIDATION_ERROR;
    case 401:
      return ErrorCode.UNAUTHORIZED;
    case 403:
      return ErrorCode.FORBIDDEN_ROLE;
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return ErrorCode.RATE_LIMITED;
    default:
      return ErrorCode.INTERNAL_ERROR;
  }
}

function fallbackStatus(code: string): number {
  switch (code) {
    case ErrorCode.VALIDATION_ERROR:
      return 400;
    case ErrorCode.UNAUTHORIZED:
      return 401;
    case ErrorCode.FORBIDDEN_ROLE:
      return 403;
    case ErrorCode.ORDER_NOT_FOUND:
    case ErrorCode.PRODUCT_NOT_FOUND:
    case ErrorCode.USER_NOT_FOUND:
      return 404;
    case ErrorCode.DUPLICATE_EMAIL:
    case ErrorCode.DUPLICATE_SKU:
    case ErrorCode.INSUFFICIENT_STOCK:
    case ErrorCode.INVALID_TRANSITION:
      return 409;
    case ErrorCode.ALREADY_PROCESSED:
      return 422;
    case ErrorCode.RATE_LIMITED:
      return 429;
    case ErrorCode.SERVICE_UNAVAILABLE:
      return 503;
    default:
      return 500;
  }
}

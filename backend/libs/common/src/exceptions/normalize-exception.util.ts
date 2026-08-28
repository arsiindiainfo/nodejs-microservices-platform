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

const STATUS_BY_CODE: Record<string, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN_ROLE]: 403,
  [ErrorCode.ORDER_NOT_FOUND]: 404,
  [ErrorCode.PRODUCT_NOT_FOUND]: 404,
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.DUPLICATE_EMAIL]: 409,
  [ErrorCode.DUPLICATE_SKU]: 409,
  [ErrorCode.INSUFFICIENT_STOCK]: 409,
  [ErrorCode.INVALID_TRANSITION]: 409,
  [ErrorCode.ALREADY_PROCESSED]: 422,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
};

function fallbackStatus(code: string): number {
  return STATUS_BY_CODE[code] ?? 500;
}

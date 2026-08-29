// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { HttpException } from '@nestjs/common';
import {
  ErrorCode,
  ERROR_CODE_HTTP_STATUS,
} from '../constants/error-code.enum';
import { ApiErrorBody } from '../interfaces/api-response.interface';

/**
 * Shared base for every typed domain exception (§5, §16). Carries the
 * httpStatus + errorCode pair the GlobalExceptionFilter maps onto the
 * response envelope (§15), and travels unchanged across a TCP hop so the
 * calling service can rethrow the same errorCode instead of a bare 500.
 */
export class ApiException extends HttpException {
  public readonly errorCode: ErrorCode;
  public readonly service?: string;

  constructor(errorCode: ErrorCode, message: string, service?: string) {
    const body: ApiErrorBody = { code: errorCode, message, service };
    super(body, ERROR_CODE_HTTP_STATUS[errorCode]);
    this.errorCode = errorCode;
    this.service = service;
  }

  toErrorBody(): ApiErrorBody {
    return {
      code: this.errorCode,
      message: this.message,
      service: this.service,
    };
  }
}

// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
import { ErrorCode } from '../constants/error-code.enum';
import { ApiException } from './api.exception';

export class ValidationErrorException extends ApiException {
  constructor(message = 'Payload failed validation.') {
    super(ErrorCode.VALIDATION_ERROR, message);
  }
}

export class ForbiddenRoleException extends ApiException {
  constructor(message = 'Your role does not permit this action.') {
    super(ErrorCode.FORBIDDEN_ROLE, message);
  }
}

export class OrderNotFoundException extends ApiException {
  constructor(orderId?: number | string) {
    super(
      ErrorCode.ORDER_NOT_FOUND,
      orderId ? `Order ${orderId} was not found.` : 'Order was not found.',
    );
  }
}

export class ProductNotFoundException extends ApiException {
  constructor(productId?: string) {
    super(
      ErrorCode.PRODUCT_NOT_FOUND,
      productId
        ? `Product ${productId} was not found.`
        : 'Product was not found.',
    );
  }
}

export class UserNotFoundException extends ApiException {
  constructor(userId?: string) {
    super(
      ErrorCode.USER_NOT_FOUND,
      userId ? `User ${userId} was not found.` : 'User was not found.',
    );
  }
}

export class DuplicateEmailException extends ApiException {
  constructor(email?: string) {
    super(
      ErrorCode.DUPLICATE_EMAIL,
      email
        ? `An account already exists for ${email}.`
        : 'Email already registered.',
    );
  }
}

export class DuplicateSkuException extends ApiException {
  constructor(sku?: string) {
    super(
      ErrorCode.DUPLICATE_SKU,
      sku ? `SKU ${sku} already exists.` : 'SKU already exists.',
    );
  }
}

export class InsufficientStockException extends ApiException {
  constructor(productName: string, available: number) {
    super(
      ErrorCode.INSUFFICIENT_STOCK,
      `Only ${available} left of ${productName}.`,
    );
  }
}

export class InvalidTransitionException extends ApiException {
  constructor(
    message = 'This action is not valid for the resource in its current state.',
  ) {
    super(ErrorCode.INVALID_TRANSITION, message);
  }
}

export class AlreadyProcessedException extends ApiException {
  constructor(message = 'Event already applied — no-op.') {
    super(ErrorCode.ALREADY_PROCESSED, message);
  }
}

export class RateLimitedException extends ApiException {
  constructor(message = 'Too many requests — please slow down.') {
    super(ErrorCode.RATE_LIMITED, message);
  }
}

export class ServiceUnavailableException extends ApiException {
  constructor(service: string, message?: string) {
    super(
      ErrorCode.SERVICE_UNAVAILABLE,
      message ?? `${service} did not respond in time.`,
      service,
    );
  }
}

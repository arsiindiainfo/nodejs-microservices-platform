// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
/** §11.1 Order status */
export enum OrderStatus {
  PENDING = 'PENDING',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  PAID = 'PAID',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
}

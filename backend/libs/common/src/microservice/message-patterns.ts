// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
/**
 * TCP MessagePattern names shared between a service's controller and every
 * caller — kept in one place so a rename is a compile error at every call
 * site instead of a silent string mismatch at runtime.
 */
export const AUTH_PATTERNS = {
  REGISTER: 'auth.register',
  LOGIN: 'auth.login',
  REFRESH: 'auth.refresh',
  LOGOUT: 'auth.logout',
} as const;

export const USER_PATTERNS = {
  REGISTER: 'user.register',
  VERIFY_CREDENTIALS: 'user.verifyCredentials',
  FIND_BY_ID: 'user.findById',
} as const;

export const PRODUCT_PATTERNS = {
  LIST: 'product.list',
  FIND_BY_ID: 'product.findById',
  CREATE: 'product.create',
  UPDATE: 'product.update',
  DELETE: 'product.delete',
  RESERVE_STOCK: 'product.reserveStock',
} as const;

export const ORDER_PATTERNS = {
  CREATE: 'order.create',
  LIST: 'order.list',
  FIND_BY_ID: 'order.findById',
  CANCEL: 'order.cancel',
  HAS_NON_TERMINAL_ORDER_FOR_PRODUCT: 'order.hasNonTerminalOrderForProduct',
  GET_CUSTOMER_ID_FOR_ORDER: 'order.getCustomerIdForOrder',
} as const;

export const PAYMENT_PATTERNS = {
  FIND_BY_ORDER_ID: 'payment.findByOrderId',
} as const;

export const NOTIFICATION_PATTERNS = {
  LIST: 'notification.list',
  MARK_READ: 'notification.markRead',
} as const;

// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
export enum ServiceName {
  GATEWAY = 'gateway',
  AUTH_SERVICE = 'auth-service',
  USER_SERVICE = 'user-service',
  PRODUCT_SERVICE = 'product-service',
  ORDER_SERVICE = 'order-service',
  PAYMENT_SERVICE = 'payment-service',
  NOTIFICATION_SERVICE = 'notification-service',
}

/** Fixed internal TCP ports — one per service, used by docker-compose service discovery. */
export const SERVICE_TCP_PORTS: Record<ServiceName, number> = {
  [ServiceName.GATEWAY]: 4000,
  [ServiceName.AUTH_SERVICE]: 4001,
  [ServiceName.USER_SERVICE]: 4002,
  [ServiceName.PRODUCT_SERVICE]: 4003,
  [ServiceName.ORDER_SERVICE]: 4004,
  [ServiceName.PAYMENT_SERVICE]: 4005,
  [ServiceName.NOTIFICATION_SERVICE]: 4006,
};

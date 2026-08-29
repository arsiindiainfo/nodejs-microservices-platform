// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
/** Published by order-service; consumed by payment-service, notification-service (§11.2). */
export interface OrderCreatedEventV1 {
  orderId: number;
  customerId: string;
  totalAmount: number;
  timestamp: string;
}

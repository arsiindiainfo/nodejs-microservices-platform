// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
/** Published by payment-service; consumed by order-service, notification-service (§11.2). */
export interface PaymentFailedEventV1 {
  orderId: number;
  reason: string;
  timestamp: string;
}

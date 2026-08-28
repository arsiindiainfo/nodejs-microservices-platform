/** Published by payment-service; consumed by order-service, notification-service (§11.2). */
export interface PaymentSucceededEventV1 {
  orderId: number;
  amount: number;
  timestamp: string;
}

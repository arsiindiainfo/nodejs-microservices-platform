// Copyright (c) 2026 Arsi India Info. Licensed under the MIT License.
/** §11.2 diagram / §23.7 queue-depth panel — the fixed topic/queue topology for this platform. */
export const SNS_TOPICS = {
  ORDER_EVENTS: 'order-events',
  PAYMENT_EVENTS: 'payment-events',
} as const;

export const SQS_QUEUES = {
  PAYMENT_SVC_ORDER_QUEUE: 'payment-svc-order-queue',
  NOTIFICATION_SVC_ORDER_QUEUE: 'notification-svc-order-queue',
  ORDER_SVC_PAYMENT_QUEUE: 'order-svc-payment-queue',
  NOTIFICATION_SVC_PAYMENT_QUEUE: 'notification-svc-payment-queue',
} as const;

export function dlqName(queueName: string): string {
  return `${queueName}-dlq`;
}

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import {
  EventEnvelope,
  EventType,
  PaymentFailedEventV1,
  PaymentSucceededEventV1,
} from '@app/events';
import { SqsConsumerBase } from '@app/messaging';
import { callTcpService, ServiceName, ORDER_PATTERNS } from '@app/common';
import { NotificationType } from '../notifications/schemas/notification.schema';
import { NotificationsService } from '../notifications/notifications.service';

/** Consumes `notification-svc-payment-queue` (subscribed to payment-events, §11.2). */
@Injectable()
export class PaymentResultConsumer extends SqsConsumerBase {
  constructor(
    config: ConfigService,
    private readonly notificationsService: NotificationsService,
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
  ) {
    super(config, {
      queueUrl: config.getOrThrow<string>('NOTIFICATION_SVC_PAYMENT_QUEUE_URL'),
    });
  }

  protected async handleEvent(
    envelope: EventEnvelope<PaymentSucceededEventV1 | PaymentFailedEventV1>,
  ): Promise<void> {
    const orderId = envelope.payload.orderId;
    const { customerId } = await callTcpService<{ customerId: string }>(
      this.orderClient,
      ORDER_PATTERNS.GET_CUSTOMER_ID_FOR_ORDER,
      { orderId },
      { correlationId: envelope.correlationId },
      ServiceName.ORDER_SERVICE,
    );

    if (envelope.eventType === EventType.PAYMENT_SUCCEEDED) {
      await this.notificationsService.create(
        customerId,
        NotificationType.PAYMENT_SUCCEEDED,
        `Payment for order #${orderId} succeeded.`,
      );
    } else if (envelope.eventType === EventType.PAYMENT_FAILED) {
      const reason = (envelope.payload as PaymentFailedEventV1).reason;
      await this.notificationsService.create(
        customerId,
        NotificationType.PAYMENT_FAILED,
        `Payment for order #${orderId} failed: ${reason}`,
      );
    }
  }
}

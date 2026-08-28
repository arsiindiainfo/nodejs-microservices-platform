import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEnvelope, OrderCreatedEventV1 } from '@app/events';
import { SqsConsumerBase } from '@app/messaging';
import { NotificationType } from '../notifications/schemas/notification.schema';
import { NotificationsService } from '../notifications/notifications.service';

/** Consumes `notification-svc-order-queue` (subscribed to order-events, §11.2). */
@Injectable()
export class OrderCreatedConsumer extends SqsConsumerBase {
  constructor(
    config: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {
    super(config, {
      queueUrl: config.getOrThrow<string>('NOTIFICATION_SVC_ORDER_QUEUE_URL'),
    });
  }

  protected async handleEvent(
    envelope: EventEnvelope<OrderCreatedEventV1>,
  ): Promise<void> {
    await this.notificationsService.create(
      envelope.payload.customerId,
      NotificationType.ORDER_PLACED,
      `Order #${envelope.payload.orderId} placed for $${envelope.payload.totalAmount.toFixed(2)}.`,
    );
  }
}

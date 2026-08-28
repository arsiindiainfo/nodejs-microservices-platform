import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EventEnvelope,
  EventType,
  PaymentFailedEventV1,
  PaymentSucceededEventV1,
} from '@app/events';
import { SqsConsumerBase } from '@app/messaging';
import { OrdersService } from '../orders/orders.service';

/** Consumes `order-svc-payment-queue` (subscribed to payment-events, §11.2). */
@Injectable()
export class PaymentResultConsumer extends SqsConsumerBase {
  constructor(
    config: ConfigService,
    private readonly ordersService: OrdersService,
  ) {
    super(config, {
      queueUrl: config.getOrThrow<string>('ORDER_SVC_PAYMENT_QUEUE_URL'),
    });
  }

  protected async handleEvent(
    envelope: EventEnvelope<PaymentSucceededEventV1 | PaymentFailedEventV1>,
  ): Promise<void> {
    if (envelope.eventType === EventType.PAYMENT_SUCCEEDED) {
      const payload = envelope.payload as PaymentSucceededEventV1;
      await this.ordersService.applyPaymentResult(
        envelope.eventId,
        payload.orderId,
        'SUCCEEDED',
      );
    } else if (envelope.eventType === EventType.PAYMENT_FAILED) {
      const payload = envelope.payload as PaymentFailedEventV1;
      await this.ordersService.applyPaymentResult(
        envelope.eventId,
        payload.orderId,
        'FAILED',
      );
    }
  }
}

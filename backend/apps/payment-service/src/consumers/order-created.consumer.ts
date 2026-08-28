import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEnvelope, OrderCreatedEventV1 } from '@app/events';
import { SqsConsumerBase } from '@app/messaging';
import { PaymentsService } from '../payments/payments.service';

/** Consumes `payment-svc-order-queue` (subscribed to order-events, §11.2). */
@Injectable()
export class OrderCreatedConsumer extends SqsConsumerBase {
  constructor(
    config: ConfigService,
    private readonly paymentsService: PaymentsService,
  ) {
    super(config, {
      queueUrl: config.getOrThrow<string>('PAYMENT_SVC_ORDER_QUEUE_URL'),
    });
  }

  protected async handleEvent(
    envelope: EventEnvelope<OrderCreatedEventV1>,
  ): Promise<void> {
    await this.paymentsService.processOrderCreated(
      envelope.eventId,
      envelope.payload.orderId,
      envelope.payload.totalAmount,
    );
  }
}

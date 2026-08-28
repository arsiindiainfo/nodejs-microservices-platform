import { Injectable, Logger } from '@nestjs/common';
import { OrderNotFoundException } from '@app/common';
import type { PaymentStatusView } from '@app/common';
import { PaymentsRepository } from './payments.repository';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly paymentsRepository: PaymentsRepository) {}

  /**
   * Consumed from order-events (§11.2) — payment-service never exposes a
   * public route to trigger a charge (§20): money movement is always a
   * reaction to ORDER_CREATED, never a direct API call.
   */
  async processOrderCreated(
    eventId: string,
    orderId: number,
    amount: number,
  ): Promise<void> {
    const result = await this.paymentsRepository.processPayment(
      eventId,
      orderId,
      amount,
    );
    if (result.statusCode === 'INTERNAL_ERROR') {
      throw new Error(`sp_payment_process failed: ${result.message}`);
    }
    if (result.statusCode !== 'OK') {
      this.logger.warn(
        `Payment for order ${orderId} was a no-op: ${result.statusCode} — ${result.message}`,
      );
    }
  }

  async findByOrderId(orderId: number): Promise<PaymentStatusView> {
    const row = await this.paymentsRepository.findByOrderId(orderId);
    if (!row) {
      throw new OrderNotFoundException(orderId);
    }
    return {
      orderId: row.order_id,
      amount: Number(row.amount),
      status: row.status,
      providerReference: row.provider_reference,
      failureReason: row.failure_reason,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }
}

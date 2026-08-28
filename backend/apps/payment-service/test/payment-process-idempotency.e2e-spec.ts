import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaymentsModule } from '../src/payments/payments.module';
import { PaymentsService } from '../src/payments/payments.service';

/**
 * §12.2 / §26 — delivers the same ORDER_CREATED event twice and asserts
 * sp_payment_process's processed_events + unique-order_id constraint (§8.3)
 * make the redelivery a safe no-op: exactly one payment row per order, never
 * a double charge. Requires a live MySQL — run via `docker compose up`
 * (§28), not part of the default unit test run.
 */
describe('payment-service order-created idempotency (e2e)', () => {
  let app: INestApplication;
  let paymentsService: PaymentsService;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PaymentsModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    paymentsService = app.get(PaymentsService);
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('processes the same ORDER_CREATED event exactly once', async () => {
    const orderId = Math.floor(Date.now() / 1000);
    const eventId = randomUUID();

    await paymentsService.processOrderCreated(eventId, orderId, 100);
    await paymentsService.processOrderCreated(eventId, orderId, 100);

    const rows = await dataSource.query(
      'SELECT COUNT(*) AS count FROM payments WHERE order_id = ?',
      [orderId],
    );
    expect(Number(rows[0].count)).toBe(1);

    const processed = await dataSource.query(
      'SELECT COUNT(*) AS count FROM processed_events WHERE event_id = ?',
      [eventId],
    );
    expect(Number(processed[0].count)).toBe(1);
  });
});

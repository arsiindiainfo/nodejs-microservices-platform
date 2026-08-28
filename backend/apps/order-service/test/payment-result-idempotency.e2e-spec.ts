import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrdersModule } from '../src/orders/orders.module';
import { OrdersService } from '../src/orders/orders.service';

/**
 * §12.2 / §26 — delivers the same PAYMENT_SUCCEEDED event twice (simulating
 * SQS's at-least-once redelivery) and asserts usp_Order_ApplyPaymentResult's
 * ProcessedEvents check makes the second delivery a no-op: the order reaches
 * PAID exactly once, not twice, and the second call reports ALREADY_PROCESSED
 * rather than throwing. Requires a live SQL Server — run via `docker compose up`
 * (§28), not part of the default unit test run.
 */
describe('order-service payment-result idempotency (e2e)', () => {
  let app: INestApplication;
  let ordersService: OrdersService;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [OrdersModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    ordersService = app.get(OrdersService);
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('applies the same PAYMENT_SUCCEEDED event exactly once', async () => {
    const created = await dataSource.query<Array<{ OrderId: number }>>(
      `INSERT INTO dbo.Orders (CustomerId, Status, TotalAmount) OUTPUT INSERTED.OrderId
       VALUES (@0, 'AWAITING_PAYMENT', 42.00)`,
      [randomUUID()],
    );
    const orderId = created[0].OrderId;
    const eventId = randomUUID();

    await ordersService.applyPaymentResult(eventId, orderId, 'SUCCEEDED');
    await ordersService.applyPaymentResult(eventId, orderId, 'SUCCEEDED');

    const orders = await dataSource.query<Array<{ Status: string }>>(
      'SELECT Status FROM dbo.Orders WHERE OrderId = @0',
      [orderId],
    );
    expect(orders[0].Status).toBe('PAID');

    const processedCount = await dataSource.query<Array<{ count: number }>>(
      'SELECT COUNT(*) AS count FROM dbo.ProcessedEvents WHERE EventId = @0',
      [eventId],
    );
    expect(Number(processedCount[0].count)).toBe(1);
  });
});

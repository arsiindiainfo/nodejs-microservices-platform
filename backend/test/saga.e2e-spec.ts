import { api, promoteToAdmin, sleep, waitForGateway } from './test-helpers';

/**
 * §26's differentiator test: spins up against the full `docker compose up`
 * stack (all 6 services + Gateway + LocalStack), places a real order through
 * the Gateway's public HTTP API, and asserts it reaches PAID within a
 * timeout — proving the whole event chain (order-service's outbox → SNS →
 * SQS → payment-service → SNS → SQS → order-service's idempotent consumer)
 * works together, not just each link in isolation.
 *
 * Run with the stack up: `npm run test:integration` from `backend/`.
 */
describe('cross-service order saga (e2e)', () => {
  jest.setTimeout(120_000);

  let adminToken: string;
  let customerToken: string;
  let productId: string;

  beforeAll(async () => {
    await waitForGateway();

    const unique = Date.now();
    const admin = {
      name: 'Saga Admin',
      email: `saga-admin-${unique}@test.local`,
      password: 'SagaAdmin!2026',
    };
    const customer = {
      name: 'Saga Customer',
      email: `saga-customer-${unique}@test.local`,
      password: 'SagaCustomer!2026',
    };

    await api('/api/v1/auth/register', { method: 'POST', body: admin });
    await promoteToAdmin(admin.email);
    const adminLogin = await api<{ accessToken: string }>(
      '/api/v1/auth/login',
      {
        method: 'POST',
        body: { email: admin.email, password: admin.password },
      },
    );
    adminToken = adminLogin.json.data!.accessToken;

    await api('/api/v1/auth/register', { method: 'POST', body: customer });
    const customerLogin = await api<{ accessToken: string }>(
      '/api/v1/auth/login',
      {
        method: 'POST',
        body: { email: customer.email, password: customer.password },
      },
    );
    customerToken = customerLogin.json.data!.accessToken;

    const product = await api<{ id: string }>('/api/v1/products', {
      method: 'POST',
      token: adminToken,
      // amount stays well under sp_payment_process's 5000 "decline" threshold (§10.3) so this order succeeds.
      body: {
        name: `Saga Widget ${unique}`,
        sku: `SAGA-${unique}`,
        price: 42,
        stockQty: 10,
      },
    });
    productId = product.json.data!.id;
  });

  it('places an order and reaches PAID through the full event chain', async () => {
    const created = await api<{ id: number; status: string }>(
      '/api/v1/orders',
      {
        method: 'POST',
        token: customerToken,
        body: { items: [{ productId, quantity: 1 }] },
      },
    );
    expect(created.status).toBe(201);
    expect(created.json.data!.status).toBe('AWAITING_PAYMENT');
    const orderId = created.json.data!.id;

    let finalStatus: string | undefined;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const check = await api<{ status: string }>(`/api/v1/orders/${orderId}`, {
        token: customerToken,
      });
      finalStatus = check.json.data?.status;
      if (finalStatus === 'PAID' || finalStatus === 'PAYMENT_FAILED') break;
      await sleep(2000);
    }
    expect(finalStatus).toBe('PAID');

    const payment = await api<{ status: string }>(
      `/api/v1/orders/${orderId}/payment`,
      { token: customerToken },
    );
    expect(payment.json.data!.status).toBe('SUCCEEDED');

    const notifications = await api<{ items: Array<{ type: string }> }>(
      '/api/v1/notifications',
      {
        token: customerToken,
      },
    );
    expect(
      notifications.json.data!.items.some((n) => n.type === 'ORDER_PLACED'),
    ).toBe(true);
    expect(
      notifications.json.data!.items.some(
        (n) => n.type === 'PAYMENT_SUCCEEDED',
      ),
    ).toBe(true);
  });
});

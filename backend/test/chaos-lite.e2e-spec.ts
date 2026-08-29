import { execSync } from 'child_process';
import { api, promoteToAdmin, sleep, waitForGateway } from './test-helpers';

const PAYMENT_CONTAINER = 'demotech-payment-service';

/**
 * §26's chaos-lite test: kills payment-service mid-flight, right after the
 * order is placed, and asserts the ORDER_CREATED message is retried and
 * eventually processed once the container comes back — proving the
 * retry/DLQ story (§12.3) isn't just documentation. Requires docker on PATH
 * and the compose stack's container names (only meaningful against the real
 * `docker compose up` stack, not an isolated test double).
 */
describe('chaos-lite: payment-service restart mid-order (e2e)', () => {
  jest.setTimeout(180_000);

  let customerToken: string;
  let productId: string;

  beforeAll(async () => {
    await waitForGateway();

    const unique = Date.now();
    const admin = { name: 'Chaos Admin', email: `chaos-admin-${unique}@test.local`, password: 'ChaosAdmin!2026' };
    const customer = {
      name: 'Chaos Customer',
      email: `chaos-customer-${unique}@test.local`,
      password: 'ChaosCustomer!2026',
    };

    await api('/api/v1/auth/register', { method: 'POST', body: admin });
    await promoteToAdmin(admin.email);
    const adminLogin = await api<{ accessToken: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: { email: admin.email, password: admin.password },
    });

    await api('/api/v1/auth/register', { method: 'POST', body: customer });
    const customerLogin = await api<{ accessToken: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: { email: customer.email, password: customer.password },
    });
    customerToken = customerLogin.json.data!.accessToken;

    const product = await api<{ id: string }>('/api/v1/products', {
      method: 'POST',
      token: adminLogin.json.data!.accessToken,
      body: { name: `Chaos Widget ${unique}`, sku: `CHAOS-${unique}`, price: 42, stockQty: 10 },
    });
    productId = product.json.data!.id;
  });

  it('recovers once payment-service is killed and restarted', async () => {
    const created = await api<{ id: number }>('/api/v1/orders', {
      method: 'POST',
      token: customerToken,
      body: { items: [{ productId, quantity: 1 }] },
    });
    const orderId = created.json.data!.id;

    // Kill it immediately — order-service's outbox publisher and payment-service's
    // SQS consumer are both polling on short intervals, so the message is very
    // likely still in flight or unclaimed at this point.
    execSync(`docker kill ${PAYMENT_CONTAINER}`, { stdio: 'ignore' });
    await sleep(3000);
    execSync(`docker start ${PAYMENT_CONTAINER}`, { stdio: 'ignore' });

    let finalStatus: string | undefined;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const check = await api<{ status: string }>(`/api/v1/orders/${orderId}`, { token: customerToken });
      finalStatus = check.json.data?.status;
      if (finalStatus === 'PAID' || finalStatus === 'PAYMENT_FAILED') break;
      await sleep(2000);
    }

    expect(finalStatus).toBe('PAID');
  });
});

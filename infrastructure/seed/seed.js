/**
 * One-shot seed job (§28): registers a demo admin + customer account and a
 * small "DemoTech Commerce" product catalog, so a reviewer can place an
 * order end to end immediately after `docker compose up`.
 *
 * There is no API to create an ADMIN directly — registration always creates
 * a CUSTOMER (§6.1's roles are deliberately not self-service to elevate).
 * This script registers the admin account through the real API (so it goes
 * through the same hashing/validation every user does) and then flips just
 * that one document's `role` field directly in MongoDB — the same "ops does
 * the first promotion by hand" pattern real systems use to bootstrap their
 * first admin.
 */
const { MongoClient } = require('mongodb');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const USER_SERVICE_MONGO_URI = process.env.USER_SERVICE_MONGO_URI;

const ADMIN = { name: 'Demo Admin', email: 'admin@demotech.example', password: 'DemoTech!Admin2026' };
const CUSTOMER = { name: 'Demo Customer', email: 'customer@demotech.example', password: 'DemoTech!Customer2026' };

const CATALOG = [
  { name: 'Enterprise Widget', sku: 'WIDGET-ENT-001', price: 29.0, stockQty: 250 },
  { name: 'Demo Gadget', sku: 'GADGET-DEMO-001', price: 19.0, stockQty: 250 },
  { name: 'Portfolio Gizmo', sku: 'GIZMO-PORT-001', price: 49.5, stockQty: 100 },
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForGateway(retries = 60, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(`${GATEWAY_URL}/api/v1/about`);
      if (res.ok) return;
    } catch {
      // gateway (and everything behind it) still starting up
    }
    console.log(`[seed] waiting for gateway... (${attempt}/${retries})`);
    await sleep(delayMs);
  }
  throw new Error('Gateway never became reachable.');
}

async function postJson(path, body, token) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, json };
}

/** Registers an account; treats "already exists" as success so the seed is safely re-runnable. */
async function registerOrSkip(account) {
  const { status, json } = await postJson('/api/v1/auth/register', account);
  if (status === 201) {
    console.log(`[seed] registered ${account.email}`);
    return json.data;
  }
  if (status === 409) {
    console.log(`[seed] ${account.email} already exists — logging in instead`);
    const login = await postJson('/api/v1/auth/login', { email: account.email, password: account.password });
    return login.json.data;
  }
  throw new Error(`Failed to register ${account.email}: ${JSON.stringify(json)}`);
}

async function promoteToAdmin(email) {
  const client = new MongoClient(USER_SERVICE_MONGO_URI);
  try {
    await client.connect();
    const db = client.db();
    const result = await db.collection('users').updateOne({ email }, { $set: { role: 'ADMIN' } });
    if (result.matchedCount === 0) {
      throw new Error(`No user found for ${email} to promote.`);
    }
    console.log(`[seed] promoted ${email} to ADMIN`);
  } finally {
    await client.close();
  }
}

async function seedCatalog(adminToken) {
  for (const product of CATALOG) {
    const { status, json } = await postJson('/api/v1/products', product, adminToken);
    if (status === 201) {
      console.log(`[seed] created product ${product.sku}`);
    } else if (status === 409) {
      console.log(`[seed] product ${product.sku} already exists`);
    } else {
      throw new Error(`Failed to create product ${product.sku}: ${JSON.stringify(json)}`);
    }
  }
}

async function main() {
  if (!USER_SERVICE_MONGO_URI) {
    throw new Error('USER_SERVICE_MONGO_URI is required.');
  }

  await waitForGateway();

  await registerOrSkip(ADMIN);
  await promoteToAdmin(ADMIN.email);
  await registerOrSkip(CUSTOMER);

  const adminLogin = await postJson('/api/v1/auth/login', { email: ADMIN.email, password: ADMIN.password });
  const adminToken = adminLogin.json.data.accessToken;
  await seedCatalog(adminToken);

  console.log('[seed] done.');
  console.log(`[seed] admin login:    ${ADMIN.email} / ${ADMIN.password}`);
  console.log(`[seed] customer login: ${CUSTOMER.email} / ${CUSTOMER.password}`);
}

main().catch((error) => {
  console.error('[seed] failed:', error);
  process.exit(1);
});

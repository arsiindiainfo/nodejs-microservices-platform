import { MongoClient } from 'mongodb';

export const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const USER_SERVICE_MONGO_URI =
  process.env.USER_SERVICE_MONGO_URI ||
  'mongodb://demotech:DemoTech!Mongo2026@localhost:27017/user_service?authSource=admin';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ApiResult<T = any> {
  status: number;
  json: { success: boolean; data?: T; error?: { code: string; message: string } };
}

export async function api<T = any>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const json = (await res.json()) as ApiResult<T>['json'];
  return { status: res.status, json };
}

/**
 * There is no API to create an ADMIN (§6.1's roles are not self-service to
 * elevate — see infrastructure/seed/seed.js's header comment for why). Tests
 * that need one register a throwaway account and promote it directly in
 * Mongo, the same "ops does the first promotion by hand" pattern the seed
 * job uses.
 */
export async function promoteToAdmin(email: string): Promise<void> {
  const client = new MongoClient(USER_SERVICE_MONGO_URI);
  try {
    await client.connect();
    const result = await client.db().collection('users').updateOne({ email }, { $set: { role: 'ADMIN' } });
    if (result.matchedCount === 0) {
      throw new Error(`No user found for ${email} to promote — did registration succeed?`);
    }
  } finally {
    await client.close();
  }
}

export async function waitForGateway(retries = 60, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(`${GATEWAY_URL}/api/v1/about`);
      if (res.ok) return;
    } catch {
      // still starting up
    }
    await sleep(delayMs);
  }
  throw new Error('Gateway never became reachable.');
}

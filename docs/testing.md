# Testing Strategy

## Per-service

- **Unit tests** (Jest) — `npm test` from `backend/` runs every `*.spec.ts`
  under `apps/` and `libs/`.
- **Health e2e tests** — each service has an `apps/<service>/test/app.e2e-spec.ts`
  asserting `/health` and `/health/ready` respond, run against that
  service's own `TestingModule` (needs its real database reachable, since
  `/health/ready` genuinely pings it).
- **Idempotency e2e tests** — the differentiator at the single-service level:
  - `apps/order-service/test/payment-result-idempotency.e2e-spec.ts` delivers
    the same `PAYMENT_SUCCEEDED` event twice and asserts the order reaches
    `PAID` exactly once, with the second call reporting `ALREADY_PROCESSED`.
  - `apps/payment-service/test/payment-process-idempotency.e2e-spec.ts` does
    the same for `sp_payment_process`, asserting exactly one `payments` row
    per order even when the same `ORDER_CREATED` event is delivered twice.

  Run an individual service's e2e suite with, e.g.:
  ```bash
  cd backend
  npx jest --config ./apps/order-service/test/jest-e2e.json
  ```

## Cross-service (the differentiator)

Both of the tests below run against the **full `docker compose up` stack** —
they're integration tests that exercise the whole event chain, not a single
service in isolation. From `backend/`:

```bash
npm run test:saga    # cross-service saga test
npm run test:chaos   # chaos-lite test
npm run test:integration  # both
```

### `test/saga.e2e-spec.ts`

Places a real order through the Gateway's public HTTP API (registering its
own throwaway admin/customer accounts — see the note in `test/test-helpers.ts`
on why an admin needs a direct Mongo promotion) and asserts the order reaches
`PAID` within a timeout, that `GET /orders/:id/payment` reports `SUCCEEDED`,
and that both an `ORDER_PLACED` and a `PAYMENT_SUCCEEDED` notification were
produced. This proves the whole chain — order-service's outbox → SNS → SQS →
payment-service → SNS → SQS → order-service's idempotent consumer +
notification-service's two consumers — works together end to end, not just
each link in isolation.

### `test/chaos-lite.e2e-spec.ts`

Places an order, then immediately runs `docker kill demotech-payment-service`
followed by `docker start demotech-payment-service` a few seconds later, and
polls until the order reaches `PAID` anyway. This proves the retry story
(§12.3) isn't just documentation: the `ORDER_CREATED` message survives
payment-service being killed mid-flight, and is picked up once the container
is back — either because it was still sitting unclaimed in SQS, or because
SQS's visibility timeout returned it after the in-flight receive was lost
with the container.

**Requires**: `docker` on `PATH` and the compose stack's container names
(only meaningful against the real stack, not an isolated test double).

## What's intentionally not covered

There is no test asserting the DLQ actually receives a message after 5 failed
attempts, and no automated test of the LocalStack bootstrap script itself —
both are exercised manually via `docker compose logs localstack` and the
admin health dashboard (Phase 5, not yet built). The chaos-lite test above
proves the *retry* half of that story; proving the *DLQ* half would require
deliberately breaking a consumer for 5+ delivery attempts, which is a
reasonable next addition but wasn't built here to keep the test's blast
radius (and runtime) contained.

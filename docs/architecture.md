# Architecture

## Service ownership

| Service | Owns | Exposes to other services | Never exposes |
|---|---|---|---|
| auth-service | Refresh tokens (Redis) | Token issuance/verification | Password hashes (delegates the check to user-service) |
| user-service | Users, roles, password hashes | "does this user exist / what's their role" lookups | Raw password hashes, even internally |
| product-service | Products, stock levels | Price/stock lookups for order-service | — |
| order-service | Orders, order items, outbox | Order status for the Gateway and notification-service | Payment details |
| payment-service | Payments, outbox | Payment status for order-service | Order line-item contents |
| notification-service | Notification log | — | — |

## Zero-trust service-to-service auth

A service never trusts a request just because it arrived on the internal
network. Every service — not only the Gateway — independently verifies the
JWT's signature and expiry (`JwtVerificationGuard` in `libs/common`) before
honoring a synchronous TCP call. TCP has no HTTP-style headers, so the JWT
and a correlation id travel as explicit metadata on every call
(`TcpEnvelope { meta: { correlationId, jwt }, data }`).

```
React ──▶ API Gateway (verifies JWT, attaches X-Correlation-Id)
              │
              │ TCP MessagePattern call, JWT + correlation id forwarded as call metadata
              ▼
       order-service (independently re-verifies the JWT — does not trust the Gateway blindly)
              │ synchronous TCP call to check price/stock
              ▼
       product-service (independently re-verifies the JWT too)
```

## Event catalog

| Event | Published by | Consumed by | Payload |
|---|---|---|---|
| `ORDER_CREATED` | order-service | payment-service, notification-service | `{ orderId, customerId, totalAmount, timestamp }` |
| `PAYMENT_SUCCEEDED` | payment-service | order-service, notification-service | `{ orderId, amount, timestamp }` |
| `PAYMENT_FAILED` | payment-service | order-service, notification-service | `{ orderId, reason, timestamp }` |

Every event travels wrapped in `libs/events`' `EventEnvelope<T>`:
`{ eventId, eventType, eventVersion, correlationId, occurredAt, payload }`.
The business payload (what the table above shows) is all that's persisted on
the outbox row itself — the envelope is assembled by the `OutboxPublisher` at
publish time, with `eventId` derived deterministically from
`(serviceName, outboxRowId)` via `deriveEventId()` (UUID v5). Deriving it
rather than generating a random id per publish attempt means a row that gets
re-claimed and re-published after a crash produces the exact same `eventId`,
so a downstream consumer's idempotency check still catches a redelivery.

```
Order Service
     │  usp_Order_Create writes the order row + an OutboxEvents row, same transaction
     ▼
  SNS: order-events
     │
     ┌───┴────────────┐
     ▼                ▼
SQS: payment-svc   SQS: notification-svc
     │                     (logs "order placed" notification)
     ▼
Payment Service (sp_payment_process)
     │  writes payment row + outbox row, same transaction
     ▼
  SNS: payment-events
     │
     ┌───┴────────────┐
     ▼                ▼
SQS: order-svc     SQS: notification-svc
     │                     (logs "payment succeeded/failed" notification)
     ▼
Order Service (usp_Order_ApplyPaymentResult) — order reaches PAID or PAYMENT_FAILED
```

## Outbox, idempotency, retries

**Transactional outbox** — the domain write and a row describing "what to
publish" happen in one local transaction (§10.1/§10.3 of the plan). A
separate `OutboxPublisher` worker (`libs/messaging`) polls for unpublished
rows, claims a batch (`usp_OutboxEvent_ClaimBatch` / `sp_outbox_claim_batch`,
using `UPDLOCK/READPAST` or `FOR UPDATE SKIP LOCKED` so multiple publisher
instances split the backlog safely), publishes each to SNS, and marks it
published only after the SNS call succeeds — all inside the **same**
database transaction the claim opened. If the process crashes anywhere in
that sequence, the transaction rolls back and the rows are simply still
unpublished; nothing is lost.

**Idempotent consumers** — SQS delivers at least once. Every consumer checks
a `ProcessedEvents`/`processed_events` ledger for the event's id, inside the
same transaction as the effect it's about to apply, before doing anything
(`usp_Order_ApplyPaymentResult`, `sp_payment_process`). A duplicate delivery
becomes a fast, safe no-op (`ALREADY_PROCESSED`) instead of a double charge
or a double status flip. This is directly exercised by
`apps/order-service/test/payment-result-idempotency.e2e-spec.ts` and
`apps/payment-service/test/payment-process-idempotency.e2e-spec.ts`.

**Retries & DLQs** — every SQS queue has a redrive policy (5 attempts before
its DLQ, provisioned by `infrastructure/localstack-init/01-bootstrap.sh`
locally). `docs/testing.md` describes the chaos-lite test that proves a
killed-and-restarted payment-service still eventually processes a message.

## Cross-service data references

`order-service`'s `CustomerId`/`ProductId` columns are typed
`UNIQUEIDENTIFIER` (SQL Server's GUID type) and reference documents in
user-service's/product-service's MongoDB collections. Since Mongo's default
`ObjectId` isn't GUID-shaped, both of those services override `_id` to a
UUID string (`randomUUID()`) instead — every cross-service reference in this
platform is a real UUID, enforced by application code rather than a
database-level foreign key (which would defeat independent deployability).

## The one deliberate deviation from the plan's illustrative SQL

`sp_payment_process`'s `PAYMENT_FAILED` outbox payload includes a `reason`
field (matching the event catalog's contract above), not just
`orderId`/`amount` — the plan's inline SQL sample used the same
`JSON_OBJECT` call for both branches, which would drop the field
notification-service needs to show *why* a payment failed. The stored
procedure in `apps/payment-service/src/database/migrations/` branches the
`JSON_OBJECT` call by outcome instead.

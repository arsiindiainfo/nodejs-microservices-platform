# Data Model

## SQL Server — order-service (`order_service`)

| Table | Purpose |
|---|---|
| `Orders` | One row per order; `RowVersion` for optimistic concurrency |
| `OrderItems` | Line items with a price/name **snapshot** at order time — never re-reads product-service's current price |
| `OutboxEvents` | Events written in the same local transaction as the domain change that caused them |
| `ProcessedEvents` | Dedup ledger for consumed events (idempotency check) |

Full DDL and every stored procedure live in
`apps/order-service/src/database/migrations/1700000000001-initial-schema.ts`,
run automatically (`migrationsRun: true`) the first time order-service
connects — no manual migration step.

### Stored procedures

| Procedure | Purpose |
|---|---|
| `usp_Order_Create` | Transactional create: order + line items + `ORDER_CREATED` outbox row, one transaction |
| `usp_Order_ConfirmAwaitingPayment` | `PENDING` → `AWAITING_PAYMENT`, immediately after create |
| `usp_Order_ApplyPaymentResult` | Idempotent: `ProcessedEvents` check under `UPDLOCK/HOLDLOCK`, then `AWAITING_PAYMENT` → `PAID`/`PAYMENT_FAILED` |
| `usp_Order_Cancel` | `PENDING` → `CANCELLED` only; `@CustomerId = NULL` means "any customer" (the ADMIN path) |
| `usp_Order_GetById` | One row; line items collapsed into a JSON column via `FOR JSON PATH` so the call stays a single result set |
| `usp_Order_ListByCustomer` | Paginated; `@CustomerId = NULL` means "all" (backs both the customer's own list and the ADMIN unscoped list); total count carried via `COUNT(*) OVER()` on every row |
| `usp_Order_ProductHasNonTerminalOrder` | Backs product-service's delete guard — "is this product referenced by a non-terminal order?" |
| `usp_Order_GetCustomerId` | Narrow, non-sensitive lookup so notification-service can resolve who a payment event belongs to |
| `usp_OutboxEvent_ClaimBatch` | `UPDLOCK, READPAST` — lets multiple publisher instances split the unpublished backlog |
| `usp_OutboxEvent_MarkPublished` | Sets `PublishedAt` after a successful SNS publish |

## MySQL — payment-service (`payment_service`)

| Table | Purpose |
|---|---|
| `payments` | One row per order's payment attempt — `UNIQUE KEY` on `order_id` is what makes a redelivered `ORDER_CREATED` idempotent *at the schema level*, not just in application logic |
| `outbox_events` | Same transactional-outbox pattern as order-service, MySQL dialect |
| `processed_events` | Same idempotency ledger |

Full DDL and procedures live in
`apps/payment-service/src/database/migrations/1700000000002-initial-schema.ts`.

### Stored procedures

| Procedure | Purpose |
|---|---|
| `sp_payment_process` | Idempotent create: checks `processed_events` under `FOR UPDATE`, simulates a payment outcome (`amount <= 5000` → `SUCCEEDED`, else `FAILED`), writes `payments` + `outbox_events` + `processed_events` in one transaction |
| `sp_payment_get_by_order` | Read backing `GET /orders/:id/payment` |
| `sp_outbox_claim_batch` | `FOR UPDATE SKIP LOCKED` — MySQL 8's equivalent of order-service's `READPAST` claim |
| `sp_outbox_mark_published` | Sets `published_at` |
| `sp_processed_event_record` | Small reusable insert for any future MySQL-side consumer |

OUT parameters ride on MySQL session variables (`CALL sp_x(..., @p_status, ...)`
then `SELECT @p_status`), so the CALL and the SELECT that reads them back
must run on the same connection — `payments.repository.ts` uses
`dataSource.createQueryRunner()` (which pins one) rather than the pooled
`DataSource.query()` for every OUT-parameter call.

## MongoDB — polyglot persistence

| Service | Collection | Shape |
|---|---|---|
| user-service | `users` | `{ _id (UUID), name, email (unique), passwordHash, role, status, createdAt }` |
| product-service | `products` | `{ _id (UUID), sku (unique), name, price, stockQty, createdAt, updatedAt }` |
| notification-service | `notifications` | `{ _id (UUID), userId, type, message, read, createdAt }`, indexed on `{ userId: 1, createdAt: -1 }` |

`_id` is a UUID string on every collection here, not Mongo's default
`ObjectId` — see `docs/architecture.md`'s note on cross-service references
for why.

## Redis — auth-service

`refresh:<sha256(refreshToken)>` → `JSON.stringify({ userId, email, role })`,
TTL-expired automatically. The refresh record caches the claims needed to
reissue an access token so `/auth/refresh` never needs a still-valid JWT to
authorize an internal lookup — the refresh token itself, checked against
Redis, is the credential. The Gateway also uses Redis for its sliding-window
rate limiter (`ratelimit:<userId|ip>`, a sorted set scored by timestamp).

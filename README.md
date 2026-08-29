# nodejs-microservices-platform

**Enterprise API Gateway + Microservices Demo** — a polyglot-persistence,
event-driven microservices platform for a fictional storefront, **DemoTech
Commerce**. One public API Gateway fronts six independently deployable
NestJS services, communicating synchronously over TCP and asynchronously
over SNS/SQS, each owning its own database (MongoDB, SQL Server, or MySQL),
with a transactional outbox, idempotent consumers, retries, dead-letter
queues, and centralized correlation-id logging.

Published by **Arsi India Info** under the MIT License (see
[`LICENSE`](./LICENSE) and [`TRADEMARK.md`](./TRADEMARK.md)).

## Why this project

Most "microservices demo" repos are a handful of CRUD services that happen
to run in separate processes. This one exists to prove the harder,
less-commonly-demonstrated half of distributed-systems engineering:

- **Transactional outbox** in both SQL Server and MySQL — a domain write and
  its published event never disagree, even if the process crashes between
  them.
- **Idempotent event consumers** using each database's native locking
  (SQL Server `UPDLOCK`/`HOLDLOCK`, MySQL `FOR UPDATE`) so at-least-once
  delivery never double-applies an effect.
- **Zero-trust service-to-service auth** — every service independently
  verifies the JWT signature, not just the Gateway.
- **Genuine polyglot persistence** — the right database per service's access
  pattern, not one database used everywhere out of convenience.

The full architecture/design rationale lives in the original plan document;
this README covers what's built and how to run it.

## Architecture

```
                         ┌──────────────┐
        Browser / API ──▶│   Gateway    │  (only public HTTP surface, /api/v1/*)
                         └──────┬───────┘
                                │ TCP (JWT re-verified at every hop)
        ┌───────────┬──────────┼───────────┬──────────────┬──────────────┐
        ▼           ▼          ▼           ▼              ▼              ▼
  auth-service  user-service  product-  order-service  payment-      notification-
  (Redis)       (MongoDB)     service    (SQL Server)   service       service
                              (MongoDB)                  (MySQL)       (MongoDB)
                                             │              │
                                             │ outbox       │ outbox
                                             ▼              ▼
                                        SNS: order-events   SNS: payment-events
                                             │                    │
                              ┌──────────────┴───────┐   ┌────────┴───────────────┐
                              ▼                       ▼   ▼                        ▼
                       payment-service         notification-service      order-service
                       (SQS consumer)          (SQS consumer)             (SQS consumer)
```

- **Gateway**: the only service reachable from the internet. Reverse-proxies
  every route to the owning service over TCP, and composes the order-detail
  endpoint with a best-effort payment-status lookup.
- **auth-service**: stateless JWT issuance; refresh tokens in Redis.
- **user-service**: users/roles in MongoDB — the only service that ever sees
  a password hash.
- **product-service**: catalog + stock in MongoDB, with atomic per-line-item
  stock reservation.
- **order-service**: orders in SQL Server via stored procedures, with a
  transactional outbox publisher.
- **payment-service**: simulated payments in MySQL via stored procedures,
  reacting only to `ORDER_CREATED` — there is no API to trigger a charge
  directly.
- **notification-service**: an in-app notification log in MongoDB, built
  from both event streams.

See the plan document for the full API surface, database schemas, stored
procedures, and event catalog.

## Tech stack

Node.js 20 · NestJS 11 (monorepo: `apps/` + `libs/`) · TypeORM (SQL Server +
MySQL) · Mongoose (MongoDB) · ioredis (Redis) · `@aws-sdk/client-sns` /
`client-sqs` · LocalStack (SNS/SQS locally, no AWS account needed) · Docker
Compose.

## Quick start

Requires Docker Desktop. Everything — all 6 services, the Gateway, all 4
data stores, LocalStack, and a seed job — comes up with one command:

```bash
cd infrastructure
cp .env.example .env
docker compose up --build
```

This brings up:

| # | Service | Notes |
|---|---|---|
| 1 | `mssql`, `mysql`, `mongo`, `redis`, `localstack` | data stores + local AWS emulation |
| 2 | `mssql-init` | one-shot: creates the `order_service` database |
| 3 | `gateway` + 6 services | the platform itself |
| 4 | `seed` | one-shot: demo admin/customer accounts + a small product catalog |

Once `seed` finishes (check `docker compose logs seed`), the API is ready at
`http://localhost:3000/api/v1`, with interactive docs at
`http://localhost:3000/api/docs`. The seed job prints the demo admin and
customer credentials it created.

### Placing an order end to end

```bash
# Login as the seeded customer (see `docker compose logs seed` for the password)
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"customer@demotech.example","password":"<from seed log>"}' \
  | jq -r '.data.accessToken')

# Browse the catalog, then place an order
curl -s http://localhost:3000/api/v1/products -H "Authorization: Bearer $TOKEN"

curl -s -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"items":[{"productId":"<a product id>","quantity":1}]}'

# Poll the order — it moves AWAITING_PAYMENT -> PAID within a few seconds
curl -s http://localhost:3000/api/v1/orders/<orderId> -H "Authorization: Bearer $TOKEN"
```

## Repository layout

```
backend/          NestJS monorepo — apps/ (7 services), libs/ (common, events, messaging)
frontend/         React + Vite (scaffolded; UI screens not yet built)
infrastructure/   docker-compose.yml, per-app Dockerfile, LocalStack bootstrap, seed job
docs/             Architecture, data model, testing, deployment, contributing
```

## Documentation

- [`docs/frontend-setup.md`](./docs/frontend-setup.md) — status (not yet built) and expected shape
- [`docs/architecture.md`](./docs/architecture.md) — service ownership, event catalog, outbox/idempotency
- [`docs/data-model.md`](./docs/data-model.md) — both relational schemas, stored procedures, Mongo collections
- [`docs/backend-setup.md`](./docs/backend-setup.md) — running a single service locally without Docker
- [`docs/testing.md`](./docs/testing.md) — per-service tests, the cross-service saga test, the chaos-lite test
- [`docs/deployment.md`](./docs/deployment.md) — Docker Compose (primary) and AWS/Terraform (optional, documented not built)
- [`docs/contributing.md`](./docs/contributing.md) — branch naming, commit style, required checks
- [`docs/portfolio-demo.md`](./docs/portfolio-demo.md) — a 5-minute API-driven walkthrough

## Status

Backend (Phases 0–4 of the build plan) is complete: monorepo foundation,
identity & catalog, order + outbox, payment + idempotency, and notifications
with Gateway composition. The frontend and the admin health
dashboard/event-trail screens (Phase 5) are not yet built — everything above
is exercised through the API directly.

---

© 2026 Arsi India Info. All rights reserved.

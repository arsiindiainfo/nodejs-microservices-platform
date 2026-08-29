# Portfolio Demo Script (~5 minutes)

There's no frontend yet (see the repo README's Status section), so this walks
the same story the plan's UI-based demo would tell, through the API
directly. Everything below assumes `docker compose up --build` is running
from `infrastructure/` and the `seed` job has finished
(`docker compose logs seed`).

## 1. Show the one public surface (30s)

```bash
curl -s http://localhost:3000/api/v1/about | jq
```

Point out: one Gateway, `/api/v1` prefix, and the branding metadata (§32.2).
Then open `http://localhost:3000/api/docs` — the full OpenAPI surface,
generated from the Gateway's own decorators.

## 2. Log in and browse the catalog (30s)

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"customer@demotech.example","password":"<seed log password>"}' \
  | jq -r '.data.accessToken')

curl -s http://localhost:3000/api/v1/products -H "Authorization: Bearer $TOKEN" | jq
```

Point out: every route past `/auth/*` requires this bearer token, and the
Gateway re-verifies it — then so does every internal service it talks to.

## 3. Place an order and watch it move (90s — the main event)

```bash
PRODUCT_ID=$(curl -s http://localhost:3000/api/v1/products -H "Authorization: Bearer $TOKEN" | jq -r '.data.items[0].id')

ORDER=$(curl -s -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}]}")
echo "$ORDER" | jq   # status: AWAITING_PAYMENT

ORDER_ID=$(echo "$ORDER" | jq -r '.data.id')

# Poll — reaches PAID within a couple of seconds as the event chain runs
watch -n1 "curl -s http://localhost:3000/api/v1/orders/$ORDER_ID -H 'Authorization: Bearer $TOKEN' | jq '.data.status, .data.payment'"
```

While that's polling, narrate the chain from `docs/architecture.md`'s
diagram: order-service's outbox publisher picks up the `ORDER_CREATED` row,
publishes to SNS, payment-service's SQS consumer picks it up,
`sp_payment_process` simulates the charge and publishes `PAYMENT_SUCCEEDED`,
order-service's own SQS consumer applies it via
`usp_Order_ApplyPaymentResult`. Nothing in this path was synchronous beyond
the initial "order accepted" response.

```bash
curl -s http://localhost:3000/api/v1/notifications -H "Authorization: Bearer $TOKEN" | jq
```

Two notifications should be there: `ORDER_PLACED` and `PAYMENT_SUCCEEDED` —
produced by notification-service independently consuming both event
streams.

## 4. Prove idempotency isn't just a claim (60s)

```bash
cd backend
npm run test:saga
```

This is the exact flow above, automated and asserted — new throwaway
accounts, a real order, polling for `PAID`, checking both notifications
landed. Then, the deeper claim:

```bash
npm run test:chaos
```

This kills the `payment-service` container immediately after placing an
order, restarts it a few seconds later, and asserts the order **still**
reaches `PAID` — the message wasn't lost, and if it *had* been redelivered,
`processed_events`/`ProcessedEvents` would have caught the duplicate rather
than double-charging.

## 5. Show a rejection path (30s)

```bash
# Amount over 5000 deterministically fails in the payment simulation (sp_payment_process)
curl -s -X POST http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Expensive Thing","sku":"EXPENSIVE-001","price":9999,"stockQty":5}'
# ...place an order for it, poll — reaches PAYMENT_FAILED with a reason
```

## What's not in this demo

The admin health dashboard and event-trail screens (Phase 5) and the actual
frontend UI aren't built yet — everything above is the same underlying
system, shown through `curl` instead of a browser.

# Deployment

## Docker Compose — the primary path

`docker compose up --build` from `infrastructure/` is the "clone and run"
path for a reviewer — no AWS account required. It brings up:

- **Data stores**: `mssql`, `mysql`, `mongo`, `redis`
- **`localstack`**: emulates SNS + SQS locally. Its init script
  (`infrastructure/localstack-init/01-bootstrap.sh`) runs automatically once
  LocalStack reports ready, provisioning both SNS topics and all four SQS
  queues + their DLQs + redrive policies + subscriptions (with
  `RawMessageDelivery: true`, so a consumed SQS message body is exactly the
  event envelope, no SNS wrapper).
- **`mssql-init`**: a one-shot job creating the `order_service` database —
  SQL Server has no "create database from an env var" equivalent the way
  MySQL/Mongo do.
- **`gateway`** + the **6 services**, each with its own `environment:` block
  (container-network hostnames like `mssql`, `mongo`, `localstack` — see
  `docker-compose.yml`'s `x-jwt-env`/`x-aws-env` anchors for what's shared).
- **`seed`**: a one-shot Node job (`infrastructure/seed/`) that registers a
  demo admin + customer account and a small product catalog through the
  real API, so a reviewer can place an order immediately. See its header
  comment for why creating the first ADMIN needs a direct MongoDB write —
  there's no self-service role elevation.

### Environment variables

`infrastructure/.env.example` documents the data-store passwords used across
the compose file (copy it to `.env` in the same directory before running).
Each service's own `apps/<service>/.env.example` documents the same
variables from that service's point of view, for running it standalone (see
`docs/backend-setup.md`) — those are **not** read by Docker Compose itself,
which sets everything directly via `environment:` blocks using
container-network hostnames.

### Cost

This is a local-only path: nothing here talks to real AWS, so it costs
nothing to run repeatedly.

## AWS — documented, not built

The plan's original design calls for an AWS path (API Gateway in front of
the Gateway service on ECS/Fargate, RDS for SQL Server/MySQL, real SNS/SQS,
a Lambda for DLQ alerting/replay) as an optional "deploy for a demo, not
deploy-and-forget" path, provisioned via Terraform under
`infrastructure/aws/`. **That Terraform was not written as part of this
build** — the Docker Compose path above is the only way to run this project
today. If you build it out, treat it the way the plan intends: bring it up
right before a walkthrough on Fargate Spot where possible, and
`terraform destroy` (or at minimum stop the RDS instances) the same day.
Seven always-on Fargate tasks plus two RDS engines is a real production-shaped
cost if left running continuously.

## What a real production hardening pass would still need

This project optimizes for demonstrating the event-driven patterns clearly,
not for being deploy-ready as-is. Before running it as more than a demo, at
minimum:

- Replace the shared `JWT_ACCESS_SECRET` (symmetric HS256, chosen for
  simplicity — see `libs/common/src/jwt/jwt-common.module.ts`) with per-service
  asymmetric keys or a proper secrets-rotation story.
- Move every `DemoTech!...` password in `.env.example` files to a real
  secrets manager; none of them are meant to survive contact with a real
  deployment.
- Add the DLQ-depth alerting Lambda and the admin health dashboard (Phase 5)
  so a stuck queue is actually visible without reading container logs.

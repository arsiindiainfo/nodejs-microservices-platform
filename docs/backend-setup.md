# Backend Setup (running services individually, without Docker)

The Docker Compose path (`docs/deployment.md`) is the recommended way to run
the whole platform. This doc is for working on a single service locally —
useful when iterating on one service's code without rebuilding a container
each time.

## Prerequisites

- Node.js 20+
- The data stores this service needs, reachable somehow — either via
  `docker compose up mssql mysql mongo redis localstack` from
  `infrastructure/` (bring up just the infra, not the app containers), or
  your own local installs.

## One-time setup

```bash
cd backend
npm install
```

## Per-service `.env`

Every app under `apps/*/` has an `.env.example` documenting exactly the
variables its `env.schema.ts` requires (Joi-validated at boot — a service
refuses to start rather than run with a missing connection string). Copy it:

```bash
cp apps/order-service/.env.example apps/order-service/.env
```

Each service's `ConfigModule.forRoot()` points `envFilePath` at that exact
file (`apps/<service>/.env`), so this only works when you run commands from
the `backend/` directory — that's where Nest CLI's monorepo commands expect
to run from anyway.

## Running one service

```bash
npx nest start order-service          # one-shot
npx nest start order-service --watch  # rebuild on change
```

The Gateway is HTTP-only; every other service is a hybrid app — HTTP for
`/health` + `/health/ready`, TCP for its `@MessagePattern` handlers. On
first connection to its database, `order-service` and `payment-service` each
run their TypeORM migration automatically (`migrationsRun: true`) — no
manual migration step, but the target database must already exist (SQL
Server needs `order_service` created by hand if you're not using the
`mssql-init` compose job; MySQL/Mongo create their databases implicitly).

## Running everything locally at once

Each service's default `.env.example` already points at `localhost` for
every dependency (data stores, and every other service's host/port), so if
you bring up the infra containers and start all 7 apps in separate
terminals, they'll find each other. There's no single "start everything"
script for the non-Docker path — that's exactly what `docker compose up` is
for.

## Building for production

```bash
npx nest build <app-name>
node dist/apps/<app-name>/main.js
```

`infrastructure/docker/Dockerfile` does exactly this in its `build` stage,
parameterized by `APP_NAME` — one Dockerfile builds all seven apps.

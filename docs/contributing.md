# Contributing

## Branch naming

`<type>/<short-description>`, e.g. `feat/order-cancel-endpoint`,
`fix/payment-idempotency-race`. Types match the Conventional Commits types
below.

## Commit style — Conventional Commits

```
<type>(<scope>): <short summary>

<optional body — the *why*, not a restatement of the diff>
```

- **Types**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`
- **Scope**: the app/lib touched, e.g. `order-service`, `libs/common`, `gateway`
- Example: `fix(payment-service): guard sp_payment_process against a NULL amount`

## Pull requests

- One logical change per PR. A bug fix doesn't need surrounding cleanup; a
  new endpoint doesn't need an unrelated refactor riding along.
- Describe *why*, not just *what* — the diff already shows what changed.

## Required checks (CI)

Every PR runs `.github/workflows/ci.yml`:

1. `npm run lint` — ESLint (flat config, type-checked rules) + Prettier
2. `npm run license-header-check` — every `.ts` file under `apps/`/`libs/`
   carries the copyright header (§32.2)
3. `npx tsc --noEmit -p tsconfig.build.json` — the whole monorepo compiles
4. `npm test` — unit tests
5. `npx nest build <app>` for all 7 apps — confirms webpack/decorator
   metadata resolves correctly, which a plain `tsc` check alone can miss

The cross-service saga test and the chaos-lite test (`docs/testing.md`) are
**not** part of CI — they need the full Docker Compose stack (and, for
chaos-lite, `docker` control over a running container), which isn't
available in a standard CI runner without additional setup. Run them
locally before a release: `npm run test:integration` from `backend/` with
`docker compose up` already running.

## Code style

- No comments explaining *what* code does — names should already say that.
  A comment earns its place only when it explains a non-obvious *why* (a
  hidden constraint, a workaround, a reconciliation of a spec ambiguity).
- Every cross-service DTO and contract type lives in `libs/common` — a field
  rename there is a compile error at every call site, not a silent runtime
  mismatch.
- New stored procedures: `CREATE OR ALTER PROCEDURE` (SQL Server) so a later
  migration can safely redefine one; MySQL has no equivalent, so
  `DROP PROCEDURE IF EXISTS` + `CREATE PROCEDURE` in the migration's `down()`.

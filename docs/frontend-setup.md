# Frontend Setup

**Status: not yet built.** `frontend/` is still the default React + TypeScript
+ Vite scaffold — none of the eight screens from the plan (login/register,
catalog, orders, notifications, admin products/orders, admin health
dashboard, event trail) have been implemented.

Everything the frontend would call already works and is documented:

- The full API surface is live at `http://localhost:3000/api/v1` with
  interactive docs at `http://localhost:3000/api/docs` once
  `docker compose up` is running (`docs/deployment.md`).
- `docs/portfolio-demo.md` walks the same story the UI would tell, through
  `curl` instead of a browser.

When the frontend is built, `npm install && npm run dev` from `frontend/`
against `VITE_API_BASE_URL=http://localhost:3000/api/v1` is the expected
shape — the backend imposes no other frontend-specific setup, since the
Gateway is a plain REST/JSON API behind one base URL (§14 of the plan: "the
frontend never talks to an internal service directly... there is exactly
one base URL configured in the entire React app").

# PaySplit API

Backend for **PaySplit**: users get a salary account, set split rules, and every salary payment is split automatically into savings wallets (rent, savings, emergency fund…).

**Stack:** Node 22 · Express 5 · TypeScript (ESM) · Prisma 7 · PostgreSQL on Neon · Neon Object Storage · Dojah (KYC sandbox) · Zod · Vitest · Docker · Render

- Interactive API docs: `GET /docs` (Swagger UI) · OpenAPI JSON: `GET /docs-json`
- Health check: `GET /health`
- Every endpoint lives under `/api/v1`

---

## Quick start

```bash
cd paysplit-backend
cp .env.example .env              # then fill in the values (see "Configuration")
npm install                       # also generates the Prisma client
npm run db:deploy                 # apply migrations to the database in DATABASE_URL/DIRECT_URL
npm run db:seed                   # wallet categories (safe to re-run)
npm run dev                       # http://localhost:4000, docs at /docs
```

Run without Dojah or Neon by pointing at the local Postgres and the mock KYC provider:

```bash
docker compose up -d              # Postgres on localhost:54329
DATABASE_URL=postgresql://paysplit:paysplit@localhost:54329/paysplit \
DIRECT_URL=postgresql://paysplit:paysplit@localhost:54329/paysplit \
KYC_PROVIDER=mock npm run dev
```

### Tests

```bash
docker compose up -d   # tests use a separate `paysplit_test` database on the same server
npm test               # creates, migrates and seeds the test database automatically
npm run check          # format check + lint (0 warnings) + typecheck + tests
```

The suite (35 tests) runs the real HTTP app against a real Postgres. Only KYC is swapped for the mock provider. It covers: auth and token revocation, every KYC step including lockouts and shared sandbox IDs, wallets, rule allocation limits, salary credit with automatic splitting, idempotency, concurrent withdrawals, CSV export (including formula-injection protection), dashboard numbers, and notification preferences.

---

## How it works

### The money flow

```
employer ──salary──▶ Salary account ──split rules (priority order)──▶ Wallets
                          ▲                                             │
                          └───────────── "Move" (back to salary) ◀──────┘
```

1. **Sign up** with names, email and password (no email verification).
2. **KYC** (Dojah): profile (country + phone) → identity (BVN/NIN in Nigeria, passport/driver's licence elsewhere) → selfie liveness. Passing KYC moves the user to **tier 2** and **issues a salary account** (a 10-digit account number at a simulated bank).
3. **Setup:** monthly salary and payday → wallets → split rules (fixed ₦ amount or % of salary, one rule per wallet, in priority order).
4. **Money in:** `POST /simulations/salary-credit` stands in for an employer's transfer. It credits the account and runs the split straight away.
5. **Money out of a wallet:** `POST /wallets/:id/move` returns money to the salary account.

### Split engine (`src/modules/split-runs/split-engine.ts`)

- Rules run **lowest priority number first**, then oldest first.
- Percentages are of the **amount credited** for an automatic run, or of the **monthly salary** for a manual run ("Run split now"). Fixed rules move their exact amount.
- A rule that doesn't fit in what is left is **skipped whole**, never paid in part. Each run records skipped rules and the reason (`INSUFFICIENT_FUNDS`).
- The salary account row is locked (`SELECT … FOR UPDATE`) for the whole run, and the credit, allocations, ledger rows, run record and notifications commit in **one database transaction**. A crash can't leave money half-moved.

### Money correctness

- **Integer kobo everywhere** (₦1 = 100 kobo), stored as `BIGINT`. Percentages are stored as basis points (20.5% → `2050`), so there is no floating-point money. Percentage amounts round down, so a split never moves more than exists.
- **No negative balances:** wallet withdrawals use a conditional decrement (`UPDATE … WHERE balance >= amount`). The tests fire three concurrent withdrawals at the same balance and check that exactly one succeeds.
- **Idempotent credits:** send `Idempotency-Key` on `POST /simulations/salary-credit`. A retry returns the original result (`200`, `replayed: true`) instead of paying twice. A unique `(userId, idempotencyKey)` index enforces this even under races.
- **A single ledger** (`Transaction`) records every movement. A row is worded from the point of view of the list showing it. A wallet allocation is _"Split to Rent" (out)_ in the salary account's history and _"Allocated from salary" (in)_ in the wallet's. History is kept when a wallet is deleted.
- Rules can't over-allocate. The active rules' planned total must fit in the monthly salary (`422 ALLOCATION_EXCEEDS_SALARY`). Paused rules don't count.

### KYC with Dojah (sandbox)

`src/integrations/kyc/` defines a `KycProvider` interface with two implementations:

| Provider          | Used for                                     | Calls                                                                                                           |
| ----------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `DojahProvider`   | dev / production (`KYC_PROVIDER=dojah`)      | `GET /api/v1/kyc/bvn/full`, `GET /api/v1/kyc/nin`, `POST /api/v1/document/analysis`, `POST /api/v1/ml/liveness` |
| `MockKycProvider` | tests and offline work (`KYC_PROVIDER=mock`) | none                                                                                                            |

- **Sandbox test values** (from Dojah): BVN **`22222222222`**, NIN **`70123456789`**. Many test users can share them: the API doesn't block an ID already used by another account, and the record's name doesn't have to match the user's name unless `KYC_ENFORCE_NAME_MATCH=true` (the sandbox always returns the same test person).
- **Privacy:** the full BVN/NIN is never stored or logged. Only a masked value (`*******2222`) is kept, and uploaded images go straight to Dojah from memory.
- **Attempts:** 3 failed attempts per step lock that step for 1 hour (`429 KYC_ATTEMPTS_EXCEEDED` with `retryAvailableAt`). If Dojah is down (`503 KYC_PROVIDER_UNAVAILABLE`), no attempt is used up.
- Users who verify with a foreign document pass KYC but still need a BVN/NIN for a Nigerian account. `GET /salary-account` then returns `actionRequired: "add_bvn_or_nin"`, and `POST /salary-account/identity` completes it.

### Security

- Passwords: bcrypt (cost 12), with the same strength rule the frontend shows. Login takes about the same time for unknown emails, so attackers can't find out which emails have accounts.
- JWT (HS256, 24h, or 30 days with "remember me"). Each token carries a **token version**: logout and password change increment it, which **revokes every older token** at once.
- Rate limits per IP: signup 5/min, login 10/min, KYC/money endpoints 10/min, everything 300/min.
- Helmet headers, a CORS allow-list, 100KB JSON bodies, 5MB image uploads (JPG/PNG/WebP only), and redacted logs (no tokens, passwords or ID numbers).
- Every query is scoped to the signed-in user. Another user's wallet returns `404`, not `403`.

---

## API conventions

These match what the frontend (`../paysplit`) already expects.

- **Success:** the resource itself, e.g. `{ accessToken, user, onboarding }` or a `Wallet`.
- **Lists:** `{ data: [...], pagination: { total, page, limit, pages } }` (`?page=1&limit=10`, max 100).
- **Errors:**

  ```json
  {
    "statusCode": 422,
    "message": "…",
    "error": "Unprocessable Entity",
    "code": "ALLOCATION_EXCEEDS_SALARY"
  }
  ```

  `message` is a **string array** for validation errors (`code: "VALIDATION_ERROR"`). `code` is stable and machine-readable; each endpoint's codes are listed in `/docs`.

- **Money:** integer kobo. **Dates:** ISO-8601 instants; filters take `YYYY-MM-DD` in Lagos time (WAT, UTC+1).
- **Auth:** `Authorization: Bearer <accessToken>`.

### Endpoints (50)

| Area           | Endpoints                                                                                                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth           | `POST /auth/signup` · `POST /auth/login` · `GET /auth/me` · `POST /auth/logout` · `POST /auth/password/change`                                                                                  |
| Users          | `GET /users/me/profile` · `PATCH /users/me` · `GET/PUT /users/me/notification-preferences` · `PUT/DELETE /users/me/profile-image`                                                               |
| KYC            | `GET /kyc/countries` · `GET /kyc/status` · `PUT /kyc/profile` · `POST /kyc/identity/nigeria` · `POST /kyc/identity/international` · `POST /kyc/liveness`                                        |
| Setup          | `GET/PUT /setup/income` · `GET /setup/progress`                                                                                                                                                 |
| Salary account | `GET /salary-account` · `POST /salary-account/identity`                                                                                                                                         |
| Wallets        | `GET /categories` · `GET/POST /wallets` · `GET /wallets/accent-colors` · `GET /wallets/activity` · `GET/PATCH/DELETE /wallets/:id` · `GET /wallets/:id/transactions` · `POST /wallets/:id/move` |
| Split rules    | `GET /split-rules/summary` · `GET/POST /split-rules` · `GET/PATCH/DELETE /split-rules/:id`                                                                                                      |
| Split runs     | `GET/POST /split-runs` · `GET /split-runs/:id`                                                                                                                                                  |
| Transactions   | `GET /transactions` · `GET /transactions/export` (CSV) · `GET /transactions/:id`                                                                                                                |
| Dashboard      | `GET /dashboard/summary` · `GET /dashboard/cash-flow`                                                                                                                                           |
| Notifications  | `GET /notifications` · `POST /notifications/:id/read` · `POST /notifications/read-all`                                                                                                          |
| Simulations    | `POST /simulations/salary-credit`                                                                                                                                                               |

**Out of scope for this build:** beneficiaries (and beneficiary payouts), email verification and forgot password, transaction PIN, display preferences (currency/language/theme), bank lookup, and device management.

---

## Configuration

All settings are environment variables, checked at startup: the app refuses to start and lists what's wrong. `.env.example` documents each one.

| Variable                                                                          | Required       | Notes                                                                                      |
| --------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                                                                    | yes            | Neon **pooled** connection string (host contains `-pooler`)                                |
| `DIRECT_URL`                                                                      | for migrations | Neon **direct** connection string (migrations can't run through the pooler)                |
| `JWT_SECRET`                                                                      | yes            | ≥ 32 random characters (`openssl rand -base64 48`)                                         |
| `CORS_ORIGINS`                                                                    | yes            | Comma-separated, e.g. `http://localhost:3000,https://paysplit.vercel.app`                  |
| `KYC_PROVIDER`                                                                    |                | `dojah` (default) or `mock`                                                                |
| `DOJAH_APP_ID`, `DOJAH_SECRET_KEY`                                                | with dojah     | From the Dojah dashboard (sandbox mode)                                                    |
| `DOJAH_BASE_URL`                                                                  |                | Default `https://sandbox.dojah.io`                                                         |
| `KYC_ENFORCE_NAME_MATCH`                                                          |                | Default `false` (sandbox)                                                                  |
| `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` | for photos     | Neon Object Storage credentials. Without them, photo upload returns `503 STORAGE_DISABLED` |
| `STORAGE_BUCKET`                                                                  | for photos     | A `public_read` bucket (e.g. `paysplit`)                                                   |
| `ENABLE_SIMULATIONS`                                                              |                | Default `true`; `false` removes `/simulations/*`                                           |
| `TRUST_PROXY`                                                                     | on Render      | `1` (correct client IPs for rate limiting)                                                 |
| `PORT`, `LOG_LEVEL`, `NODE_ENV`                                                   |                | Defaults `4000`, `info`, `development`                                                     |

---

## Deploying to Render

The repo root has a [Render Blueprint](../render.yaml). It builds this folder's `Dockerfile`, health-checks `/health`, and only redeploys when files under `paysplit-backend/` change.

1. In Render: **New → Blueprint** and pick this repository.
2. Fill in the secrets it asks for: `DATABASE_URL`, `DIRECT_URL`, `CORS_ORIGINS`, the Dojah keys and the storage keys. Render generates `JWT_SECRET`.
3. Each deploy runs `prisma migrate deploy` before the server starts, so new migrations apply automatically.
4. Seed categories once (Render Shell, or locally against the Neon `DIRECT_URL`): `npm run db:seed`.
5. Point the frontend at it: `NEXT_PUBLIC_API_BASE_URL=https://<service>.onrender.com/api/v1`.

Render's free plan sleeps after inactivity, so the first request after a while can take about 30 seconds.

---

## Project layout

```
src/
  app.ts                  Express app: security middleware, routers, docs, error handler
  server.ts               HTTP server + graceful shutdown
  config/env.ts           Validated environment (Zod)
  lib/                    http (route helper + docs), errors, prisma, jwt, money, dates, storage, …
  middleware/             auth, rate limits, uploads, error handler
  integrations/kyc/       KycProvider interface, Dojah and mock implementations
  modules/<area>/         *.routes.ts (HTTP + validation + docs) · *.service.ts (logic) · *.presenter.ts (response shape)
prisma/                   schema, migrations, seed
test/                     Vitest + Supertest suites against a real Postgres
```

Each route is declared once with `route({ method, path, body, query, params, handler, errors })`. That one declaration validates input with Zod, runs the handler, sends JSON and writes the OpenAPI docs, so the docs can't drift from the code.

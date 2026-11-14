# PaySplit

Salary splitting made automatic. A user gets a salary account. Every time salary lands, PaySplit splits it into savings wallets (rent, savings, emergency fund…) using rules the user sets: a fixed amount or a percentage, applied in priority order.

| Folder | What it is | Stack |
| --- | --- | --- |
| [`paysplit/`](paysplit/README.md) | Web app | Next.js 16, React 19, Tailwind v4, TanStack Query |
| [`paysplit-backend/`](paysplit-backend/README.md) | REST API (50 endpoints, docs at `/docs`) | Express 5, TypeScript, Prisma 7, Neon Postgres, Neon Object Storage, Dojah KYC |

## Run it locally

You need Node 22+ and Yarn 4 (`corepack enable`).

```bash
# 1. Backend: http://localhost:4000 (API docs at /docs)
cd paysplit-backend
cp .env.example .env        # fill in Neon, Dojah and storage values
npm install
npm run db:deploy && npm run db:seed
npm run dev

# 2. Frontend: http://localhost:3000 (in a second terminal)
cd paysplit
cp .env.example .env.local  # NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
yarn install
yarn dev
```

## Try the whole flow

1. **Sign up** with names, email and a strong password (e.g. `Str0ng!Pass`). There's no email verification.
2. **KYC:** choose Nigeria, enter any phone number, then verify with the Dojah sandbox **BVN `22222222222`** or **NIN `70123456789`** (every test user can reuse them), then take a selfie. KYC moves you to tier 2 and issues your salary account.
3. **Setup:** monthly salary and payday → wallets → split rules.
4. On the dashboard, **Simulate salary** pays a fake salary into the account and splits it into your wallets straight away.
5. Explore the transactions (filters, CSV export), wallet history, moving money back to the salary account, notifications and profile settings.

> **Sandbox note:** Dojah's sandbox gives the same canned liveness and document verdict for every image. In sandbox mode the API ignores that verdict (`DOJAH_SANDBOX_TRUST_CHECKS`), so selfies and ID documents are **not actually checked**. Against Dojah's live API they are. See the backend README.

## Deployment

- **Backend:** Render, from [`render.yaml`](render.yaml) (Docker, runs migrations on each deploy, health-checked at `/health`).
- **Frontend:** set `NEXT_PUBLIC_API_BASE_URL` to the Render URL plus `/api/v1`, and add the frontend's origin to the backend's `CORS_ORIGINS`.

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs on every PR. It checks formatting, lint, types, tests and the build for both apps, and for the backend it runs the test suite against a real Postgres and builds the Docker image.

## Scope

Built: auth, KYC (Dojah), salary account, income setup, wallets, split rules, automatic and manual split runs, simulated salary credits, transactions with CSV export, dashboard and cash flow, in-app notifications, profile photo upload.

Not in this build: beneficiaries and payouts to them, email verification and password reset, transaction PIN, display preferences, bank lookup, device management.

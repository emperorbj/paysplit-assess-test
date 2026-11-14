# PaySplit frontend

Next.js 16 (App Router, Turbopack) + Tailwind CSS v4 + Base UI + TanStack Query. It sends salary into wallets automatically using the user's split rules. It talks to the API in [`../paysplit-backend`](../paysplit-backend/README.md).

## Getting started

```bash
yarn install            # Yarn 4 (node-modules linker, see .yarnrc.yml)
cp .env.example .env.local
yarn dev                # http://localhost:3000
```

`.env.local` needs one value, the backend origin plus `/api/v1`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

It is inlined at build time, so restart `yarn dev` after changing it.

| Script | |
| --- | --- |
| `yarn dev` | Dev server (Turbopack) |
| `yarn build` / `yarn start` | Production build / server |
| `yarn lint` / `yarn typecheck` | ESLint / TypeScript |
| `yarn test` | Vitest unit tests |
| `yarn check` | Format check + lint + typecheck + tests (run before pushing) |

## Screens

| Route | Screen |
| --- | --- |
| `/` | Landing page, plus the login / sign-up / welcome modals |
| `/kyc` | KYC: profile → BVN/NIN or ID document → selfie |
| `/dashboard` | Stats, salary partition, cash flow, recent activity, **Simulate salary** |
| `/destinations`, `/destinations/[walletId]` | Wallets, wallet detail (history, move money back) |
| `/split-rules` | Rules, allocation bar, split history, "Run split now" |
| `/transactions` | Ledger with filters, receipt modal, CSV export |
| `/profile` | Personal details, salary income, notifications, photo, password |

## How the code is organised

- `app/`: routes. `(app)/` holds the signed-in shell (header + auth gate).
- `services/<domain>.service.ts`: plain functions that call the API through the single axios client in `lib/api/client.ts`.
- `hooks/<domain>/use-*.ts`: TanStack Query hooks around those services. Components only use hooks.
- `types/api/`: request/response types that mirror the backend.
- `components/ui/`: shared UI kit. `components/<feature>/`: feature components.

API conventions, endpoints and error codes: [docs/API.md](docs/API.md). Screen ↔ endpoint map: [docs/SCREENS-AND-ENDPOINTS.md](docs/SCREENS-AND-ENDPOINTS.md).

Beneficiaries are still mock data (`lib/destinations.ts`); they are out of scope for this build.

## Deployment

The frontend needs `NEXT_PUBLIC_API_BASE_URL` set at build time to the deployed backend (`https://<service>.onrender.com/api/v1`), and the frontend's origin must be in the backend's `CORS_ORIGINS`. The previous Cloud Run setup is described in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

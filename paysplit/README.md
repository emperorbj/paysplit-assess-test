# PaySplit frontend

Next.js 16 (App Router, Turbopack) + Tailwind CSS v4 + Base UI. Automates salary
partitions into wallets and beneficiaries.

## Getting started

```bash
yarn install            # Yarn 4 (node-modules linker, see .yarnrc.yml)
cp .env.example .env.local
yarn dev                # http://localhost:3000
```

| Script | |
| --- | --- |
| `yarn dev` | Dev server (Turbopack) |
| `yarn build` / `yarn start` | Production build / server |
| `yarn lint` / `yarn typecheck` | ESLint / TypeScript |
| `yarn format` | Prettier |

## Structure

- `app/`: routes. `(app)/` holds the signed-in shell (header + pages).
- `components/ui/`: shared UI kit; `components/<feature>/`: feature components.
- `lib/`: formatting helpers and **mock data** (`dashboard`, `destinations`,
  `rules`, `transactions`, `session`). Look for `TODO` comments where the API plugs in.
- `lib/api.ts`: `NEXT_PUBLIC_API_BASE_URL` + `apiFetch()` for integrations.

## Branches & deployment

`develop` auto-deploys to Cloud Run (europe-west1) via `cloudbuild.yaml`.
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the GCP setup.

@AGENTS.md

# PaySplit frontend: working agreements

Next.js 16 App Router + Tailwind v4 + Base UI. Yarn 4 (node-modules linker). Run
`yarn check` (format check, lint, typecheck, unit tests) before finishing any
change, plus `yarn build` for anything touching routes or config.

Quality gates:

- **pre-commit** (husky + lint-staged): ESLint `--fix` and Prettier on staged files.
- **pre-push**: `yarn typecheck && yarn lint && yarn test`.
- **CI** (`.github/workflows/ci.yml`, every PR into `develop`/`main`): format,
  lint (zero warnings), typecheck, Vitest, `next build`. Don't bypass hooks with
  `--no-verify`.
- Unit tests are Vitest (`*.test.ts`, shared fixtures in `test/fixtures.ts`).
  Add tests for pure logic you change: kobo↔naira conversion, API→UI mappers,
  form→DTO builders. Backend endpoints, payloads
  and auth flow are documented in [docs/API.md](docs/API.md); the live spec is at
  `<API origin>/docs` (JSON: `/docs-json`).

## API integration conventions

When wiring a screen to the backend, follow all four rules below. Replace the mock
data in `lib/` (`dashboard.ts`, `destinations.ts`, `rules.ts`, `transactions.ts`,
`session.ts`, `finance.ts#resolveAccountName`) endpoint by endpoint, and delete each
mock once nothing imports it. Search for `TODO` to find the integration points.

### 1. One central API client (axios)

- `lib/api/client.ts` exports a single axios instance; nothing else calls `fetch`
  or creates axios instances. (This replaces the fetch-based `lib/api.ts`.)
- `baseURL` = `process.env.NEXT_PUBLIC_API_BASE_URL` (origin including `/api/v1`).
  It is inlined at build time (Docker build arg / Cloud Build `_API_BASE_URL`).
- A request interceptor attaches `Authorization: Bearer <accessToken>` from the
  auth session (`lib/auth/session.ts`). The signup `setupToken` is short-lived
  (15 min), so keep it in memory only; pass it explicitly to `POST /auth/password/set`
  and never persist it.
- A response interceptor normalises every failure into an `ApiError`
  (`status`, `message`, `code?`, `details?`). On 401 from an authenticated call,
  clear the session and send the user to `/?auth=login`. Don't do this for the
  auth endpoints themselves, where a 401 means wrong code or wrong password.
- Backend errors look like `{ message: string | string[], error, statusCode, code? }`.
  `message` is an array for validation errors, so join it for display.
- Access token: `localStorage` when the user ticked "Remember for 30 days"
  (`rememberMe: true`), otherwise `sessionStorage`. Read storage only on the client.

### 2. Services + React Query hooks

- `services/<domain>.service.ts` holds plain async functions that call the client
  and return typed data, e.g. `authService.login(dto)` and `kycService.getStatus()`.
  No React, no toasts.
- `types/api/<domain>.ts` holds request and response types that mirror the backend
  DTOs (`SignupDto`, `LoginDto`, `User`, `Onboarding`, …).
- `hooks/<domain>/use-*.ts` wraps services with TanStack Query: `useQuery` for
  reads and `useMutation` for writes. Components use hooks only, never services
  directly.
- Query keys come from one factory in `lib/query-keys.ts`
  (e.g. `queryKeys.auth.me()`, `queryKeys.kyc.status()`). Mutations invalidate the
  keys they affect. For example, finishing a KYC step invalidates `kyc.status` and
  `auth.me`, because `onboarding` changes.
- One `QueryClientProvider` lives in `components/providers.tsx`, mounted in
  `app/layout.tsx`. Sensible defaults: `staleTime` 30s, `retry: 1` for queries,
  no retry for mutations.

### 3. Toasts for results (shadcn Sonner, rich colours)

- Use the shadcn `sonner` component (`<Toaster richColors position="top-right" />`
  in the root layout) so success is green, errors are red, warnings are amber.
- Mutations: on success show the backend's `message` (fall back to a short
  sentence); on error show the normalised `ApiError.message`. Do this in the hook
  (`onSuccess`/`onError`) so every caller behaves the same; a caller can pass
  `{ silent: true }` when a screen shows the message inline instead.
- Queries: show a toast only for unexpected failures (5xx or network), via the
  `QueryCache` `onError`, plus an inline error state with a Retry button where the
  data would be. Never toast for 401s handled by the redirect.
- Rate limits (429): say "Too many attempts, try again in a minute". Countdown
  endpoints (`resendAvailableInSeconds`) drive a disabled "Resend in 0:45" button
  rather than a toast.

### 4. Skeletons that match the real layout

- While a page or panel loads, render a skeleton with the **same structure** as
  the loaded UI: same grid, same card and panel sizes, same table columns and row
  heights, same header. Use shadcn `Skeleton` blocks. No full-page spinners.
- Each data-driven screen gets a colocated skeleton, e.g.
  `components/dashboard/dashboard-skeleton.tsx` and
  `components/transactions/transactions-table-skeleton.tsx`. Use it in that route's
  `loading.tsx` and in `isPending` branches, so there is no layout shift when data
  arrives.
- Tables render ~5 skeleton rows at the real row height; stat cards keep their
  title row and swap only the value with a skeleton bar.
- Buttons that trigger a mutation show their own pending state (disabled + small
  spinner + the same width), never a page skeleton.

## UI conventions already in the codebase

- Colours: `brand` (#33A7F5), `ink` (#121212), `line`, `brand-50`, `success-50`,
  `danger-50`, `purple-50` tokens in `app/globals.css`.
- Primary CTAs use `<Button size="xl">` (48px); page-header actions use
  `size="lg" className="h-10 px-4 text-sm"`. Keep buttons compact.
- Shared building blocks live in `components/ui/` (Modal, ConfirmDialog,
  SegmentedTabs, RadioCard, MoneyInput, NativeSelect, Pagination, …) and
  `components/forms/` (WalletFields, RecipientFields, RuleFields, PhoneField).
  Reuse them before adding new ones.
- `short:` variant = desktop with height ≤ 800px; full-height layouts (KYC) must
  not scroll on laptop screens.

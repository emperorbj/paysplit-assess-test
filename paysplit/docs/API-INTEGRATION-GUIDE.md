# PaySplit API integration guide

How to connect a PaySplit frontend to the backend. The main PaySplit app follows
these rules, and the admin app should too, so both behave the same way.

**API docs:** `<API origin>/docs` (JSON: `<API origin>/docs-json`). Admin endpoints
are under the `admin` tag, starting at `POST /admin/auth/login`.

**Stack:** Next.js App Router, axios, TanStack Query, shadcn Sonner and Skeleton.

**Money:** API amounts are in kobo. Convert in one shared helper, and add unit tests
for it.

Follow all four rules below when wiring a screen to the backend.

## 1. One central API client (axios)

- `lib/api/client.ts` exports a single axios instance. Nothing else calls `fetch`
  or creates axios instances.
- `baseURL` = `process.env.NEXT_PUBLIC_API_BASE_URL` (origin including `/api/v1`).
  It is inlined at build time, so it must be available during the build.
- A request interceptor attaches `Authorization: Bearer <accessToken>` from the
  auth session (`lib/auth/session.ts`).
- A response interceptor normalises every failure into an `ApiError`
  (`status`, `message`, `code?`, `details?`).
- On a 401 from an authenticated call, clear the session and send the user to the
  login screen. Don't do this for auth endpoints, where a 401 means a wrong code
  or password.
- Backend errors look like `{ message: string | string[], error, statusCode, code? }`.
  `message` is an array for validation errors, so join it for display.
- Store the access token in `localStorage` if the user chose to stay signed in,
  otherwise in `sessionStorage`. Read storage only on the client.

## 2. Services + React Query hooks

- `services/<domain>.service.ts` holds plain async functions that call the client
  and return typed data, e.g. `adminService.login(dto)`. No React, no toasts.
- `types/api/<domain>.ts` holds request and response types that mirror the backend
  DTOs.
- `hooks/<domain>/use-*.ts` wraps services with TanStack Query: `useQuery` for
  reads and `useMutation` for writes. Components use hooks only, never services
  directly.
- Query keys come from one factory in `lib/query-keys.ts`, e.g.
  `queryKeys.users.list(params)`. Mutations invalidate the keys they affect.
- One `QueryClientProvider` lives in `components/providers.tsx`, mounted in
  `app/layout.tsx`. Defaults: `staleTime` 30s, `retry: 1` for queries, no retry
  for mutations.

## 3. Toasts for results (shadcn Sonner, rich colours)

- Use the shadcn `sonner` component (`<Toaster richColors position="top-right" />`
  in the root layout), so success is green, errors are red and warnings are amber.
- **Mutations:** on success show the backend's `message` (fall back to a short
  sentence). On error show the normalised `ApiError.message`. Do this in the hook
  (`onSuccess`/`onError`) so every caller behaves the same. A caller can pass
  `{ silent: true }` when a screen shows the message inline instead.
- **Queries:** show a toast only for unexpected failures (5xx or network), via the
  `QueryCache` `onError`, plus an inline error state with a Retry button where the
  data would be. Never toast for 401s handled by the redirect.
- **Rate limits (429):** say "Too many attempts, try again in a minute".

## 4. Skeletons that match the real layout

- While a page or panel loads, render a skeleton with the **same structure** as
  the loaded UI: same grid, same card and panel sizes, same table columns and row
  heights, same header. Use shadcn `Skeleton` blocks. No full-page spinners.
- Each data-driven screen gets a colocated skeleton, e.g.
  `components/users/users-table-skeleton.tsx`. Use it in that route's `loading.tsx`
  and in `isPending` branches, so there is no layout shift when data arrives.
- Tables render about 5 skeleton rows at the real row height. Stat cards keep
  their title row and swap only the value with a skeleton bar.
- Buttons that trigger a mutation show their own pending state (disabled, small
  spinner, same width), never a page skeleton.

## Before finishing a change

Add unit tests for pure logic you change, such as kobo↔naira conversion, API→UI
mappers and form→DTO builders. Then run format, lint, typecheck, unit tests and a
production build.

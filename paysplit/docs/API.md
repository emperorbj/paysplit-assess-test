# PaySplit backend API

- **Backend:** [`../paysplit-backend`](../../paysplit-backend/README.md) (Express + Prisma + Neon, deployed on Render)
- **Local origin:** `http://localhost:4000` · **Deployed:** `https://<service>.onrender.com`
- **Base URL** (`NEXT_PUBLIC_API_BASE_URL`): `<origin>/api/v1`
- **Docs:** `<origin>/docs` (Swagger UI) · `<origin>/docs-json` (OpenAPI JSON)
- **Auth:** `Authorization: Bearer <token>` on 🔒 endpoints.
- **CORS:** origins come from the backend's `CORS_ORIGINS` (local: `http://localhost:3000`);
  allowed headers `content-type, authorization, idempotency-key`.

## Error format

```json
{
  "message": "Missing or invalid Authorization header",
  "error": "Unauthorized",
  "statusCode": 401
}
```

- `message` may be a **string[]** for validation errors (400/422).
- Errors carry a machine-readable `code`, e.g. `ALLOCATION_EXCEEDS_SALARY`
  (every endpoint's codes are listed in `/docs`).
- Rate limits are returned in the `RateLimit` / `RateLimit-Policy` headers
  (signup 5/min, login 10/min, KYC and money moves 10/min). Exceeding them returns 429.

## Auth flow

There is no email verification and no forgot-password flow in this build.

| Endpoint | Body | Returns |
| --- | --- | --- |
| `POST /auth/signup` | `{ firstName, lastName, email, password, confirmPassword, rememberMe? }` | `AuthResponse` (201, signed in); **409** `EMAIL_TAKEN` |
| `POST /auth/login` | `{ email, password, rememberMe }` | `AuthResponse`. `rememberMe: true` gives a 30-day token, otherwise 24h. **401** `INVALID_CREDENTIALS` |
| `GET /auth/me` 🔒 | none | `{ user, onboarding }` |
| `POST /auth/logout` 🔒 | none | `{ message }`; revokes every token issued so far |
| `POST /auth/password/change` 🔒 | `{ currentPassword, newPassword, confirmPassword }` | `{ message, accessToken, expiresIn }`; **401** `INVALID_PASSWORD` |

Signup opens the "Welcome to PaySplit" modal (Continue to KYC / Go to Dashboard).

## Shapes

```ts
type AuthResponse = {
  accessToken: string
  tokenType: "Bearer"
  expiresIn: number // seconds
  user: User
  onboarding: Onboarding
}

type User = {
  id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber: string | null
  countryCode: string | null
  currencyCode: string | null
  isEmailVerified: boolean
  passwordSetAt: string | null
  kycStatus: KycState
  isActive: boolean
  role: "user" | string
  roleId: string
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  deactivatedAt: string | null
}

type KycState = "not_started" | string // confirm other values from /docs-json

type Onboarding = {
  emailVerified: boolean
  passwordSet: boolean
  profileCompleted: boolean
  kycStatus: KycState
  kyc: { identityStatus: KycState; livenessStatus: KycState }
  setupChecklist: {
    salaryDateSet: boolean
    hasWallet: boolean
    hasSplitRule: boolean
  }
  nextStep: "kyc" | string
}
```

`onboarding` drives the Welcome modal, the dashboard's "Complete Onboarding"
banner and checklist (`lib/dashboard.ts#onboarding` mock), and where the app sends
the user after login (`nextStep`).

## KYC (integrated)

| Endpoint                              | Purpose                                                | UI                          |
| ------------------------------------- | ------------------------------------------------------ | --------------------------- |
| `GET /kyc/countries`                  | Countries with dial code, currency, allowed ID methods | Replaces `lib/countries.ts` |
| `GET /kyc/status` 🔒                  | Progress for the stepper                               | KYC left panel              |
| `PUT /kyc/profile` 🔒                 | Country + mobile phone                                 | Step 1, Profile Basics      |
| `POST /kyc/identity/nigeria` 🔒       | BVN or NIN (422/429/503)                               | Step 2, Nigeria tab         |
| `POST /kyc/identity/international` 🔒 | Passport / driver's licence upload                     | Step 2, International       |
| `POST /kyc/liveness` 🔒               | Selfie ("Take shot") (409/422)                         | Step 3                      |

Check request schemas in `/docs-json` (`UpdateProfileDto`, `NigeriaIdentityDto`,
`InternationalIdentityUploadDto`, `SelfieUploadDto`) before building. Uploads are
likely `multipart/form-data`.

## Money is in kobo

Every amount the API sends or accepts (`balance`, `targetAmount`, `monthlyAmount`,
`stats.*`, move `amount`) is an integer in **kobo** (₦850,000 = `85000000`). Forms
work in naira; convert at the edge with `lib/money.ts` (`nairaToKobo` on submit,
`koboToNaira` for display). Never send fractional kobo.

## Profile, setup and wallets (integrated)

| Endpoint                                        | Hook                                                              | UI                                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `GET /users/me/profile` 🔒                      | `useProfile`                                                      | Profile page, account card, dashboard salary balance                                        |
| `PATCH /users/me` 🔒                            | `useUpdateMe`                                                     | Profile › Personal details (names locked after KYC: `namesLocked`; phone in `+234…` format) |
| `GET/PUT /users/me/notification-preferences` 🔒 | `useNotificationPreferences` / `useUpdateNotificationPreferences` | Profile › Notifications (partial PUT, optimistic; only `deliveredChannels` are sent today)  |
| `PUT/DELETE /users/me/profile-image` 🔒         | `useUploadProfileImage` / `useRemoveProfileImage`                 | Profile sidebar photo (multipart field `image`, PNG/JPG/WebP ≤ 5MB)                         |
| `GET/PUT /setup/income` 🔒                      | `useIncome` / `useSaveIncome`                                     | Setup wizard step 1, Profile › Salary income                                                |
| `GET /setup/progress` 🔒                        | `useSetupProgress`                                                | Onboarding checklist                                                                        |
| `GET /categories`                               | `useCategories`                                                   | Wallet form category select (public, stable ids)                                            |
| `GET /wallets/accent-colors` 🔒                 | `useAccentColors`                                                 | Wallet form accent select                                                                   |
| `GET/POST /wallets` 🔒                          | `useWallets` / `useCreateWallet`                                  | Destinations carousel, dashboard + profile wallet panels, setup step 2                      |
| `GET /wallets/activity` 🔒                      | `useWalletActivity`                                               | Destinations › wallet activity table (`direction`: all/in/out)                              |
| `GET/PATCH/DELETE /wallets/{id}` 🔒             | `useWallet` / `useUpdateWallet` / `useDeleteWallet`               | Wallet detail page (delete → 409 `WALLET_NOT_EMPTY` if it has a balance)                    |
| `GET /wallets/{id}/transactions` 🔒             | `useWalletTransactions`                                           | Wallet detail history (`filter`: all/allocated/moved)                                       |
| `POST /wallets/{id}/move` 🔒                    | `useMoveWalletFunds`                                              | Wallet detail "Move" (back to salary account; 422 `INSUFFICIENT_BALANCE`)                   |

Wallet mutations invalidate `wallets.*`, `setup.progress`, `auth.me` and
`users.profile`, since onboarding (`hasWallet`) and balances change.

## Dashboard, transactions and split rules (integrated)

| Endpoint                      | Hook                    | UI                                                                                        |
| ----------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| `GET /dashboard/summary` 🔒   | `useDashboardSummary`   | Stats row, salary partition, onboarding banner                                            |
| `GET /dashboard/cash-flow` 🔒 | `useCashFlow`           | Cash-flow chart (9 monthly buckets; the range select slices them client-side)             |
| `GET /transactions` 🔒        | `useTransactions`       | Transactions page (`type`: all/wallet/beneficiary), dashboard Recent Activity (`limit=5`) |
| `GET /transactions/export` 🔒 | `useExportTransactions` | "Export Statement CSV" (current filters) and the dashboard Export button                  |
| `GET /transactions/{id}` 🔒   | `useTransaction`        | Transaction Details modal: settlement ref, bank, narration, fee                           |
| `GET /split-rules/summary` 🔒 | `useSplitRulesSummary`  | Allocation bar (segment colours from the API)                                             |
| `GET /split-rules` 🔒         | `useSplitRules`         | Rules table (`status`: all/active/paused, search, paged)                                  |
| `GET /split-rules/{id}` 🔒    | `useSplitRule`          | `?edit=id` deep link                                                                      |
| `POST /split-rules` 🔒        | `useCreateSplitRule`    | Add New Rule, setup step 4 (409 `DESTINATION_HAS_RULE`, 422 `ALLOCATION_EXCEEDS_SALARY`)  |
| `PATCH /split-rules/{id}` 🔒  | `useUpdateSplitRule`    | Edit, and pause/resume with `{ status }`                                                  |
| `DELETE /split-rules/{id}` 🔒 | `useDeleteSplitRule`    | Delete rule                                                                               |

Ledger rows (transactions, wallet activity, wallet history) share one shape
(`ApiTransaction`) and one mapper (`hooks/transactions/map-transaction.ts`).
`title` and `signedAmount` are already worded from the list's point of view, so
colour follows the sign. Split rule `value` is kobo for `fixed`, percent for
`percentage`. Every money/rule mutation calls `useInvalidateFinance()`.

## Simulations (sandbox)

| Endpoint | Hook | UI |
| --- | --- | --- |
| `POST /simulations/salary-credit` 🔒 | `useSimulateSalaryCredit` | Dashboard "Simulate salary" (shown once the salary account is active) |

Body `{ amount (kobo), senderName?, narration?, autoSplit? = true }` with an
`Idempotency-Key` header (one per opened form). Credits the salary account and
runs the split immediately; returns `{ message, replayed, transaction, splitRun, salaryAccount }`.
422 `SALARY_ACCOUNT_INACTIVE` before KYC.

Still mock (out of scope for this build): beneficiaries (and beneficiary rule
destinations / setup step 3), transaction PIN, display preferences, bank lookup.

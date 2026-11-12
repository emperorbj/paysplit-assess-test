# PaySplit Backend

## Overviews
PaySplit helps salaried users automatically distribute confirmed salary payments into
purpose-based **Wallets** and external **Beneficiaries** using **split rules** they configure.
Each eligible user receives a dedicated virtual salary collection account; when salary is
confirmed, PaySplit executes the user's active split rules in priority order and leaves any
remainder in the salary account. PaySplit launches in Nigeria, with BVN/NIN identity
verification and liveness enforced before restricted financial actions are permitted.

This repository contains the NestJS backend API.

## Core Stack
- **Framework**: [NestJS](https://nestjs.com/) 11
- **Language**: TypeScript
- **ORM**: [Sequelize](https://sequelize.org/) (PostgreSQL) via `sequelize-typescript`
- **Logging**: Winston + [BetterStack](https://betterstack.com/) (optional)
- **Email**: SMTP via Nodemailer (ZeptoMail) with EJS templates (console mock mode when SMTP is not configured)
- **Payments**: [HePaid](https://hepaid-docs.tobee.dev/api-reference/introduction) (bank list, name enquiry, salary accounts, transfers)
- **KYC**: Dojah
- **Validation**: Joi (environment) and class-validator (DTOs)
- **Docs**: Swagger / OpenAPI

## Project Structure
```text
src/
├── config/              # Environment configuration & Joi validation
├── core/                # Base entity / base service
├── domains/
│   ├── auth/            # Signup, login, OTP, password reset/change, logout, JWT guard
│   ├── users/           # User & role entities, onboarding status
│   ├── kyc/             # Dojah KYC (profile basics, BVN/NIN/ID, liveness)
│   ├── profile/         # Profile & Settings, profile picture
│   ├── categories/      # Fixed category list (seeded, stable UUIDs)
│   ├── income/          # Salary income source + setup checklist progress
│   ├── wallets/         # Budget wallets (ledger sub-balances), Move
│   ├── beneficiaries/   # External bank accounts, bank list, name enquiry
│   ├── split-rules/     # Split rules, allocation summary
│   ├── ledger/          # Double-entry ledger + transaction queries
│   ├── transactions/    # Transactions screen, receipts, CSV export
│   ├── dashboard/       # Dashboard summary + cash-flow chart
│   ├── salary-account/  # Dedicated salary account (HePaid wallet), issued after KYC
│   ├── split-engine/    # Salary credits, split runs (auto + Run Now), payouts, reconciliation
│   ├── jobs/            # Background jobs (in-app cron) + /internal/jobs/:name
│   ├── webhooks/        # HePaid webhooks (signature check, de-duplication)
│   └── notifications/   # In-app notifications (+ email per preferences)
├── integration/
│   ├── email/           # SMTP email service + templates
│   ├── dojah/           # Dojah KYC client
│   ├── hepaid/          # HePaid payments client
│   └── storage/         # Google Cloud Storage
└── shared/              # Guards, decorators, validators, logger, pagination
database/
├── migrations/          # sequelize-cli migrations
└── seeders/             # Seed data (roles, categories)
scripts/                 # One-off CLI scripts (e.g. create super-admin)
```

## Implemented So Far

### Signup flow
1. **Create an account**: `POST /api/v1/auth/signup` with first name, last name and email. A 6-digit code is emailed.
2. **Please check your email**: `POST /api/v1/auth/email/verify` with email and code. Returns a 15-minute `setupToken`.
   "Click to resend" → `POST /api/v1/auth/email/resend` (60s cooldown; `resendAvailableInSeconds` drives the countdown).
3. **Create password**: `POST /api/v1/auth/password/set` with `Authorization: Bearer <setupToken>`, password and confirm password.
   Returns an access token plus `onboarding`.
4. **Welcome to PaySplit**: the client renders the modal from `onboarding` (`nextStep`: `kyc` | `setup` | `dashboard`).

| Endpoint | Description |
| --- | --- |
| `POST /api/v1/auth/signup` | Create an account (names + email), email a verification code |
| `POST /api/v1/auth/email/verify` | Verify the code → password setup token |
| `POST /api/v1/auth/email/resend` | Resend the verification code |
| `POST /api/v1/auth/password/set` | Create the password (setup token) → access token + onboarding |
| `POST /api/v1/auth/login` | Email + password, optional `rememberMe` (30-day token). Unfinished signups get `401` with `code: "ACCOUNT_SETUP_INCOMPLETE"` |
| `GET /api/v1/auth/me` | Current user + onboarding status |
| `POST /api/v1/auth/password/forgot` | Email a password reset code |
| `POST /api/v1/auth/password/verify-code` | Verify the reset code |
| `POST /api/v1/auth/password/reset` | Set a new password after verifying the reset code (signs out all sessions) |
| `POST /api/v1/auth/password/change` | Settings → change password (current + new). Signs out other sessions and returns a fresh token |
| `POST /api/v1/auth/logout` | Sign out everywhere (revokes every token issued so far) |

Codes are stored hashed, expire after 10 minutes, and are invalidated after 5 wrong attempts.

### KYC flow (Dojah)
1. **Profile Basics**: `PUT /api/v1/kyc/profile` with country and phone. The phone is stored in international format and the currency is set from the country.
2. **Identity Verification**
   - Nigeria: `POST /api/v1/kyc/identity/nigeria` `{ method: "bvn" | "nin", idNumber }` (Dojah Validate BVN / Lookup NIN + name match).
   - Other countries: `POST /api/v1/kyc/identity/international` multipart `documentType`, `front`, optional `back` (Dojah document analysis).
3. **Biometric Liveness**: `POST /api/v1/kyc/liveness` multipart `selfie`. Runs a Dojah liveness check, then matches the selfie against the BVN/NIN record or the ID document. On success `kycStatus` becomes `approved`.

| Endpoint | Description |
| --- | --- |
| `GET /api/v1/kyc/countries` | Supported countries, dial codes, currencies and allowed ID methods |
| `GET /api/v1/kyc/status` | Per-step progress, attempts remaining, `currentStep` to resume at |
| `PUT /api/v1/kyc/profile` | Country + phone |
| `POST /api/v1/kyc/identity/nigeria` | BVN or NIN |
| `POST /api/v1/kyc/identity/international` | Passport or driver's license upload (PNG/JPG, max 2MB) |
| `POST /api/v1/kyc/liveness` | Selfie → approval |

- **Errors:** every failure returns a machine-readable `code` (for example `NAME_MISMATCH`, `FACE_MISMATCH`, `ATTEMPTS_EXCEEDED`, `PROVIDER_UNAVAILABLE`).
- **Encryption:** BVN, NIN and document numbers are encrypted with AES-256-GCM. Selfies are never stored. The ID document image is kept encrypted only until the liveness check runs.
- **Attempt limits:** 3 identity and 5 liveness attempts per 24 hours. Dojah outages don't count.
- **Financial endpoints** must use `@UseGuards(JwtAuthGuard, KycApprovedGuard)`.
- **Sandbox test data:** BVN `22222222222`, NIN `70123456789`.

### Profile picture (Google Cloud Storage)

| Endpoint | Purpose |
|---|---|
| `PUT /api/v1/users/me/profile-image` | Multipart field `image` (PNG, JPG or WebP, max 5MB). Replaces any existing picture and returns `profileImageUrl` |
| `DELETE /api/v1/users/me/profile-image` | Remove the picture |

- The URL is also returned as `user.profileImageUrl` on `GET /api/v1/auth/me`.
- Files are stored at `profile-images/<userId>/<uuid>.<ext>` in `GCP_STORAGE_BUCKET`, which must allow public reads. Replaced and removed files are deleted from the bucket, though Google's edge cache may keep serving them for up to 1 hour.
- Locally, set `GCP_STORAGE_KEY_FILE` to a service-account key JSON (gitignored, never commit it). On GCP, leave it empty to use the runtime's service account; it needs the Storage Object Admin role on the bucket.

### Conventions for the endpoints below
- **Amounts are integers in kobo** (₦850,000 = `85000000`), in requests and responses, matching HePaid.
- **Errors** have a machine-readable `code`: `{ statusCode, error, code, message, ...extra }`.
- **Lists** return `{ data, pagination: { total, page, limit, pages } }` and take `page` / `limit` (max 100).
- **Dates**: paydays and filters are Lagos calendar dates (`YYYY-MM-DD`); timestamps are ISO 8601.
- Endpoints that move money or make paid bank lookups also require KYC approval (`403 KYC_REQUIRED`).

### Setup checklist ("Configure your Salary Partitions")
| Step | Endpoint |
| --- | --- |
| 1. Income | `PUT /api/v1/setup/income` `{ employerName, monthlyAmount, paydayDay }` (also Settings → Salary Income Source); `GET` returns it |
| 2. Wallets | `POST /api/v1/wallets` |
| 3. Recipients | `GET /api/v1/banks`, `POST /api/v1/beneficiaries/resolve`, `POST /api/v1/beneficiaries` |
| 4. Rules | `POST /api/v1/split-rules` |
| Progress | `GET /api/v1/setup/progress` → `onboarding.setupChecklist` and `onboarding.progress.percent` |

Setup is complete once income and a first rule exist; `nextStep` then becomes `dashboard`. The first time this happens, a "salary partitions are set up" notification is posted.

### Categories
`GET /api/v1/categories` returns a fixed list with stable UUIDs (seeded by `npm run seed:run`). Send the `id` as `categoryId`. "Salary" is system-only.

### Wallets (budget wallets)
Wallets are sub-balances in the PaySplit ledger, not separate bank accounts.

| Endpoint | Description |
| --- | --- |
| `GET /api/v1/wallets` | List with balance, target and `progressPercent` |
| `POST /api/v1/wallets` | `{ name, categoryId, accentColor, targetAmount? }`. A null target means "No targeted amount". `409 WALLET_NAME_TAKEN` |
| `GET /api/v1/wallets/accent-colors` | Colour options |
| `GET /api/v1/wallets/activity` | "All Wallet Activity" (`direction=all`, `in` or `out`) |
| `GET /api/v1/wallets/:id` | Detail: available balance, total allocated, total moved back, linked rule |
| `PATCH /api/v1/wallets/:id` | Edit |
| `DELETE /api/v1/wallets/:id` | Empty wallets only (`409 WALLET_NOT_EMPTY`). Its rule is deleted too |
| `GET /api/v1/wallets/:id/transactions` | History (`filter=all`, `allocated` or `moved`) |
| `POST /api/v1/wallets/:id/move` | "Move" money back to the salary account (`422 INSUFFICIENT_BALANCE`) |

### Beneficiaries
| Endpoint | Description |
| --- | --- |
| `GET /api/v1/banks` | Bank dropdown (from HePaid, cached 24h) |
| `POST /api/v1/beneficiaries/resolve` | Account name enquiry ("Ali Dabbs ✓"). `422 ACCOUNT_NOT_FOUND` / `UNKNOWN_BANK`, `503 BANK_LOOKUP_UNAVAILABLE` |
| `GET /api/v1/beneficiaries` | List (`status=all`, `active` or `paused`; `search`) with masked account numbers and next split date |
| `POST /api/v1/beneficiaries` | `{ bankCode, accountNumber, categoryId, narration? }`. The account name is resolved server-side. `409 BENEFICIARY_EXISTS` |
| `GET /api/v1/beneficiaries/:id` | Detail: full account number, total allocated, linked rule |
| `PATCH /api/v1/beneficiaries/:id` | Category, narration, `status` (pause/resume). Bank details can't change: delete and re-add |
| `DELETE /api/v1/beneficiaries/:id` | Delete (its rule too; transfer history is kept) |
| `GET /api/v1/beneficiaries/:id/transactions` | Transfer history |

Name enquiry results are cached for 30 minutes, so a lookup followed by a save costs one HePaid call.

### Split rules
| Endpoint | Description |
| --- | --- |
| `GET /api/v1/split-rules/summary` | Baseline salary, total allocated, remainder, allocation-bar segments |
| `GET /api/v1/split-rules` | Priority order (lower runs first), `status`, `search`, `allocatedThisMonth` |
| `POST /api/v1/split-rules` | `{ name, priority, destinationType, walletId or beneficiaryId, method, value }`. `method` is `fixed` (value in kobo) or `percentage` (value in %, e.g. `12.5`) |
| `GET` / `PATCH` / `DELETE /api/v1/split-rules/:id` | Read; reconfigure or pause (`status`); delete |

- Active rules can't add up to more than 100% of the monthly salary: `422 ALLOCATION_EXCEEDS_SALARY`, with `unallocatedAmount` / `unallocatedPercent`.
- One rule per wallet or beneficiary (`409 DESTINATION_HAS_RULE`).

### Transactions and dashboard
| Endpoint | Description |
| --- | --- |
| `GET /api/v1/transactions` | `type` (`all`, `wallet`, `beneficiary`, `salary`), `direction`, `status`, `search`, `from`/`to`. `signedAmount` is negative for money leaving the salary account. Recent activity = `limit=5` |
| `GET /api/v1/transactions/:id` | Receipt |
| `GET /api/v1/transactions/export` | CSV statement (same filters, max 5,000 rows) |
| `GET /api/v1/dashboard/summary` | Salary account, split allocation, total in wallets, next split run and fund status, partition donut, unread count, onboarding |
| `GET /api/v1/dashboard/cash-flow` | Chart buckets: last 9 months by default, daily for ranges up to 62 days |

### Profile, settings and notifications
| Endpoint | Description |
| --- | --- |
| `GET /api/v1/users/me/profile` | User, account ID, member since, tier, account details, income, password last updated, notification preferences |
| `PATCH /api/v1/users/me` | First/last name (locked after KYC: `409 NAME_LOCKED`), phone |
| `GET` / `PUT /api/v1/users/me/notification-preferences` | Push / SMS / Email toggles (partial update). Only email is delivered today |
| `GET /api/v1/notifications` | Feed plus `unreadCount` (`unreadOnly=true` to filter) |
| `POST /api/v1/notifications/:id/read`, `POST /api/v1/notifications/read-all` | Mark as read |

### Admin dashboard (read-only)
Every `/admin/*` route except login requires an `admin` or `super_admin` token (`403` otherwise); admins skip KYC and onboarding checks. Admin accounts can't use `/auth/login`, and customers can't use `/admin/auth/login`: both get the generic `401 Invalid email or password`. Lists and counts only include customers (`user` role, signup finished). Identity numbers are masked (`*******1234`) and never decrypted.

| Endpoint | Description |
| --- | --- |
| `POST /api/v1/admin/auth/login` | Admin sign-in (`rememberMe` supported). Forgot/reset/change password and logout use the shared `/auth/*` endpoints |
| `GET /api/v1/admin/overview` | Total / verified / unverified users, verification rate, total salary paid + employee count |
| `GET /api/v1/admin/users` | `search` (name/email), `verification=all\|verified\|unverified`, pagination. Rows include KYC summary, salary account, salary paid, payday and `payIn` eligibility |
| `GET /api/v1/admin/users/:id` | Detail header and stat cards (wallets, beneficiaries, active rules, expected salary date) |
| `GET /api/v1/admin/users/:id/verification` | Account details, salary amount, phone, masked ID, KYC checklist with submitted dates |
| `GET /api/v1/admin/users/:id/transactions` (`/:reference`) | Same filters as `/transactions`; detail by reference |
| `GET /api/v1/admin/users/:id/split-rules`, `/wallets`, `/wallets/activity`, `/beneficiaries` | The user detail tabs (same filters as the customer endpoints) |
| `GET /api/v1/admin/salary-payments` (`/:reference`) | Salary credits across all users: `search`, `status`, `userId`, `from`/`to` |
| `GET` / `PATCH /api/v1/admin/me` | Admin settings: first/last name and phone (email is read-only) |

**Audit log** (`admin_audit_logs`, append-only): admin sign-ins (including failed attempts), logouts, password changes and resets, settings changes, and every view of a user's detail or verification tab, with IP and user agent.

### Salary account and split execution (phase 3)
| Endpoint | Description |
| --- | --- |
| `GET /api/v1/salary-account` | "Account details": `status` (`not_issued`, `pending`, `active`, `failed`, `closed`, `not_eligible`), ledger balance, primary account number + bank, and every funding account in `accounts` |
| `POST /api/v1/salary-account/identity` | Add a BVN or NIN `{ method, idNumber }` when the salary account shows `actionRequired: "add_bvn_or_nin"` (passport/driver's licence users, or HePaid rejected it). Checked with Dojah against the verified name (and date of birth for a NIN) and for use by another account; stored encrypted beside the KYC record, then the account is retried. `409 SALARY_ACCOUNT_IDENTITY_NOT_NEEDED` / `ID_ALREADY_USED`, `422 IDENTITY_NOT_FOUND` / `NAME_MISMATCH` / `DOB_MISMATCH`, `429 ATTEMPTS_EXCEEDED` |
| `POST /api/v1/split-runs` | **Run Now**: splits the current salary account balance. `409 SALARY_ACCOUNT_NOT_ACTIVE`, `422 NO_ACTIVE_RULES` / `NOTHING_TO_SPLIT` |
| `GET /api/v1/split-runs` | Split history (automatic and Run Now), newest first |
| `GET /api/v1/split-runs/:id` | Run detail: totals, skipped rules with reasons, and its transactions |
| `POST /api/v1/salary-account/simulate-credit` | **Dev/QA only** (`PAYMENTS_SIMULATION=true`): fake a salary credit `{ amount, senderName?, narration? }`. Otherwise `403 SIMULATION_DISABLED` |

How it works:
- **Salary account:** KYC approval creates the user's HePaid wallet in their verified name, passing the BVN/NIN (never logged; no phone number). If HePaid is unavailable, the `provision-salary-accounts` job retries with the same reference, so it's idempotent. The same job backfills users approved before this shipped. HePaid needs a BVN or NIN, so users verified with a passport or driver's licence get `not_eligible` (no HePaid call).
- **Credits:** HePaid's `wallet.credited` webhook triggers a sync of that wallet; the `sync-credits` job polls as a safety net. Only `TopUp` entries (bank transfers, amount net of HePaid's fee) count as salary, plus `Credit` on Test wallets for QA funding. The sender's account name becomes "Transfer from …". Each credit is recorded once and the user is notified. A credit of at least **50% of the expected monthly salary** splits automatically; smaller ones wait for Run Now.
- **Split runs:** rules run by priority (lower first). Fixed rules move their amount; percentage rules apply to the credit (automatic run) or to the balance (Run Now). A rule that doesn't fit is skipped (`insufficient_funds`) and smaller later rules still run. Paused beneficiaries, deleted destinations and amounts under ₦1 are skipped too. Run `status`: `processing` (transfers in flight), `completed`, `partial`, `failed`.
- **Payouts:** wallet allocations complete at once. A beneficiary payout holds amount + a fee reserve (`HEPAID_TRANSFER_FEE_RESERVE`, default ₦50) and is sent to HePaid with the PAY- reference as the idempotency key. On success the actual fee is charged and the rest of the reserve refunded. On failure everything goes back to the salary account and the user is notified. If a delivered transfer is later sent back by the receiving bank (`Reversed`), the amount returns and the fee stays charged (status `reversed`). A `409 idempotency_in_progress` / `duplicate_reference` from HePaid never refunds: the payout stays pending until HePaid confirms. The `sync-payouts` job settles transfers still pending.
- **Reconciliation:** the nightly `reconcile` job checks that HePaid balance = salary account + budget wallets + pending payouts, and stores the difference in `salary_accounts.reconciliation_diff`.
- **Simulation** (`PAYMENTS_SIMULATION=true`, dev/staging only): enables simulate-credit and settles payouts without calling HePaid, so the whole flow can be tested in the sandbox. Production refuses to start with it on unless `ALLOW_HEPAID_TEST_KEY=true`.

**Scheduled jobs** run inside the app (`@nestjs/schedule`, Africa/Lagos time), like Trendupp's schedulers:

| Job | Schedule |
| --- | --- |
| `provision-salary-accounts` | every 5 minutes |
| `sync-credits` | every 30 minutes with webhooks (`HEPAID_WEBHOOK_SECRET` set), otherwise every 2 |
| `sync-payouts` | every 2 minutes |
| `reconcile` | nightly at 02:00 |

- On by default; set `JOBS_SCHEDULER_ENABLED=false` to turn them off (e.g. if Cloud Scheduler takes over later).
- **Cloud Run:** timers only fire while the instance has CPU, so the service needs CPU always allocated and at least one instance:
  `gcloud run services update <service> --region=<region> --no-cpu-throttling --min-instances=1`.
- Every job is idempotent, so several instances running the same job is safe.
- To run a job on demand: `POST /api/v1/internal/jobs/:name` with header `X-Job-Secret: <JOBS_SECRET>` (404 without it, or when `JOBS_SECRET` is unset).

**HePaid webhooks.** `POST /api/v1/webhooks/hepaid` (public; protected by the signature):
- Register it in the HePaid console: Products → your product → Webhooks → Add endpoint (mode Test or Live, public HTTPS only). Set the endpoint's `whsec_...` secret as `HEPAID_WEBHOOK_SECRET`. Until it is set the endpoint answers 503, so HePaid retries.
- Checks `HePaid-Signature` (HMAC-SHA256 of `{t}.{raw body}`, 5-minute window); a bad or old signature gets 400.
- Stores each event id once in `webhook_events` (retries and resends are acknowledged as duplicates), answers within HePaid's 10 seconds and processes afterwards.
- Events are triggers only: `wallet.credited` re-reads the wallet's transactions; `transfer.succeeded` / `failed` / `reversed` re-read the transfer with `GET /transfers/{reference}`. A forged or out-of-order event can't move money.
- Test it with **Send test** in the console (a `ping`, stored as ignored). To test real money arriving, pay a test wallet's Wema account (bank code 035) from Monnify's bank simulator: https://websim.sdk.monnify.com/?#/bankingapp

**Waiting on HePaid:** fee rates (the reserve covers it meanwhile), a successful payout in test (Monnify's sandbox holds transfers for an OTP, so they stay Processing or fail), the live account-name format, and production (live URL and keys).


## Roadmap (from the PRD)
Profile & country setup, KYC (BVN/NIN + liveness), virtual salary accounts, expected salary
date, Wallets, Beneficiaries, split rules & execution (auto + Run Now), double-entry ledger,
transactions/receipts/statements, notifications, and the admin dashboard. Still to do: HePaid webhooks
(waiting on their docs) and the admin salary pay-in and split history.

## Getting Started

### Prerequisites
- Node.js 22+
- PostgreSQL

### Installation
```bash
npm install
cp .env.example .env   # then fill in DB credentials and JWT_SECRET
```

### Database
```bash
npm run migration:run
npm run seed:run
npm run account:superadmin   # optional: create the default super-admin
```

### Running Locally
```bash
npm run start:dev    # development (watch mode)
npm run build        # production build
npm run start:prod
```

Swagger docs: `http://localhost:3000/docs`

## Testing
```bash
npm run test         # unit tests
npm run test:e2e     # e2e tests (needs a database)
npm run lint
```

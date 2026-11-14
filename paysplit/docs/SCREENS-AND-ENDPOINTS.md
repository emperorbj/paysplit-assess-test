# PaySplit: screens and integrated endpoints

> **Note:** this is the inventory made *before* the backend was built. Since then: sign-up is one step
> (names, email, password), the email-verification and forgot-password endpoints are gone,
> `POST /simulations/salary-credit` was added (dashboard "Simulate salary"), and beneficiaries stay
> out of scope. The current endpoint list is in [API.md](API.md) and the backend's `/docs`.

Built from the frontend code (`app/`, `components/`, `hooks/`, `services/`).
All calls go through `lib/api/client.ts` (axios, base URL `NEXT_PUBLIC_API_BASE_URL`).
🔒 = sends the stored Bearer token. 🌐 = public (`skipAuth`).

**Totals:** 10 routes, 55 endpoints integrated across 12 services.

---

## 1. Screens (routes)

| Route | Screen | Main component | Status |
| --- | --- | --- | --- |
| `/` | Landing page + auth modals (`?auth=login\|signup`, `?expired=1`) | `components/landing/landing-page.tsx`, `components/auth/auth-dialog.tsx` | ✅ API |
| `/dashboard` | Dashboard (`?setup=1` opens setup wizard) | `components/dashboard/dashboard-view.tsx` | ✅ API |
| `/kyc` | Complete KYC (3 steps) | `components/kyc/kyc-flow.tsx` | ✅ API |
| `/destinations` | Destinations: Wallets tab / Beneficiaries tab (`?tab=beneficiaries`) | `components/destinations/destinations-view.tsx` | ⚠️ Wallets API, Beneficiaries mock |
| `/destinations/[walletId]` | Wallet detail | `components/destinations/wallet-detail-view.tsx` | ✅ API |
| `/destinations/beneficiaries/[beneficiaryId]` | Beneficiary detail | `components/destinations/beneficiary-detail-view.tsx` | ❌ Mock (`lib/destinations.ts`) |
| `/split-rules` | Split rules + split history (`?new=1&wallet=id`, `?edit=ruleId`) | `components/rules/split-rules-view.tsx` | ✅ API (wallet destinations only) |
| `/transactions` | Transactions (`?q=`, `?ref=`, `?type=wallet\|beneficiary`) | `components/transactions/transactions-view.tsx` | ✅ API |
| `/profile` | Profile & Settings | `components/profile/profile-view.tsx` | ✅ API (parts local) |

Shared on every signed-in page (`app/(app)/layout.tsx`):

| Piece | Component | Status |
| --- | --- | --- |
| Auth gate (redirects if no token) | `components/auth/auth-gate.tsx` | Local token check only |
| Header: notifications bell | `components/app-shell/notifications-menu.tsx` | ✅ API |
| Header: user menu / account card | `components/app-shell/user-menu.tsx`, `account-card.tsx` | ✅ API |

Modals / overlays that are their own "screens":

| Overlay | Component | Opened from |
| --- | --- | --- |
| Auth flow (login, signup, OTP, set password, forgot/reset password) | `auth/auth-dialog.tsx` | Landing |
| Setup wizard (income → wallet → beneficiary → rule) | `setup/setup-wizard.tsx`, `setup-launcher.tsx` | Dashboard / onboarding banner |
| Salary identity prompt | `dashboard/salary-identity-prompt.tsx` | Dashboard |
| Create / edit wallet, move funds, delete wallet | `destinations/destination-modals.tsx`, `wallet-detail-view.tsx` | Destinations |
| Add / edit split rule | `rules/rule-form-modal.tsx` | Split rules |
| Split run detail | `rules/split-history.tsx` | Split rules |
| Transaction details | `transactions/transaction-details-modal.tsx` | Transactions |
| Change password / Change PIN | `profile/security-modals.tsx` | Profile |

---

## 2. Endpoints by screen

### Landing → Auth dialog (`/`)
| Method | Endpoint | Hook | Used for |
| --- | --- | --- | --- |
| POST 🌐 | `/auth/signup` | `useSignup` | Create account |
| POST 🌐 | `/auth/email/verify` | `useVerifyEmail` | Email OTP → returns setupToken |
| POST 🌐 | `/auth/email/resend` | `useResendEmailCode` | Resend OTP |
| POST | `/auth/password/set` (setupToken) | `useSetPassword` | Create password, finishes signup |
| POST 🌐 | `/auth/login` | `useLogin` | Log in |
| POST 🌐 | `/auth/password/forgot` | `useForgotPassword` | Forgot password step 1 |
| POST 🌐 | `/auth/password/verify-code` | `useVerifyResetCode` | Forgot password step 2 |
| POST 🌐 | `/auth/password/reset` | `useResetPassword` | Forgot password step 3 |

### App shell (all signed-in pages)
| Method | Endpoint | Hook | Used for |
| --- | --- | --- | --- |
| GET 🔒 | `/auth/me` | `useMe` | User menu, account card |
| POST 🔒 | `/auth/logout` | `useLogout` | Sign out |
| GET 🔒 | `/salary-account` | `useSalaryAccount` | Account card |
| GET 🔒 | `/notifications` | `useNotifications` | Bell dropdown |
| POST 🔒 | `/notifications/{id}/read` | `useMarkNotificationRead` | Mark one read |
| POST 🔒 | `/notifications/read-all` | `useMarkAllNotificationsRead` | Mark all read |

### Dashboard (`/dashboard`)
| Method | Endpoint | Hook | Used for |
| --- | --- | --- | --- |
| GET 🔒 | `/dashboard/summary` | `useDashboardSummary` | Stats row, salary partition, onboarding banner |
| GET 🔒 | `/dashboard/cash-flow` | `useCashFlow` | Cash-flow chart |
| GET 🔒 | `/wallets` | `useWallets` | Wallets panel |
| GET 🔒 | `/transactions?limit=5` | `useTransactions` | Recent activity |
| GET 🔒 | `/transactions/export` | `useExportTransactions` | Export button (CSV) |
| GET 🔒 | `/auth/me`, `/notifications` | `useMe`, `useNotifications` | Greeting, alerts |
| POST 🔒 | `/salary-account/identity` | `useAddSalaryIdentity` | Salary identity prompt |

### Setup wizard (opened from dashboard)
| Method | Endpoint | Hook | Used for |
| --- | --- | --- | --- |
| GET 🔒 | `/setup/income` | `useIncome` | Prefill step 1 |
| PUT 🔒 | `/setup/income` | `useSaveIncome` | Step 1: income |
| POST 🔒 | `/wallets` | `useCreateWallet` | Step 2: first wallet |
| PATCH 🔒 | `/wallets/{id}` | `useUpdateWallet` | Step 2: edit wallet |
| — | *(beneficiary — not wired)* | — | Step 3: **mock** |
| POST 🔒 | `/split-rules` | `useCreateSplitRule` | Step 4: first rule |

### KYC (`/kyc`)
| Method | Endpoint | Hook | Used for |
| --- | --- | --- | --- |
| GET 🌐 | `/kyc/countries` | `useKycCountries` | Country + dial code list |
| GET 🔒 | `/kyc/status` | `useKycStatus` | Stepper progress |
| PUT 🔒 | `/kyc/profile` | `useUpdateKycProfile` | Step 1: profile basics |
| POST 🔒 | `/kyc/identity/nigeria` | `useVerifyNigeriaIdentity` | Step 2: BVN / NIN |
| POST 🔒 | `/kyc/identity/international` (multipart) | `useUploadInternationalIdentity` | Step 2: passport / licence |
| POST 🔒 | `/kyc/liveness` (multipart) | `useSubmitLiveness` | Step 3: selfie |

### Destinations (`/destinations`)
| Method | Endpoint | Hook | Used for |
| --- | --- | --- | --- |
| GET 🔒 | `/wallets` | `useWallets` | Wallet cards / carousel |
| POST 🔒 | `/wallets` | `useCreateWallet` | Add wallet |
| GET 🔒 | `/wallets/activity` | `useWalletActivity` | Wallet activity table |
| GET 🌐 | `/categories` | `useCategories` | Wallet form category |
| GET 🔒 | `/wallets/accent-colors` | `useAccentColors` | Wallet form colour |
| — | *(beneficiaries — not wired)* | — | Beneficiaries tab: **mock** |

### Wallet detail (`/destinations/[walletId]`)
| Method | Endpoint | Hook | Used for |
| --- | --- | --- | --- |
| GET 🔒 | `/wallets/{id}` | `useWallet` | Wallet header, balance |
| GET 🔒 | `/wallets/{id}/transactions` | `useWalletTransactions` | Wallet history |
| PATCH 🔒 | `/wallets/{id}` | `useUpdateWallet` | Edit wallet |
| DELETE 🔒 | `/wallets/{id}` | `useDeleteWallet` | Delete (409 if not empty) |
| POST 🔒 | `/wallets/{id}/move` | `useMoveWalletFunds` | Move funds back to salary account |

### Beneficiary detail (`/destinations/beneficiaries/[beneficiaryId]`)
No endpoints. Uses `getBeneficiary` / `getBeneficiaryLedger` from `lib/destinations.ts` (mock).

### Split rules (`/split-rules`)
| Method | Endpoint | Hook | Used for |
| --- | --- | --- | --- |
| GET 🔒 | `/split-rules/summary` | `useSplitRulesSummary` | Allocation bar |
| GET 🔒 | `/split-rules` | `useSplitRules` | Rules table (status, search, paging) |
| GET 🔒 | `/split-rules/{id}` | `useSplitRule` | `?edit=id` deep link |
| POST 🔒 | `/split-rules` | `useCreateSplitRule` | Add rule |
| PATCH 🔒 | `/split-rules/{id}` | `useUpdateSplitRule` | Edit, pause / resume |
| DELETE 🔒 | `/split-rules/{id}` | `useDeleteSplitRule` | Delete rule |
| GET 🔒 | `/wallets` | `useWallets` | Destination picker |
| GET 🔒 | `/split-runs` | `useSplitRuns` | Split history list |
| GET 🔒 | `/split-runs/{id}` | `useSplitRun` | Split run detail |
| POST 🔒 | `/split-runs` | `useRunSplit` | "Run split now" |

### Transactions (`/transactions`)
| Method | Endpoint | Hook | Used for |
| --- | --- | --- | --- |
| GET 🔒 | `/transactions` | `useTransactions` | Table (type filter, search, paging) |
| GET 🔒 | `/transactions/{id}` | `useTransaction` | Transaction details modal |
| GET 🔒 | `/transactions/export` | `useExportTransactions` | Export statement CSV |

### Profile & Settings (`/profile`)
| Method | Endpoint | Hook | Used for |
| --- | --- | --- | --- |
| GET 🔒 | `/users/me/profile` | `useProfile` | Whole profile page |
| PATCH 🔒 | `/users/me` | `useUpdateMe` | Personal details |
| PUT 🔒 | `/setup/income` | `useSaveIncome` | Salary income source |
| GET 🔒 | `/users/me/notification-preferences` | `useNotificationPreferences` | Notification toggles |
| PUT 🔒 | `/users/me/notification-preferences` | `useUpdateNotificationPreferences` | Save toggles |
| PUT 🔒 | `/users/me/profile-image` (multipart) | `useUploadProfileImage` | Upload avatar |
| DELETE 🔒 | `/users/me/profile-image` | `useRemoveProfileImage` | Remove avatar |
| GET 🔒 | `/wallets` | `useWallets` | Sidebar wallet count |
| GET 🌐 | `/kyc/countries` | `useKycCountries` | Phone dial codes |
| POST 🔒 | `/auth/password/change` | `useChangePassword` | Change password modal |

---

## 3. All endpoints by service

| Service file | Endpoints |
| --- | --- |
| `services/auth.service.ts` (11) | `POST /auth/signup`, `POST /auth/email/verify`, `POST /auth/email/resend`, `POST /auth/password/set`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, `POST /auth/password/change`, `POST /auth/password/forgot`, `POST /auth/password/verify-code`, `POST /auth/password/reset` |
| `services/kyc.service.ts` (6) | `GET /kyc/countries`, `GET /kyc/status`, `PUT /kyc/profile`, `POST /kyc/identity/nigeria`, `POST /kyc/identity/international`, `POST /kyc/liveness` |
| `services/users.service.ts` (6) | `GET /users/me/profile`, `PATCH /users/me`, `GET /users/me/notification-preferences`, `PUT /users/me/notification-preferences`, `PUT /users/me/profile-image`, `DELETE /users/me/profile-image` |
| `services/setup.service.ts` (3) | `GET /setup/income`, `PUT /setup/income`, `GET /setup/progress` |
| `services/salary-account.service.ts` (2) | `GET /salary-account`, `POST /salary-account/identity` |
| `services/wallets.service.ts` (10) | `GET /categories`, `GET /wallets`, `GET /wallets/accent-colors`, `GET /wallets/activity`, `GET /wallets/{id}`, `GET /wallets/{id}/transactions`, `POST /wallets`, `PATCH /wallets/{id}`, `DELETE /wallets/{id}`, `POST /wallets/{id}/move` |
| `services/dashboard.service.ts` (2) | `GET /dashboard/summary`, `GET /dashboard/cash-flow` |
| `services/transactions.service.ts` (3) | `GET /transactions`, `GET /transactions/{id}`, `GET /transactions/export` |
| `services/split-rules.service.ts` (6) | `GET /split-rules/summary`, `GET /split-rules`, `GET /split-rules/{id}`, `POST /split-rules`, `PATCH /split-rules/{id}`, `DELETE /split-rules/{id}` |
| `services/split-runs.service.ts` (3) | `GET /split-runs`, `GET /split-runs/{id}`, `POST /split-runs` |
| `services/notifications.service.ts` (3) | `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all` |

---

## 4. Not integrated yet (mock or local)

| What | Where | Note |
| --- | --- | --- |
| Beneficiaries list / create / detail / ledger | `lib/destinations.ts`, `destinations-view.tsx`, beneficiary detail page | No `/beneficiaries` service yet |
| Beneficiary as a split-rule destination | `rules/split-rules-view.tsx` | Rules only target wallets |
| Setup wizard step 3 (beneficiary) | `setup/setup-wizard.tsx`, `setup-steps.tsx`, `setup-launcher.tsx` | Not saved |
| Change transaction PIN | `profile/security-modals.tsx` | No API call |
| Preferences (currency, language, theme) | `profile/profile-settings.tsx` | Kept locally |
| Bank list + account name enquiry | `lib/finance.ts` | Hardcoded / mock |
| Device management | `profile/profile-settings.tsx` | Screen not built |
| `GET /setup/progress` | `hooks/setup/use-setup.ts` | Hook exists but no component uses it |

> Note: `docs/API.md` still lists notifications and password change as "mock".
> The code now calls the API for both, so that line in `docs/API.md` is out of date.

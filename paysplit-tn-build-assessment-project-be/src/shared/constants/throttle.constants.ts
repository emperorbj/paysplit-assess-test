/**
 * Centralized rate-limit configurations for all throttled endpoints.
 *
 * Each entry maps to a `@Throttle({ default: THROTTLE_LIMITS.<KEY> })` decorator.
 * - `ttl`   — rolling time window in milliseconds (60 000 ms = 1 minute)
 * - `limit` — maximum number of requests allowed within that window per IP
 *
 * To adjust a limit, change it here and it will propagate automatically
 * to every controller that references it.
 */
export const THROTTLE_LIMITS = {
  /** Registration  */
  SIGNUP: { ttl: 60000, limit: 5 },

  LOGIN: { ttl: 60000, limit: 10 },

  OTP_SEND: { ttl: 60000, limit: 3 },

  OTP_VERIFY: { ttl: 60000, limit: 5 },

  FORGOT_PASSWORD: { ttl: 60000, limit: 3 },

  RESET_PASSWORD: { ttl: 60000, limit: 5 },

  SET_PASSWORD: { ttl: 60000, limit: 5 },

  /** KYC submissions (each one may be a paid Dojah call). Daily caps live in KycService. */
  KYC_SUBMIT: { ttl: 60000, limit: 10 },

  /** Profile picture uploads/removals. */
  PROFILE_IMAGE: { ttl: 60000, limit: 10 },

  /** Account name enquiry / add beneficiary (may be charged per lookup by HePaid). */
  BANK_RESOLVE: { ttl: 60000, limit: 15 },

  /** Run Now (each run may send bank transfers). */
  SPLIT_RUN: { ttl: 60000, limit: 5 },

  /** Simulated salary credits (dev/QA only). */
  SIMULATE_CREDIT: { ttl: 60000, limit: 10 },

  /** CSV statement export. */
  EXPORT: { ttl: 60000, limit: 5 },

  /** Read-only lookups (banks, countries, etc.) */
  LOOKUP: { ttl: 60000, limit: 30 },
} as const;

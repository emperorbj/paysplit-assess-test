/** A credit splits automatically when it is at least this share of the expected monthly salary. */
export const AUTO_SPLIT_MIN_SHARE_BPS = 5_000;

/** Give up re-dispatching a payout HePaid never acknowledged after this long. */
export const PAYOUT_DISPATCH_TIMEOUT_MS = 24 * 60 * 60 * 1000;
/** Pending payouts younger than this are left to the request that created them. */
export const PAYOUT_SYNC_MIN_AGE_MS = 30_000;

export type SplitRunTrigger = 'auto' | 'manual';
export type SplitRunStatus = 'processing' | 'completed' | 'partial' | 'failed';

export type SplitSkipReason =
  /** Not enough left in the salary account for this rule (after higher priorities). */
  | 'insufficient_funds'
  /** Works out below ₦1. */
  | 'below_minimum'
  /** Beneficiary paused. */
  | 'destination_paused'
  /** Wallet/beneficiary no longer exists. */
  | 'destination_missing';

export const SPLIT_ENGINE_ERROR_CODES = {
  NO_ACTIVE_RULES: 'NO_ACTIVE_RULES',
  NOTHING_TO_SPLIT: 'NOTHING_TO_SPLIT',
  SALARY_ACCOUNT_NOT_ACTIVE: 'SALARY_ACCOUNT_NOT_ACTIVE',
  SPLIT_RUN_NOT_FOUND: 'SPLIT_RUN_NOT_FOUND',
  SIMULATION_DISABLED: 'SIMULATION_DISABLED',
} as const;

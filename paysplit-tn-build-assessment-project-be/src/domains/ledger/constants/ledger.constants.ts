export type LedgerAccountType = 'salary' | 'wallet' | 'system';

/**
 * System accounts (no owner). Their balances can go negative — they mirror
 * money outside PaySplit's books.
 * - external_inflow: source of incoming salary credits.
 * - payout_clearing: beneficiary payouts held/sent to HePaid but not yet settled.
 * - external_outflow: settled beneficiary payouts (money that left PaySplit).
 * - provider_fees: HePaid fees charged to users.
 */
export const SYSTEM_ACCOUNTS = {
  EXTERNAL_INFLOW: 'external_inflow',
  PAYOUT_CLEARING: 'payout_clearing',
  EXTERNAL_OUTFLOW: 'external_outflow',
  PROVIDER_FEES: 'provider_fees',
} as const;

export type SystemAccountCode = (typeof SYSTEM_ACCOUNTS)[keyof typeof SYSTEM_ACCOUNTS];

export const LEDGER_TRANSACTION_TYPES = {
  /** Money arriving in the salary account. */
  SALARY_CREDIT: 'salary_credit',
  /** Split rule: salary account → budget wallet. */
  WALLET_ALLOCATION: 'wallet_allocation',
  /** Split rule: salary account → external beneficiary (via HePaid). */
  BENEFICIARY_PAYOUT: 'beneficiary_payout',
  /** "Move": budget wallet → salary account. */
  WALLET_WITHDRAWAL: 'wallet_withdrawal',
} as const;

export type LedgerTransactionType =
  (typeof LEDGER_TRANSACTION_TYPES)[keyof typeof LEDGER_TRANSACTION_TYPES];

export type LedgerTransactionStatus = 'pending' | 'success' | 'failed' | 'reversed';

export const DEFAULT_CURRENCY = 'NGN';

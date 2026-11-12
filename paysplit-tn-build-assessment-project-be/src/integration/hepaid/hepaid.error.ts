/**
 * Raised for any failed HePaid call. `status` is the HTTP status, or 0 for a
 * network failure / timeout / missing configuration. `code` is HePaid's
 * `error.code` (e.g. `invalid_recipient`, `insufficient_balance`).
 */
export class HepaidError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = 'HepaidError';
  }

  /**
   * The request may still have gone through: HePaid unavailable, or the same
   * idempotency key / reference is already being processed or exists. Never
   * treat these as a definite failure — re-check later with the same reference.
   */
  get isOutcomeUnknown(): boolean {
    return (
      this.isProviderFailure ||
      this.code === 'idempotency_in_progress' ||
      this.code === 'duplicate_reference'
    );
  }

  /** HePaid or its gateway is down / misconfigured — not the user's fault. */
  get isProviderFailure(): boolean {
    return (
      this.status === 0 ||
      this.status >= 500 ||
      this.status === 429 ||
      this.status === 401 ||
      this.status === 403 ||
      this.code === 'no_gateway_available' ||
      this.code === 'gateway_unavailable' ||
      this.code === 'product_disabled'
    );
  }
}

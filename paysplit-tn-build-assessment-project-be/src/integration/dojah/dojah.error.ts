/**
 * Raised for any failed Dojah call. `status` is the HTTP status, or 0 for a
 * network failure / timeout / missing configuration.
 */
export class DojahError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'DojahError';
  }

  /** No record exists for the identifier. */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** Our input was rejected (bad identifier, unreadable image, etc.). */
  get isBadRequest(): boolean {
    return this.status === 400;
  }

  /** Dojah is unavailable or misconfigured — not the user's fault. */
  get isProviderFailure(): boolean {
    return !this.isNotFound && !this.isBadRequest;
  }
}

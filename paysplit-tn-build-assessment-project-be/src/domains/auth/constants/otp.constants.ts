export const OTP_TYPES = {
  REGISTRATION: 'registration',
  PASSWORD_RESET: 'password-reset',
} as const;

export type OtpType = (typeof OTP_TYPES)[keyof typeof OTP_TYPES];

/** Minutes a code stays valid. */
export const OTP_TTL_MINUTES = 10;

/** Wrong guesses allowed before a code is invalidated. */
export const OTP_MAX_ATTEMPTS = 5;

/** Minimum gap between two codes sent to the same email for the same purpose. */
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

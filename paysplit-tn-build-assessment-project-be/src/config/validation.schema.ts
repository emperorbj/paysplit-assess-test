import * as Joi from 'joi';
import { isDojahSandboxUrl } from '../integration/dojah/dojah.sandbox';

const SANDBOX_IN_PRODUCTION =
  'DOJAH_BASE_URL must not point at the Dojah sandbox when NODE_ENV=production ' +
  '(use https://api.dojah.io, or set ALLOW_DOJAH_SANDBOX=true on non-production deployments)';

const HEPAID_ANY_KEY = /^hp_(test|live)_sk_/;
const HEPAID_KEY_FORMAT = 'HEPAID_SECRET_KEY must be a HePaid secret key (hp_..._sk_...)';
const HEPAID_TEST_KEY_IN_PRODUCTION =
  'HEPAID_SECRET_KEY must be a live secret key (hp_live_sk_...) when NODE_ENV=production ' +
  '(or set ALLOW_HEPAID_TEST_KEY=true on non-production deployments)';

const PAYMENTS_SIMULATION_IN_PRODUCTION =
  'PAYMENTS_SIMULATION must be false when NODE_ENV=production ' +
  '(allowed only on dev/staging deployments with ALLOW_HEPAID_TEST_KEY=true)';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Web client base URL (deep links in emails)
  WEB_APP_URL: Joi.string().uri().optional(),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),

  // BetterStack (Logtail)
  BETTERSTACK_SOURCE_TOKEN: Joi.string().allow('').optional(),

  // SMTP (email). Leave SMTP_HOST/USER/PASS empty to run email in mock/console mode.
  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
  SMTP_FROM: Joi.string().email().optional(),
  EMAIL_FROM_NAME: Joi.string().optional(),

  // Dojah (KYC). Sandbox: https://sandbox.dojah.io, production: https://api.dojah.io
  // With NODE_ENV=production it must be set explicitly, and not to the sandbox (sandbox relaxes
  // KYC checks) unless ALLOW_DOJAH_SANDBOX=true. The Docker image always runs with
  // NODE_ENV=production, so dev/staging deployments that test with sandbox identities opt in.
  DOJAH_BASE_URL: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.when('ALLOW_DOJAH_SANDBOX', {
      // A schema, not a literal: the referenced value may still be the raw string "true".
      is: Joi.boolean().valid(true).required(),
      then: Joi.string().uri().required(),
      otherwise: Joi.string()
        .uri()
        .required()
        .custom((value: string, helpers) =>
          isDojahSandboxUrl(value) ? helpers.message({ custom: SANDBOX_IN_PRODUCTION }) : value,
        ),
    }),
    otherwise: Joi.string().uri().default('https://sandbox.dojah.io'),
  }),
  // Never set this on the real production service.
  ALLOW_DOJAH_SANDBOX: Joi.boolean().default(false),
  DOJAH_APP_ID: Joi.string().allow('').optional(),
  DOJAH_SECRET_KEY: Joi.string().allow('').optional(),
  DOJAH_FACE_MATCH_THRESHOLD: Joi.number().min(50).max(100).default(90),
  DOJAH_LIVENESS_THRESHOLD: Joi.number().min(0).max(100).default(80),
  DOJAH_NAME_MATCH_THRESHOLD: Joi.number().min(0).max(100).default(80),

  // HePaid (payments: banks, name enquiry, salary accounts, transfers).
  // The secret key decides test vs live mode. With NODE_ENV=production a live key is required
  // unless ALLOW_HEPAID_TEST_KEY=true (dev/staging deployments, which also run NODE_ENV=production).
  // Never set ALLOW_HEPAID_TEST_KEY on the real production service.
  ALLOW_HEPAID_TEST_KEY: Joi.boolean().default(false),
  HEPAID_BASE_URL: Joi.string().uri().default('https://api.hepaid.com/v1'),
  HEPAID_SECRET_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.when('ALLOW_HEPAID_TEST_KEY', {
      is: Joi.boolean().valid(true).required(),
      then: Joi.string()
        .pattern(HEPAID_ANY_KEY)
        .allow('')
        .messages({ 'string.pattern.base': HEPAID_KEY_FORMAT }),
      otherwise: Joi.string()
        .pattern(/^hp_live_sk_/)
        .allow('')
        .messages({ 'string.pattern.base': HEPAID_TEST_KEY_IN_PRODUCTION }),
    }),
    otherwise: Joi.string()
      .pattern(HEPAID_ANY_KEY)
      .allow('')
      .messages({ 'string.pattern.base': HEPAID_KEY_FORMAT }),
  }),

  HEPAID_WEBHOOK_SECRET: Joi.string()
    .pattern(/^whsec_/)
    .allow('')
    .optional()
    .messages({
      'string.pattern.base': 'HEPAID_WEBHOOK_SECRET must be the whsec_... signing secret',
    }),

  // Payments simulation (dev/QA): simulate-credit endpoint + payouts settled without HePaid.
  // Refused with NODE_ENV=production unless ALLOW_HEPAID_TEST_KEY=true (a dev deployment).
  PAYMENTS_SIMULATION: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.when('ALLOW_HEPAID_TEST_KEY', {
      is: Joi.boolean().valid(true).required(),
      then: Joi.boolean().default(false),
      otherwise: Joi.boolean().valid(false).default(false).messages({
        'any.only': PAYMENTS_SIMULATION_IN_PRODUCTION,
      }),
    }),
    otherwise: Joi.boolean().default(false),
  }),
  // Kobo held per beneficiary payout until HePaid reports the actual fee (default ₦50).
  HEPAID_TRANSFER_FEE_RESERVE: Joi.number().integer().min(0).max(1_000_000).default(5000),

  // Background jobs run inside the app on a cron schedule unless JOBS_SCHEDULER_ENABLED=false.
  JOBS_SCHEDULER_ENABLED: Joi.boolean().default(true),
  // Secret for POST /internal/jobs/:name (X-Job-Secret): manual runs or Cloud Scheduler.
  JOBS_SECRET: Joi.string().min(32).allow('').optional(),

  // Google Cloud Storage (profile images)
  GCP_STORAGE_PROJECT_ID: Joi.string().allow('').optional(),
  GCP_STORAGE_BUCKET: Joi.string().allow('').optional(),
  GCP_STORAGE_KEY_FILE: Joi.string().allow('').optional(),

  // KYC
  KYC_ENCRYPTION_KEY: Joi.string()
    .base64()
    .required()
    .description('base64 of 32 random bytes (AES-256-GCM key)'),
  KYC_MAX_IDENTITY_ATTEMPTS: Joi.number().integer().min(1).default(3),
  KYC_MAX_LIVENESS_ATTEMPTS: Joi.number().integer().min(1).default(5),

  // Security
  ALLOWED_ORIGINS: Joi.string().default('*'),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  JWT_REMEMBER_ME_EXPIRES_IN: Joi.string().default('30d'),
  JWT_SETUP_TOKEN_EXPIRES_IN: Joi.string().default('15m'),
});

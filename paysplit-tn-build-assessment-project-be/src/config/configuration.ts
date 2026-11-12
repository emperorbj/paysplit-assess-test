import { isDojahSandboxUrl } from '../integration/dojah/dojah.sandbox';

export default () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT as string, 10) || 3000,
  app: {
    // Base URL of the web client — used to build deep links in emails
    webUrl: process.env.WEB_APP_URL || 'http://localhost:3000',
  },
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT as string, 10) || 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true',
  },
  betterstack: {
    sourceToken: process.env.BETTERSTACK_SOURCE_TOKEN,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT as string, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    // Must be an address on a domain verified with the SMTP provider.
    from: process.env.SMTP_FROM || 'noreply@paysplit.com',
  },
  email: {
    fromName: process.env.EMAIL_FROM_NAME || 'PaySplit',
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS || '*',
  },
  dojah: {
    baseUrl: process.env.DOJAH_BASE_URL || 'https://sandbox.dojah.io',
    appId: process.env.DOJAH_APP_ID || '',
    secretKey: process.env.DOJAH_SECRET_KEY || '',
    faceMatchThreshold: parseFloat(process.env.DOJAH_FACE_MATCH_THRESHOLD as string) || 90,
    livenessThreshold: parseFloat(process.env.DOJAH_LIVENESS_THRESHOLD as string) || 80,
    nameMatchThreshold: parseFloat(process.env.DOJAH_NAME_MATCH_THRESHOLD as string) || 80,
    // Derived, not set directly: on when the base URL is the Dojah sandbox.
    sandboxMode: isDojahSandboxUrl(process.env.DOJAH_BASE_URL || 'https://sandbox.dojah.io'),
  },
  gcs: {
    projectId: process.env.GCP_STORAGE_PROJECT_ID || '',
    bucket: process.env.GCP_STORAGE_BUCKET || '',
    // Service-account key path for local dev; leave empty on GCP to use the runtime's identity.
    keyFile: process.env.GCP_STORAGE_KEY_FILE || '',
  },
  hepaid: {
    // Test: the dev Cloud Run URL from the HePaid docs. Live: https://api.hepaid.com/v1
    baseUrl: process.env.HEPAID_BASE_URL || 'https://api.hepaid.com/v1',
    // hp_test_sk_... or hp_live_sk_... — the key decides test vs live mode.
    secretKey: process.env.HEPAID_SECRET_KEY || '',
    // Webhook signing secret (whsec_...) from the HePaid console. Empty: webhooks are rejected
    // and salary credits are found by polling every 2 minutes instead of every 30.
    webhookSecret: process.env.HEPAID_WEBHOOK_SECRET || '',
  },
  payments: {
    // Dev/QA only: enables POST /salary-account/simulate-credit and settles payouts without
    // calling HePaid. Refused in production unless ALLOW_HEPAID_TEST_KEY=true.
    simulation: process.env.PAYMENTS_SIMULATION === 'true',
    // Held per beneficiary payout until HePaid reports the real fee; the difference is refunded.
    transferFeeReserve: parseInt(process.env.HEPAID_TRANSFER_FEE_RESERVE as string, 10) || 5000,
  },
  jobs: {
    // Run the jobs inside the app on a cron schedule (default). On Cloud Run this needs CPU
    // always allocated and min instances >= 1.
    schedulerEnabled: process.env.JOBS_SCHEDULER_ENABLED !== 'false',
    // Shared secret for POST /internal/jobs/:name (manual runs / Cloud Scheduler). Empty disables it.
    secret: process.env.JOBS_SECRET || '',
  },
  kyc: {
    // base64-encoded 32-byte key for encrypting BVN/NIN/document numbers at rest.
    encryptionKey: process.env.KYC_ENCRYPTION_KEY,
    maxIdentityAttemptsPerDay: parseInt(process.env.KYC_MAX_IDENTITY_ATTEMPTS as string, 10) || 3,
    maxLivenessAttemptsPerDay: parseInt(process.env.KYC_MAX_LIVENESS_ATTEMPTS as string, 10) || 5,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    // Used when the user ticks "Remember for 30 days" at login.
    rememberMeExpiresIn: process.env.JWT_REMEMBER_ME_EXPIRES_IN || '30d',
    // Token issued after email verification, only valid for setting the password.
    setupTokenExpiresIn: process.env.JWT_SETUP_TOKEN_EXPIRES_IN || '15m',
  },
});

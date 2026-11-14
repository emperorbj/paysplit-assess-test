import "dotenv/config"
import { z } from "zod"

const bool = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1")

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  /** Render sits behind one proxy; needed for correct client IPs in rate limits. */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  /** Comma-separated list of allowed browser origins. */
  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

  /** "mock" never calls Dojah (tests, offline dev). */
  KYC_PROVIDER: z.enum(["dojah", "mock"]).default("dojah"),
  DOJAH_BASE_URL: z.url().default("https://sandbox.dojah.io"),
  DOJAH_APP_ID: z.string().default(""),
  DOJAH_SECRET_KEY: z.string().default(""),
  /**
   * Require the BVN/NIN record's names to match the account names. Off by
   * default because the Dojah sandbox always returns the same test person.
   */
  KYC_ENFORCE_NAME_MATCH: bool.default(false),
  /**
   * The Dojah sandbox returns one fixed liveness/document verdict for every
   * image (always "spoof"/"INVALID"). When true, sandbox checks still need a
   * detected face/document but ignore that canned verdict. No effect on the
   * live API (api.dojah.io).
   */
  DOJAH_SANDBOX_TRUST_CHECKS: bool.default(true),

  /** Neon Object Storage (S3-compatible). Uploads return 503 when unset. */
  AWS_ACCESS_KEY_ID: z.string().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().default(""),
  AWS_ENDPOINT_URL_S3: z.string().default(""),
  AWS_REGION: z.string().default("us-east-1"),
  STORAGE_BUCKET: z.string().default(""),
  /** Public base URL for objects; defaults to `${endpoint}/${bucket}`. */
  STORAGE_PUBLIC_URL: z.string().default(""),

  /** Turns on POST /simulations/salary-credit (fake incoming transfers). */
  ENABLE_SIMULATIONS: bool.default(true),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n")
  // Logger isn't configured yet (it needs env), so write directly.
  process.stderr.write(`Invalid environment configuration:\n${problems}\n`)
  process.exit(1)
}

const data = parsed.data

if (data.KYC_PROVIDER === "dojah" && (!data.DOJAH_APP_ID || !data.DOJAH_SECRET_KEY)) {
  process.stderr.write(
    "KYC_PROVIDER=dojah needs DOJAH_APP_ID and DOJAH_SECRET_KEY (or set KYC_PROVIDER=mock).\n"
  )
  process.exit(1)
}

export const env = {
  ...data,
  isProduction: data.NODE_ENV === "production",
  isTest: data.NODE_ENV === "test",
  corsOrigins: data.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean),
  storageEnabled: Boolean(
    data.AWS_ACCESS_KEY_ID &&
    data.AWS_SECRET_ACCESS_KEY &&
    data.AWS_ENDPOINT_URL_S3 &&
    data.STORAGE_BUCKET
  ),
}

export type Env = typeof env

import { env } from "../../config/env.js"
import { createDojahProvider } from "./dojah.provider.js"
import type { KycProvider } from "./kyc-provider.js"
import { createMockKycProvider } from "./mock.provider.js"

export * from "./kyc-provider.js"

export const kycProvider: KycProvider =
  env.KYC_PROVIDER === "mock"
    ? createMockKycProvider()
    : createDojahProvider({
        baseUrl: env.DOJAH_BASE_URL,
        appId: env.DOJAH_APP_ID,
        secretKey: env.DOJAH_SECRET_KEY,
        sandboxTrustChecks: env.DOJAH_SANDBOX_TRUST_CHECKS,
      })

import { defineConfig } from "vitest/config"

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://paysplit:paysplit@localhost:54329/paysplit_test"

export default defineConfig({
  test: {
    globalSetup: ["./test/global-setup.ts"],
    // Files share one database; each test uses its own users, so no truncation between tests.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DATABASE_URL,
      JWT_SECRET: "test-secret-that-is-definitely-long-enough-123",
      KYC_PROVIDER: "mock",
      KYC_ENFORCE_NAME_MATCH: "false",
      ENABLE_SIMULATIONS: "true",
      CORS_ORIGINS: "http://localhost:3000",
      AWS_ACCESS_KEY_ID: "",
      STORAGE_BUCKET: "",
    },
  },
})

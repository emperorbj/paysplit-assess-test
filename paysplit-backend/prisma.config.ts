import "dotenv/config"
import { defineConfig } from "prisma/config"

/**
 * The CLI (migrate, studio) uses the direct Neon connection: migrations need a
 * session, which the pooler can't hold. The app itself uses DATABASE_URL
 * (pooled). `prisma generate` needs no database, so a missing URL is fine there.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
})

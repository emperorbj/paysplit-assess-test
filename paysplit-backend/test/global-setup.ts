import { execSync } from "node:child_process"

import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

import { PrismaClient } from "../src/generated/prisma/client.js"
import { seedCategories } from "../prisma/seed.js"

const url =
  process.env.TEST_DATABASE_URL ??
  "postgresql://paysplit:paysplit@localhost:54329/paysplit_test"

/** Creates the test database if needed, migrates it, wipes it and seeds categories. */
export default async function setup() {
  const target = new URL(url)
  const dbName = target.pathname.slice(1)
  const admin = new URL(url)
  admin.pathname = "/postgres"
  const client = new pg.Client({ connectionString: admin.toString() })
  await client.connect()
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
    dbName,
  ])
  if (exists.rowCount === 0) await client.query(`CREATE DATABASE "${dbName}"`)
  await client.end()

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    stdio: "ignore",
  })

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })
  await prisma.$executeRawUnsafe(
    `TRUNCATE "Notification", "Transaction", "SplitRun", "SplitRule", "Wallet", "IncomeProfile", "SalaryAccount", "KycVerification", "NotificationPreference", "User" CASCADE`
  )
  await seedCategories(prisma)
  await prisma.$disconnect()
}

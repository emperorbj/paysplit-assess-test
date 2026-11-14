import { PrismaPg } from "@prisma/adapter-pg"

import { env } from "../config/env.js"
import { PrismaClient } from "../generated/prisma/client.js"

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

/**
 * Neon suspends idle compute; the first queries after a wake-up can take
 * seconds. Prisma's default 5s interactive-transaction limit would then roll a
 * transaction back mid-way, so every transaction gets more room.
 */
export const prisma = new PrismaClient({
  adapter,
  transactionOptions: { maxWait: 10_000, timeout: 30_000 },
})

/** The client handed to callbacks of `prisma.$transaction(async (tx) => …)`. */
export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
/** Either the root client or a transaction client. */
export type Db = typeof prisma | Tx

import { createApp } from "./app.js"
import { env } from "./config/env.js"
import { logger } from "./lib/logger.js"
import { prisma } from "./lib/prisma.js"

const app = createApp()

const server = app.listen(env.PORT, () => {
  logger.info(`PaySplit API listening on port ${env.PORT} (docs at /docs)`)
})

/** Render sends SIGTERM on deploys: finish in-flight requests, then close the pool. */
function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`)
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection")
})

import cors from "cors"
import express, { Router } from "express"
import helmet from "helmet"
import { pinoHttp } from "pino-http"
import swaggerUi from "swagger-ui-express"

import { env } from "./config/env.js"
import { logger } from "./lib/logger.js"
import { buildOpenApiDocument } from "./lib/openapi.js"
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js"
import { apiLimiter } from "./middleware/rate-limit.js"
import { authRouter } from "./modules/auth/auth.routes.js"
import { categoriesRouter } from "./modules/categories/categories.routes.js"
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js"
import { healthRouter } from "./modules/health/health.routes.js"
import { kycRouter } from "./modules/kyc/kyc.routes.js"
import { notificationsRouter } from "./modules/notifications/notifications.routes.js"
import { salaryAccountRouter } from "./modules/salary-account/salary-account.routes.js"
import { setupRouter } from "./modules/setup/setup.routes.js"
import { simulationsRouter } from "./modules/simulations/simulations.routes.js"
import { splitRulesRouter } from "./modules/split-rules/split-rules.routes.js"
import { splitRunsRouter } from "./modules/split-runs/split-runs.routes.js"
import { transactionsRouter } from "./modules/transactions/transactions.routes.js"
import { usersRouter } from "./modules/users/users.routes.js"
import { walletsRouter } from "./modules/wallets/wallets.routes.js"

export const API_PREFIX = "/api/v1"

export function createApp() {
  const app = express()

  app.disable("x-powered-by")
  app.set("trust proxy", env.TRUST_PROXY)
  app.set("query parser", "extended")

  app.use(
    helmet({
      // Swagger UI needs inline scripts/styles on /docs.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  )
  app.use(
    cors({
      origin: (origin, callback) => {
        // Non-browser clients (curl, server-to-server) send no Origin.
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true)
        callback(null, false)
      },
      allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
      exposedHeaders: ["Content-Disposition", "RateLimit", "RateLimit-Policy"],
      credentials: true,
      maxAge: 600,
    })
  )
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === "/health" },
      // One compact line per request; never headers (they carry tokens).
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      customLogLevel: (_req, res, error) =>
        error || res.statusCode >= 500
          ? "error"
          : res.statusCode >= 400
            ? "warn"
            : "info",
    })
  )
  app.use(express.json({ limit: "100kb" }))

  app.use(healthRouter)
  app.get("/", (_req, res) => {
    res.json({ name: "PaySplit API", version: "1.0.0", docs: "/docs", health: "/health" })
  })

  const api = Router()
  api.use(apiLimiter)
  api.use("/auth", authRouter)
  api.use("/users", usersRouter)
  api.use("/kyc", kycRouter)
  api.use("/setup", setupRouter)
  api.use("/salary-account", salaryAccountRouter)
  api.use("/categories", categoriesRouter)
  api.use("/wallets", walletsRouter)
  api.use("/split-rules", splitRulesRouter)
  api.use("/split-runs", splitRunsRouter)
  api.use("/transactions", transactionsRouter)
  api.use("/dashboard", dashboardRouter)
  api.use("/notifications", notificationsRouter)
  if (env.ENABLE_SIMULATIONS) api.use("/simulations", simulationsRouter)
  app.use(API_PREFIX, api)

  // Routes register their docs as they're mounted, so build the spec last.
  const openApi = buildOpenApiDocument(API_PREFIX)
  app.get("/docs-json", (_req, res) => {
    res.json(openApi)
  })
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApi, {
      customSiteTitle: "PaySplit API",
      swaggerOptions: { persistAuthorization: true },
    })
  )

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}

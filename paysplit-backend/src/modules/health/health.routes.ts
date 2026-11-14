import { Router } from "express"

import { prisma } from "../../lib/prisma.js"

export const healthRouter = Router()

/** Liveness + database check for Render's health probe. */
healthRouter.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: "ok", database: "up", uptime: Math.round(process.uptime()) })
  } catch {
    res.status(503).json({
      status: "degraded",
      database: "down",
      uptime: Math.round(process.uptime()),
    })
  }
})

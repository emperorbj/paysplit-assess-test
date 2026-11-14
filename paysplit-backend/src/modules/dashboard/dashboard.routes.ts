import { Router } from "express"
import { z } from "zod"

import { mountRoutes, route } from "../../lib/http.js"
import { cashFlow, dashboardSummary } from "./dashboard.service.js"

export const dashboardRouter = Router()

mountRoutes(dashboardRouter, "/dashboard", [
  route({
    method: "get",
    path: "/summary",
    tag: "Dashboard",
    summary: "Stats, salary partition, next split and onboarding",
    handler: ({ userId }) => dashboardSummary(userId),
  }),
  route({
    method: "get",
    path: "/cash-flow",
    tag: "Dashboard",
    summary: "Cash flow by month (default last 9) or by day (ranges ≤ 62 days)",
    query: z.object({
      from: z.iso.date().optional().openapi({ description: "YYYY-MM-DD (Lagos)" }),
      to: z.iso.date().optional().openapi({ description: "YYYY-MM-DD (Lagos)" }),
    }),
    handler: ({ userId, query }) => cashFlow(userId, query),
  }),
])

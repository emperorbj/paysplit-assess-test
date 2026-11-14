import { Router } from "express"
import { z } from "zod"

import { mountRoutes, route } from "../../lib/http.js"
import { pageQuerySchema } from "../../lib/pagination.js"
import { sensitiveLimiter } from "../../middleware/rate-limit.js"
import * as runs from "./split-runs.service.js"

const TAG = "Split runs"

export const splitRunsRouter = Router()

mountRoutes(splitRunsRouter, "/split-runs", [
  route({
    method: "get",
    path: "/",
    tag: TAG,
    summary: "Split history (newest first)",
    query: pageQuerySchema,
    handler: ({ userId, query }) => runs.listRuns(userId, query),
  }),
  route({
    method: "post",
    path: "/",
    tag: TAG,
    summary: "Run the split now",
    description:
      "Applies active rules to the salary account balance in priority order. Percentages are of the monthly salary. Rules that don't fit are skipped and listed in `skipped`.",
    status: 201,
    errors: {
      422: "SALARY_ACCOUNT_INACTIVE, INCOME_REQUIRED, NO_ACTIVE_RULES or NO_FUNDS",
    },
    middleware: [sensitiveLimiter],
    handler: ({ userId }) => runs.runManualSplit(userId),
  }),
  route({
    method: "get",
    path: "/:id",
    tag: TAG,
    summary: "One run with the transfers it made",
    params: z.object({ id: z.uuid() }),
    errors: { 404: "SPLIT_RUN_NOT_FOUND" },
    handler: ({ userId, params }) => runs.getRun(userId, params.id),
  }),
])

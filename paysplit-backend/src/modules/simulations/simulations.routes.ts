import { Router } from "express"
import { z } from "zod"

import { badRequest } from "../../lib/errors.js"
import { mountRoutes, route } from "../../lib/http.js"
import { MAX_KOBO } from "../../lib/money.js"
import { sensitiveLimiter } from "../../middleware/rate-limit.js"
import { simulateSalaryCredit } from "./simulations.service.js"

export const simulationsRouter = Router()

const creditSchema = z
  .object({
    amount: z
      .number()
      .int("Must be whole kobo")
      .positive()
      .max(MAX_KOBO)
      .openapi({ description: "kobo", example: 85_000_000 }),
    senderName: z.string().trim().min(1).max(80).optional().openapi({
      description: "Defaults to the employer on the income profile",
    }),
    narration: z.string().trim().max(140).optional(),
    autoSplit: z.boolean().optional().default(true).openapi({
      description: "Run the split right after the credit (default true)",
    }),
  })
  .openapi("SimulateSalaryCreditDto")

mountRoutes(simulationsRouter, "/simulations", [
  route({
    method: "post",
    path: "/salary-credit",
    tag: "Simulations",
    summary: "Simulate a salary payment into the salary account",
    description:
      "Credits the account and, by default, splits it into wallets immediately. Send an `Idempotency-Key` header to make retries safe (a repeat returns 200 with `replayed: true`). Disabled when ENABLE_SIMULATIONS=false.",
    status: 201,
    body: creditSchema,
    errors: { 422: "SALARY_ACCOUNT_INACTIVE" },
    middleware: [sensitiveLimiter],
    handler: async ({ userId, body, req, res }) => {
      const key = req.header("Idempotency-Key")?.trim()
      if (key !== undefined && (key.length === 0 || key.length > 100))
        throw badRequest(["Idempotency-Key: 1–100 characters"], "VALIDATION_ERROR")
      const { status, body: result } = await simulateSalaryCredit(userId, body, key)
      res.status(status).json(result)
    },
  }),
])

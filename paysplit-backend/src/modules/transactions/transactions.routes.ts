import { Router } from "express"
import { z } from "zod"

import { mountRoutes, route } from "../../lib/http.js"
import { pageQuerySchema } from "../../lib/pagination.js"
import * as transactions from "./transactions.service.js"

const TAG = "Transactions"

export const transactionsRouter = Router()

const ymd = z.iso.date("Use YYYY-MM-DD")

export const filterSchema = z.object({
  type: z.enum(["all", "wallet", "beneficiary", "salary"]).optional(),
  direction: z.enum(["all", "in", "out"]).optional(),
  status: z.enum(["pending", "success", "failed", "reversed"]).optional(),
  search: z.string().trim().max(100).optional(),
  from: ymd.optional().openapi({ description: "Lagos date, inclusive" }),
  to: ymd.optional().openapi({ description: "Lagos date, inclusive" }),
})

mountRoutes(transactionsRouter, "/transactions", [
  route({
    method: "get",
    path: "/",
    tag: TAG,
    summary: "Salary account ledger with filters (newest first)",
    query: pageQuerySchema.extend(filterSchema.shape),
    handler: ({ userId, query }) => transactions.listTransactions(userId, query),
  }),
  route({
    method: "get",
    path: "/export",
    tag: TAG,
    summary: "Download the filtered ledger as CSV (max 5,000 rows)",
    query: filterSchema,
    handler: async ({ userId, query, res }) => {
      const { filename, content } = await transactions.exportTransactionsCsv(
        userId,
        query
      )
      res.status(200).type("text/csv; charset=utf-8").attachment(filename).send(content)
    },
  }),
  route({
    method: "get",
    path: "/:id",
    tag: TAG,
    summary: "Transaction receipt",
    params: z.object({ id: z.uuid() }),
    errors: { 404: "TRANSACTION_NOT_FOUND" },
    handler: ({ userId, params }) => transactions.getTransaction(userId, params.id),
  }),
])

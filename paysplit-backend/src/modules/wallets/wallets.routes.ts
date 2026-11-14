import { Router } from "express"
import { z } from "zod"

import { mountRoutes, route } from "../../lib/http.js"
import { MAX_KOBO } from "../../lib/money.js"
import { pageQuerySchema } from "../../lib/pagination.js"
import { ACCENT_COLORS, ACCENT_KEYS } from "./accent-colors.js"
import * as wallets from "./wallets.service.js"

const TAG = "Wallets"

export const walletsRouter = Router()

const koboAmount = z.number().int("Must be whole kobo").positive().max(MAX_KOBO)

const createSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    categoryId: z.string().min(1),
    accentColor: z.enum(ACCENT_KEYS),
    targetAmount: koboAmount
      .nullable()
      .optional()
      .openapi({ description: "kobo; null = no target" }),
  })
  .openapi("CreateWalletDto")

const updateSchema = createSchema.partial().openapi("UpdateWalletDto")
const idParams = z.object({ id: z.uuid() })
const search = z.string().trim().max(100).optional()

mountRoutes(walletsRouter, "/wallets", [
  route({
    method: "get",
    path: "/",
    tag: TAG,
    summary: "All wallets (oldest first)",
    handler: ({ userId }) => wallets.listWallets(userId),
  }),
  route({
    method: "get",
    path: "/accent-colors",
    tag: TAG,
    summary: "Accent colours a wallet can use",
    handler: () => ACCENT_COLORS,
  }),
  route({
    method: "get",
    path: "/activity",
    tag: TAG,
    summary: "Movements across all wallets (in = allocated, out = moved back)",
    query: pageQuerySchema.extend({
      direction: z.enum(["all", "in", "out"]).optional(),
      search,
    }),
    handler: ({ userId, query }) => wallets.walletActivity(userId, query),
  }),
  route({
    method: "post",
    path: "/",
    tag: TAG,
    summary: "Create a wallet",
    status: 201,
    body: createSchema,
    errors: {
      409: "WALLET_NAME_TAKEN",
      422: "CATEGORY_NOT_FOUND or WALLET_LIMIT_REACHED",
    },
    handler: ({ userId, body }) => wallets.createWallet(userId, body),
  }),
  route({
    method: "get",
    path: "/:id",
    tag: TAG,
    summary: "Wallet with stats and its linked split rule",
    params: idParams,
    errors: { 404: "WALLET_NOT_FOUND" },
    handler: ({ userId, params }) => wallets.getWallet(userId, params.id),
  }),
  route({
    method: "patch",
    path: "/:id",
    tag: TAG,
    summary: "Update a wallet",
    params: idParams,
    body: updateSchema,
    errors: {
      404: "WALLET_NOT_FOUND",
      409: "WALLET_NAME_TAKEN",
      422: "CATEGORY_NOT_FOUND",
    },
    handler: ({ userId, params, body }) => wallets.updateWallet(userId, params.id, body),
  }),
  route({
    method: "delete",
    path: "/:id",
    tag: TAG,
    summary: "Delete an empty wallet (and its split rule)",
    params: idParams,
    errors: { 404: "WALLET_NOT_FOUND", 409: "WALLET_NOT_EMPTY" },
    handler: ({ userId, params }) => wallets.deleteWallet(userId, params.id),
  }),
  route({
    method: "get",
    path: "/:id/transactions",
    tag: TAG,
    summary: "One wallet's history",
    params: idParams,
    query: pageQuerySchema.extend({
      filter: z.enum(["all", "allocated", "moved"]).optional(),
      search,
    }),
    errors: { 404: "WALLET_NOT_FOUND" },
    handler: ({ userId, params, query }) =>
      wallets.walletTransactions(userId, params.id, query),
  }),
  route({
    method: "post",
    path: "/:id/move",
    tag: TAG,
    summary: "Move money from the wallet back to the salary account",
    params: idParams,
    body: z.object({ amount: koboAmount }).openapi("MoveWalletFundsDto"),
    errors: { 404: "WALLET_NOT_FOUND", 422: "INSUFFICIENT_BALANCE" },
    handler: ({ userId, params, body }) =>
      wallets.moveToSalary(userId, params.id, body.amount),
  }),
])

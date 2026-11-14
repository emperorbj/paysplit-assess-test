import { Router } from "express"
import { z } from "zod"

import { mountRoutes, route } from "../../lib/http.js"
import { pageQuerySchema } from "../../lib/pagination.js"
import * as rules from "./split-rules.service.js"

const TAG = "Split rules"

export const splitRulesRouter = Router()

const ruleFields = {
  name: z.string().trim().min(1).max(60),
  priority: z
    .number()
    .int()
    .min(1)
    .max(100)
    .openapi({ description: "1–100, lower runs first" }),
  destinationType: z.enum(["wallet", "beneficiary"]).openapi({
    description: "Only `wallet` is supported in this build",
  }),
  walletId: z.uuid().optional(),
  beneficiaryId: z.string().optional(),
  method: z.enum(["fixed", "percentage"]),
  value: z.number().positive().openapi({
    description: "fixed: kobo. percentage: percent of salary (up to 2 decimals)",
  }),
  status: z.enum(["active", "paused"]).optional(),
}

const createSchema = z.object(ruleFields).openapi("CreateSplitRuleDto")
const updateSchema = z.object(ruleFields).partial().openapi("UpdateSplitRuleDto")
const idParams = z.object({ id: z.uuid() })

const allocationErrors = {
  422: "ALLOCATION_EXCEEDS_SALARY, INCOME_REQUIRED, INVALID_RULE_VALUE, DESTINATION_NOT_FOUND or BENEFICIARIES_NOT_SUPPORTED",
}

mountRoutes(splitRulesRouter, "/split-rules", [
  route({
    method: "get",
    path: "/summary",
    tag: TAG,
    summary: "Allocation of the monthly salary across active rules",
    handler: ({ userId }) => rules.rulesSummary(userId),
  }),
  route({
    method: "get",
    path: "/",
    tag: TAG,
    summary: "Rules in priority order",
    query: pageQuerySchema.extend({
      status: z.enum(["all", "active", "paused"]).optional(),
      search: z.string().trim().max(100).optional(),
    }),
    handler: ({ userId, query }) => rules.listRules(userId, query),
  }),
  route({
    method: "post",
    path: "/",
    tag: TAG,
    summary: "Create a rule (one per wallet)",
    status: 201,
    body: createSchema,
    errors: { 409: "DESTINATION_HAS_RULE", ...allocationErrors },
    handler: ({ userId, body }) => rules.createRule(userId, body),
  }),
  route({
    method: "get",
    path: "/:id",
    tag: TAG,
    summary: "One rule",
    params: idParams,
    errors: { 404: "RULE_NOT_FOUND" },
    handler: ({ userId, params }) => rules.getRule(userId, params.id),
  }),
  route({
    method: "patch",
    path: "/:id",
    tag: TAG,
    summary: "Edit a rule, or pause/resume it with { status }",
    description: "Send `method` and `value` together when changing the amount.",
    params: idParams,
    body: updateSchema,
    errors: { 404: "RULE_NOT_FOUND", 409: "DESTINATION_HAS_RULE", ...allocationErrors },
    handler: ({ userId, params, body }) => rules.updateRule(userId, params.id, body),
  }),
  route({
    method: "delete",
    path: "/:id",
    tag: TAG,
    summary: "Delete a rule",
    params: idParams,
    errors: { 404: "RULE_NOT_FOUND" },
    handler: ({ userId, params }) => rules.deleteRule(userId, params.id),
  }),
])

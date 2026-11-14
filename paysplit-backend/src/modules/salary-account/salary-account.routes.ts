import { Router } from "express"
import { z } from "zod"

import { mountRoutes, route } from "../../lib/http.js"
import { sensitiveLimiter } from "../../middleware/rate-limit.js"
import { addSalaryIdentity, getSalaryAccountDetails } from "./salary-account.service.js"

const TAG = "Salary account"

export const salaryAccountRouter = Router()

export const bankIdentitySchema = z
  .object({
    method: z.enum(["bvn", "nin"]),
    idNumber: z
      .string()
      .trim()
      .regex(/^\d{11}$/, "Must be 11 digits"),
  })
  .openapi("BankIdentityDto")

mountRoutes(salaryAccountRouter, "/salary-account", [
  route({
    method: "get",
    path: "/",
    tag: TAG,
    summary: "Salary account, balance and funding details",
    description:
      '`accountNumber` is null until the account is issued (after KYC with a BVN/NIN). `actionRequired: "add_bvn_or_nin"` means KYC passed with a foreign document and a BVN/NIN is still needed.',
    handler: ({ userId }) => getSalaryAccountDetails(userId),
  }),
  route({
    method: "post",
    path: "/identity",
    tag: TAG,
    summary: "Add a BVN/NIN to get the salary account issued",
    body: bankIdentitySchema,
    errors: {
      409: "KYC_REQUIRED or IDENTITY_ALREADY_VERIFIED",
      422: "IDENTITY_NOT_FOUND",
      503: "KYC_PROVIDER_UNAVAILABLE",
    },
    middleware: [sensitiveLimiter],
    handler: ({ userId, body }) => addSalaryIdentity(userId, body),
  }),
])

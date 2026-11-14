import { Router } from "express"
import { z } from "zod"

import { mountRoutes, route } from "../../lib/http.js"
import { MAX_KOBO } from "../../lib/money.js"
import { prisma } from "../../lib/prisma.js"
import { getOnboarding } from "../onboarding/onboarding.service.js"
import { presentIncome } from "../users/user.presenter.js"

const TAG = "Setup"

export const setupRouter = Router()

const incomeSchema = z
  .object({
    employerName: z.string().trim().min(1).max(120),
    monthlyAmount: z
      .number()
      .int("Must be whole kobo")
      .positive()
      .max(MAX_KOBO)
      .openapi({ description: "Monthly net salary in kobo", example: 85_000_000 }),
    paydayDay: z.number().int().min(1).max(31).openapi({
      description: "Day of month; 31 = last day of shorter months",
      example: 28,
    }),
  })
  .openapi("UpsertIncomeDto")

mountRoutes(setupRouter, "/setup", [
  route({
    method: "get",
    path: "/income",
    tag: TAG,
    summary: "Salary income source (null until set)",
    handler: async ({ userId }) => ({
      income: presentIncome(await prisma.incomeProfile.findUnique({ where: { userId } })),
    }),
  }),
  route({
    method: "put",
    path: "/income",
    tag: TAG,
    summary: "Create or update the salary income source (setup step 1)",
    body: incomeSchema,
    handler: async ({ userId, body }) => {
      const income = await prisma.incomeProfile.upsert({
        where: { userId },
        create: { userId, ...body, monthlyAmount: BigInt(body.monthlyAmount) },
        update: { ...body, monthlyAmount: BigInt(body.monthlyAmount) },
      })
      return { income: presentIncome(income)!, onboarding: await getOnboarding(userId) }
    },
  }),
  route({
    method: "get",
    path: "/progress",
    tag: TAG,
    summary: "Onboarding checklist and progress",
    handler: async ({ userId }) => ({ onboarding: await getOnboarding(userId) }),
  }),
])

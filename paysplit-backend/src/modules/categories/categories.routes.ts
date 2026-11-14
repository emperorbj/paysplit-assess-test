import { Router } from "express"

import { mountRoutes, route } from "../../lib/http.js"
import { prisma } from "../../lib/prisma.js"

export const categoriesRouter = Router()

mountRoutes(categoriesRouter, "/categories", [
  route({
    method: "get",
    path: "/",
    tag: "Wallets",
    summary: "Wallet categories (public, stable ids)",
    auth: false,
    handler: () =>
      prisma.category.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, slug: true },
      }),
  }),
])

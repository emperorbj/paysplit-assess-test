import "dotenv/config"

import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "../src/generated/prisma/client.js"

/** Wallet categories with stable ids the frontend can rely on. Safe to re-run. */
export const CATEGORIES = [
  { id: "housing", name: "Housing & Rent" },
  { id: "savings", name: "Savings" },
  { id: "emergency", name: "Emergency Fund" },
  { id: "investment", name: "Investment" },
  { id: "education", name: "Education" },
  { id: "transport", name: "Transport" },
  { id: "food", name: "Food & Groceries" },
  { id: "utilities", name: "Bills & Utilities" },
  { id: "health", name: "Health" },
  { id: "family", name: "Family Support" },
  { id: "travel", name: "Travel" },
  { id: "other", name: "Other" },
]

export async function seedCategories(prisma: PrismaClient) {
  for (const [index, category] of CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { id: category.id },
      create: { ...category, slug: category.id, sortOrder: index },
      update: { name: category.name, sortOrder: index },
    })
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`

if (isMain) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    }),
  })
  await seedCategories(prisma)
  console.log(`Seeded ${CATEGORIES.length} categories`)
  await prisma.$disconnect()
}

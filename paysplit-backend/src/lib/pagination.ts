import { z } from "zod"

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

export type PageQuery = z.output<typeof pageQuerySchema>

/** List endpoints return `{ data, pagination }` (frontend type `Paginated<T>`). */
export type Paginated<T> = {
  data: T[]
  pagination: { total: number; page: number; limit: number; pages: number }
}

export function paginate<T>(
  data: T[],
  total: number,
  { page, limit }: PageQuery
): Paginated<T> {
  return {
    data,
    pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
  }
}

export function skipTake({ page, limit }: PageQuery) {
  return { skip: (page - 1) * limit, take: limit }
}

/** Query-string boolean: "true"/"1" → true. */
export const queryBoolean = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1")

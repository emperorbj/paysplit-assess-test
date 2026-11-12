/** List endpoints return `{ data, pagination }`. */
export type Paginated<T> = {
  data: T[]
  pagination: { total: number; page: number; limit: number; pages: number }
}

export type PageParams = { page?: number; limit?: number; search?: string }

export type Category = { id: string; name: string; slug: string }

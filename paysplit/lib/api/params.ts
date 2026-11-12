/** Drop empty query params so we don't send `search=` and the like. */
export function cleanParams<T extends object>(params: T) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== ""
    )
  )
}

import type { z } from "zod"

import { badRequest } from "./errors.js"

/** Human-readable messages for each Zod issue: "email: Invalid email address". */
export function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".")
    return path ? `${path}: ${issue.message}` : issue.message
  })
}

/** Validate input against a schema or throw a 400 with every problem listed. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input)
  if (!result.success) throw badRequest(formatZodIssues(result.error), "VALIDATION_ERROR")
  return result.data
}

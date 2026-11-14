import { STATUS_CODES } from "node:http"

/**
 * Every error the API returns has this body, which the frontend's
 * lib/api/errors.ts already understands:
 *   { statusCode, message, error, code? }
 * `message` is a string[] for validation errors.
 */
export type ErrorBody = {
  statusCode: number
  message: string | string[]
  error: string
  code?: string
  details?: unknown
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string | string[],
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(Array.isArray(message) ? message.join(". ") : message)
    this.name = "AppError"
    this.messages = message
  }

  readonly messages: string | string[]

  toBody(): ErrorBody {
    return {
      statusCode: this.statusCode,
      message: this.messages,
      error: STATUS_CODES[this.statusCode] ?? "Error",
      ...(this.code ? { code: this.code } : {}),
      ...(this.details !== undefined ? { details: this.details } : {}),
    }
  }
}

export const badRequest = (message: string | string[], code?: string) =>
  new AppError(400, message, code)
export const unauthorized = (
  message = "Missing or invalid Authorization header",
  code?: string
) => new AppError(401, message, code)
export const forbidden = (
  message = "You don't have permission to do that",
  code?: string
) => new AppError(403, message, code)
export const notFound = (message = "Not found", code?: string) =>
  new AppError(404, message, code)
export const conflict = (message: string, code?: string) =>
  new AppError(409, message, code)
export const unprocessable = (message: string, code?: string, details?: unknown) =>
  new AppError(422, message, code, details)
export const tooManyRequests = (message: string, code?: string, details?: unknown) =>
  new AppError(429, message, code, details)
export const serviceUnavailable = (message: string, code?: string) =>
  new AppError(503, message, code)

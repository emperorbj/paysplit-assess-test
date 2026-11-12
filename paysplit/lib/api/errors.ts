import { isAxiosError } from "axios"

/** Every failed API call is normalised into this shape (see lib/api/client.ts). */
export class ApiError extends Error {
  constructor(
    /** HTTP status; 0 when the request never reached the server */
    public status: number,
    message: string,
    /** Backend machine-readable code, e.g. "ACCOUNT_SETUP_INCOMPLETE" */
    public code?: string,
    /** Raw response body, for debugging or field-level messages */
    public details?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

type BackendError = {
  message?: string | string[]
  error?: string
  statusCode?: number
  code?: string
}

const FALLBACKS: Record<number, string> = {
  400: "Some details are invalid. Please check and try again.",
  401: "Your session has expired. Please log in again.",
  403: "You don’t have permission to do that.",
  404: "We couldn’t find what you were looking for.",
  409: "That conflicts with existing data.",
  422: "We couldn’t verify those details.",
  429: "Too many attempts. Please wait a minute and try again.",
  503: "The service is temporarily unavailable. Please try again shortly.",
}

/** Turn anything thrown by axios (or our own code) into an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (isAxiosError<BackendError>(error)) {
    if (!error.response) {
      return new ApiError(
        0,
        error.code === "ECONNABORTED"
          ? "The request timed out. Please try again."
          : "Can’t reach PaySplit. Check your connection and try again."
      )
    }
    const { status, data } = error.response
    const raw = Array.isArray(data?.message)
      ? data.message.join(". ")
      : data?.message
    // 429 bodies are often generic; prefer our friendlier copy.
    const message =
      (status !== 429 && raw) ||
      FALLBACKS[status] ||
      "Something went wrong. Please try again."
    return new ApiError(status, message, data?.code, data)
  }

  if (error instanceof Error) return new ApiError(0, error.message)
  return new ApiError(0, "Something went wrong. Please try again.")
}

/** Human-readable message for any error (for toasts and inline errors). */
export function errorMessage(error: unknown) {
  return toApiError(error).message
}

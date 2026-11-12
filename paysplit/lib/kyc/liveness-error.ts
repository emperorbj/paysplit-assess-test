import { ApiError, toApiError } from "@/lib/api/errors"

// The API documents three 422 causes but not the exact `code` strings, so these
// match on the wording. Mismatch goes first: it's the most specific.
const GUIDANCE: [RegExp, string][] = [
  [
    /MISMATCH|NOT_?MATCH|MATCH_?FAIL/,
    "Your selfie didn’t match your ID record. Face the camera straight on, with no glasses or hat, and try again.",
  ],
  [
    /NO_?FACE|FACE_?NOT_?(FOUND|DETECTED)/,
    "We couldn’t see a face. Centre your face in the circle and try again.",
  ],
  [
    /NOT_?LIVE|LIVENESS|SPOOF/,
    "We couldn’t confirm this was a live photo. Hold still, look at the camera and try again.",
  ],
]

/** Replaces a failed liveness check's message with what to do next. */
export function toLivenessError(error: unknown): ApiError {
  const apiError = toApiError(error)
  if (apiError.status !== 422 || !apiError.code) return apiError

  const code = apiError.code.toUpperCase().replace(/[\s-]+/g, "_")
  const guidance = GUIDANCE.find(([pattern]) => pattern.test(code))?.[1]
  if (!guidance) return apiError

  return new ApiError(
    apiError.status,
    guidance,
    apiError.code,
    apiError.details
  )
}

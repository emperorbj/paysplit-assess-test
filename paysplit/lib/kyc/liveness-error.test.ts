import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api/errors"
import { toLivenessError } from "@/lib/kyc/liveness-error"

const failure = (code?: string, status = 422) =>
  new ApiError(status, "Backend message", code)

describe("toLivenessError", () => {
  it.each([
    ["FACE_MISMATCH", /didn’t match/],
    ["face-not-match", /didn’t match/],
    ["NO_FACE", /couldn’t see a face/],
    ["FACE_NOT_DETECTED", /couldn’t see a face/],
    ["NOT_LIVE", /live photo/],
    ["LIVENESS_FAILED", /live photo/],
  ])("gives guidance for %s", (code, expected) => {
    const result = toLivenessError(failure(code))
    expect(result.message).toMatch(expected)
    expect(result.code).toBe(code)
    expect(result.status).toBe(422)
  })

  it("keeps the backend message for an unknown code", () => {
    expect(toLivenessError(failure("SOMETHING_ELSE")).message).toBe(
      "Backend message"
    )
  })

  it("keeps the backend message when there is no code", () => {
    expect(toLivenessError(failure()).message).toBe("Backend message")
  })

  it("leaves other statuses alone", () => {
    expect(toLivenessError(failure("NO_FACE", 409)).message).toBe(
      "Backend message"
    )
  })
})

import { afterEach, describe, expect, it, vi } from "vitest"

import { createDojahProvider } from "../src/integrations/kyc/dojah.provider.js"

const SANDBOX = "https://sandbox.dojah.io"
const LIVE = "https://api.dojah.io"

/** Replies exactly as the Dojah API does (captured from the sandbox). */
function reply(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status }))
  )
}

const provider = (baseUrl: string, sandboxTrustChecks = true) =>
  createDojahProvider({ baseUrl, appId: "app", secretKey: "secret", sandboxTrustChecks })

const selfie = Buffer.alloc(10)
const faceWith = (liveness: unknown) => ({
  entity: { face: { detected: true, message: "Face detected" }, liveness },
})

afterEach(() => vi.unstubAllGlobals())

describe("Dojah liveness", () => {
  it("sends AppId and the raw secret key (no Bearer)", async () => {
    reply(faceWith({ spoof: false, confidence: 98 }))
    await provider(LIVE).checkLiveness(selfie)
    const [url, init] = vi.mocked(fetch).mock.calls[0]!
    expect(url).toBe(`${LIVE}/api/v1/ml/liveness`)
    expect(init?.headers).toMatchObject({ AppId: "app", Authorization: "secret" })
  })

  it("passes a live face on the live API", async () => {
    reply(faceWith({ spoof: false, confidence: 98 }))
    expect(await provider(LIVE).checkLiveness(selfie)).toMatchObject({
      passed: true,
      probability: 98,
    })
  })

  it("rejects a spoof on the live API", async () => {
    reply(faceWith({ spoof: true, confidence: 99.9 }))
    expect(await provider(LIVE).checkLiveness(selfie)).toMatchObject({
      passed: false,
      code: "LIVENESS_FAILED",
    })
  })

  it("ignores the sandbox's canned spoof verdict when a face is detected", async () => {
    reply(faceWith({ spoof: true, confidence: 99.9 }))
    expect((await provider(SANDBOX).checkLiveness(selfie)).passed).toBe(true)
    // ...unless that leniency is turned off.
    reply(faceWith({ spoof: true, confidence: 99.9 }))
    expect((await provider(SANDBOX, false).checkLiveness(selfie)).passed).toBe(false)
  })

  it("always requires a face, even in the sandbox", async () => {
    reply({ entity: { face: { detected: false }, liveness: { spoof: true } } })
    expect(await provider(SANDBOX).checkLiveness(selfie)).toMatchObject({
      passed: false,
      code: "NO_FACE_DETECTED",
    })
  })

  it("still understands the documented field names", async () => {
    reply({
      entity: {
        face: { face_detected: true },
        liveness: { liveness_check: true, liveness_probability: 97 },
      },
    })
    expect(await provider(LIVE).checkLiveness(selfie)).toMatchObject({ passed: true })
  })

  it("treats auth failures and outages as provider errors (503, no attempt used)", async () => {
    reply({ error: "Unauthorized" }, 401)
    await expect(provider(LIVE).checkLiveness(selfie)).rejects.toThrow(
      "verification service is unavailable"
    )
  })
})

describe("Dojah identity and documents", () => {
  it("reads BVN names and reports a wrong number", async () => {
    reply({ entity: { first_name: "John", last_name: "Doe", bvn: "22222222222" } })
    expect(
      await provider(SANDBOX).lookupBankIdentity("bvn", "22222222222")
    ).toMatchObject({
      found: true,
      firstName: "John",
    })
    reply({ error: "Wrong NIN Inputted" }, 400)
    expect(await provider(SANDBOX).lookupBankIdentity("nin", "00000000001")).toEqual({
      found: false,
      reason: "Wrong NIN Inputted",
    })
  })

  const cannedDocument = {
    entity: {
      status: { overall_status: 0, reason: "INVALID" },
      document_type: { document_name: "United States - Permanent Resident Card (2010)" },
    },
  }

  it("accepts a recognised document in the sandbox, not on the live API", async () => {
    const input = { documentType: "passport" as const, front: Buffer.alloc(10) }
    reply(cannedDocument)
    expect((await provider(SANDBOX).checkDocument(input)).valid).toBe(true)
    reply(cannedDocument)
    expect((await provider(LIVE).checkDocument(input)).valid).toBe(false)
  })
})

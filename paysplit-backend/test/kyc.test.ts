import request from "supertest"
import { describe, expect, it } from "vitest"

import { IMAGE, TINY_IMAGE, api, app, authed, completeKyc, signup } from "./helpers.js"

describe("kyc", () => {
  it("lists supported countries publicly", async () => {
    const res = await request(app).get(api("/kyc/countries")).expect(200)
    expect(res.body).toContainEqual(
      expect.objectContaining({ code: "NG", dialCode: "+234", methods: ["bvn", "nin"] })
    )
  })

  it("completes profile → BVN → selfie, reaches tier 2 and issues a salary account", async () => {
    const user = await signup()
    const as = authed(user.token)

    const profile = await as
      .put("/kyc/profile")
      .send({ countryCode: "NG", phoneNumber: "0803 123 4567" })
      .expect(200)
    expect(profile.body).toMatchObject({
      message: "Profile saved.",
      currentStep: "identity",
      steps: {
        profile: { completed: true, phoneNumber: "+2348031234567", currencyCode: "NGN" },
      },
    })

    const identity = await as
      .post("/kyc/identity/nigeria")
      .send({ method: "bvn", idNumber: "22222222222" })
      .expect(200)
    expect(identity.body.steps.identity).toMatchObject({
      status: "verified",
      method: "bvn",
      maskedIdNumber: "*******2222",
    })
    expect(JSON.stringify(identity.body)).not.toContain("22222222222")

    const liveness = await as
      .post("/kyc/liveness")
      .attach("selfie", IMAGE, "me.jpg")
      .expect(200)
    expect(liveness.body.kycStatus).toBe("verified")

    const account = await as.get("/salary-account").expect(200)
    expect(account.body).toMatchObject({
      status: "active",
      actionRequired: null,
      balance: 0,
    })
    expect(account.body.accountNumber).toMatch(/^\d{10}$/)
    expect(account.body.accounts).toHaveLength(1)

    const profileRes = await as.get("/users/me/profile").expect(200)
    expect(profileRes.body).toMatchObject({ tier: 2, namesLocked: true })
  })

  it("lets many test users verify with the same sandbox BVN and NIN", async () => {
    for (const [method, idNumber] of [
      ["bvn", "22222222222"],
      ["bvn", "22222222222"],
      ["nin", "70123456789"],
    ] as const) {
      const user = await signup({ firstName: "Different", lastName: "Person" })
      const as = authed(user.token)
      await as
        .put("/kyc/profile")
        .send({ countryCode: "NG", phoneNumber: "08031234567" })
        .expect(200)
      await as.post("/kyc/identity/nigeria").send({ method, idNumber }).expect(200)
    }
  })

  it("enforces step order", async () => {
    const user = await signup()
    const as = authed(user.token)
    const noProfile = await as
      .post("/kyc/identity/nigeria")
      .send({ method: "bvn", idNumber: "22222222222" })
      .expect(409)
    expect(noProfile.body.code).toBe("PROFILE_REQUIRED")

    await as
      .put("/kyc/profile")
      .send({ countryCode: "NG", phoneNumber: "08031234567" })
      .expect(200)
    const noIdentity = await as
      .post("/kyc/liveness")
      .attach("selfie", IMAGE, "me.jpg")
      .expect(409)
    expect(noIdentity.body.code).toBe("IDENTITY_REQUIRED")
  })

  it("counts failed attempts and locks the step after three", async () => {
    const user = await signup()
    const as = authed(user.token)
    await as
      .put("/kyc/profile")
      .send({ countryCode: "NG", phoneNumber: "08031234567" })
      .expect(200)

    for (const remaining of [2, 1, 0]) {
      const res = await as
        .post("/kyc/identity/nigeria")
        .send({ method: "nin", idNumber: "00000000000" })
        .expect(422)
      expect(res.body.code).toBe("IDENTITY_NOT_FOUND")
      expect(res.body.details.attemptsRemaining).toBe(remaining)
    }
    const locked = await as
      .post("/kyc/identity/nigeria")
      .send({ method: "bvn", idNumber: "22222222222" })
      .expect(429)
    expect(locked.body.code).toBe("KYC_ATTEMPTS_EXCEEDED")
    expect(locked.body.details.retryAvailableAt).toEqual(expect.any(String))

    const status = await as.get("/kyc/status").expect(200)
    expect(status.body.steps.identity).toMatchObject({
      status: "failed",
      attemptsRemaining: 0,
    })
  })

  it("maps a failed selfie to a code the frontend understands", async () => {
    const user = await signup()
    const as = authed(user.token)
    await as
      .put("/kyc/profile")
      .send({ countryCode: "NG", phoneNumber: "08031234567" })
      .expect(200)
    await as
      .post("/kyc/identity/nigeria")
      .send({ method: "bvn", idNumber: "22222222222" })
      .expect(200)
    const res = await as
      .post("/kyc/liveness")
      .attach("selfie", TINY_IMAGE, "me.jpg")
      .expect(422)
    expect(res.body.code).toBe("NO_FACE_DETECTED")
  })

  it("rejects non-image uploads", async () => {
    const user = await signup()
    const res = await authed(user.token)
      .post("/kyc/liveness")
      .attach("selfie", Buffer.from("hello"), {
        filename: "x.txt",
        contentType: "text/plain",
      })
      .expect(415)
    expect(res.body.code).toBe("UNSUPPORTED_FILE_TYPE")
  })

  it("international users pass with a document, then add a BVN to get an account", async () => {
    const user = await signup()
    const as = authed(user.token)
    await as
      .put("/kyc/profile")
      .send({ countryCode: "GH", phoneNumber: "0241234567" })
      .expect(200)
    await as
      .post("/kyc/identity/international")
      .field("documentType", "passport")
      .attach("front", IMAGE, "front.jpg")
      .expect(200)
    await as.post("/kyc/liveness").attach("selfie", IMAGE, "me.jpg").expect(200)

    const before = await as.get("/salary-account").expect(200)
    expect(before.body).toMatchObject({
      status: "not_issued",
      actionRequired: "add_bvn_or_nin",
    })

    const after = await as
      .post("/salary-account/identity")
      .send({ method: "nin", idNumber: "70123456789" })
      .expect(200)
    expect(after.body).toMatchObject({ status: "active", actionRequired: null })
  })

  it("locks names after KYC", async () => {
    const user = await signup()
    await completeKyc(user.token)
    const res = await authed(user.token)
      .patch("/users/me")
      .send({ firstName: "Changed" })
      .expect(409)
    expect(res.body.code).toBe("NAMES_LOCKED")
  })
})

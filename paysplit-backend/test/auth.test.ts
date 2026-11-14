import { randomUUID } from "node:crypto"

import request from "supertest"
import { describe, expect, it } from "vitest"

import { PASSWORD, api, app, authed, signup } from "./helpers.js"

describe("auth", () => {
  it("signs up with names, email and password in one step", async () => {
    const email = `New-${randomUUID()}@Example.com`
    const res = await request(app)
      .post(api("/auth/signup"))
      .send({
        firstName: "Ada",
        lastName: "Obi",
        email,
        password: PASSWORD,
        confirmPassword: PASSWORD,
      })
      .expect(201)

    expect(res.body).toMatchObject({
      tokenType: "Bearer",
      expiresIn: 86_400,
      user: {
        email: email.toLowerCase(),
        firstName: "Ada",
        kycStatus: "not_started",
        isEmailVerified: true,
      },
      onboarding: { emailVerified: true, passwordSet: true, nextStep: "kyc" },
    })
    expect(res.body.accessToken).toEqual(expect.any(String))
    expect(res.body.user).not.toHaveProperty("passwordHash")
  })

  it("rejects a duplicate email with 409 EMAIL_TAKEN", async () => {
    const user = await signup()
    const res = await request(app)
      .post(api("/auth/signup"))
      .send({
        firstName: "A",
        lastName: "B",
        email: user.email,
        password: PASSWORD,
        confirmPassword: PASSWORD,
      })
      .expect(409)
    expect(res.body).toEqual({
      statusCode: 409,
      message: "An account with this email already exists",
      error: "Conflict",
      code: "EMAIL_TAKEN",
    })
  })

  it("returns every validation problem as a message array", async () => {
    const res = await request(app)
      .post(api("/auth/signup"))
      .send({
        firstName: "",
        email: "not-an-email",
        password: "weak",
        confirmPassword: "nope",
      })
      .expect(400)
    expect(res.body.code).toBe("VALIDATION_ERROR")
    expect(Array.isArray(res.body.message)).toBe(true)
    expect(res.body.message.join(" ")).toMatch(/firstName/)
    expect(res.body.message.join(" ")).toMatch(/email/)
    expect(res.body.message.join(" ")).toMatch(/password/)
  })

  it("logs in, and rejects a wrong password without revealing which part was wrong", async () => {
    const user = await signup()
    await request(app)
      .post(api("/auth/login"))
      .send({ email: user.email, password: PASSWORD })
      .expect(200)
    const wrong = await request(app)
      .post(api("/auth/login"))
      .send({ email: user.email, password: "Wrong!Pass1" })
      .expect(401)
    const unknown = await request(app)
      .post(api("/auth/login"))
      .send({ email: "nobody@example.com", password: PASSWORD })
      .expect(401)
    expect(wrong.body.code).toBe("INVALID_CREDENTIALS")
    expect(unknown.body.message).toBe(wrong.body.message)
  })

  it("gives a 30-day token with rememberMe", async () => {
    const user = await signup()
    const res = await request(app)
      .post(api("/auth/login"))
      .send({ email: user.email, password: PASSWORD, rememberMe: true })
      .expect(200)
    expect(res.body.expiresIn).toBe(30 * 86_400)
  })

  it("requires a token for protected routes", async () => {
    const res = await request(app).get(api("/auth/me")).expect(401)
    expect(res.body).toMatchObject({ statusCode: 401, error: "Unauthorized" })
    await request(app)
      .get(api("/auth/me"))
      .set("Authorization", "Bearer nonsense")
      .expect(401)
  })

  it("logout revokes every existing token", async () => {
    const user = await signup()
    await authed(user.token).get("/auth/me").expect(200)
    await authed(user.token).post("/auth/logout").expect(200)
    const res = await authed(user.token).get("/auth/me").expect(401)
    expect(res.body.code).toBe("TOKEN_REVOKED")
  })

  it("changing the password issues a new token and signs out old sessions", async () => {
    const user = await signup()
    await authed(user.token)
      .post("/auth/password/change")
      .send({
        currentPassword: "Wrong!Pass1",
        newPassword: "N3w!Password",
        confirmPassword: "N3w!Password",
      })
      .expect(401)
      .expect((res) => expect(res.body.code).toBe("INVALID_PASSWORD"))

    const res = await authed(user.token)
      .post("/auth/password/change")
      .send({
        currentPassword: PASSWORD,
        newPassword: "N3w!Password",
        confirmPassword: "N3w!Password",
      })
      .expect(200)

    await authed(user.token).get("/auth/me").expect(401)
    await authed(res.body.accessToken).get("/auth/me").expect(200)
    await request(app)
      .post(api("/auth/login"))
      .send({ email: user.email, password: "N3w!Password" })
      .expect(200)
  })

  it("answers unknown routes with the standard error body", async () => {
    const res = await request(app).get(api("/nope")).expect(404)
    expect(res.body).toMatchObject({
      statusCode: 404,
      error: "Not Found",
      code: "ROUTE_NOT_FOUND",
    })
  })
})

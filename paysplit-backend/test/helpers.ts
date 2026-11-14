import { randomUUID } from "node:crypto"

import request from "supertest"

import { createApp } from "../src/app.js"

export const app = createApp()
export const api = (path: string) => `/api/v1${path}`

export const PASSWORD = "Str0ng!Pass"

/** Fake JPEG-ish bytes; the mock provider treats anything ≥ 1KB as a valid image. */
export const IMAGE = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff]),
  Buffer.alloc(2048, 7),
])
export const TINY_IMAGE = Buffer.from([0xff, 0xd8, 0xff, 0x00])

export type TestUser = { token: string; email: string; id: string }

export async function signup(overrides: Record<string, unknown> = {}): Promise<TestUser> {
  const email = `user-${randomUUID()}@example.com`
  const res = await request(app)
    .post(api("/auth/signup"))
    .send({
      firstName: "Ada",
      lastName: "Obi",
      email,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      ...overrides,
    })
  if (res.status !== 201)
    throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`)
  return { token: res.body.accessToken, email, id: res.body.user.id }
}

export const authed = (token: string) => ({
  get: (path: string) =>
    request(app).get(api(path)).set("Authorization", `Bearer ${token}`),
  post: (path: string) =>
    request(app).post(api(path)).set("Authorization", `Bearer ${token}`),
  put: (path: string) =>
    request(app).put(api(path)).set("Authorization", `Bearer ${token}`),
  patch: (path: string) =>
    request(app).patch(api(path)).set("Authorization", `Bearer ${token}`),
  delete: (path: string) =>
    request(app).delete(api(path)).set("Authorization", `Bearer ${token}`),
})

/** Profile → BVN (sandbox test number) → selfie. Leaves an active salary account. */
export async function completeKyc(token: string, bvn = "22222222222") {
  const as = authed(token)
  await as
    .put("/kyc/profile")
    .send({ countryCode: "NG", phoneNumber: "08031234567" })
    .expect(200)
  await as
    .post("/kyc/identity/nigeria")
    .send({ method: "bvn", idNumber: bvn })
    .expect(200)
  await as.post("/kyc/liveness").attach("selfie", IMAGE, "selfie.jpg").expect(200)
}

/** ₦500,000 salary paid on the 28th. */
export const SALARY = 50_000_000

export async function setIncome(token: string, monthlyAmount = SALARY) {
  await authed(token)
    .put("/setup/income")
    .send({ employerName: "Acme Ltd", monthlyAmount, paydayDay: 28 })
    .expect(200)
}

export async function createWallet(
  token: string,
  name: string,
  extra: Record<string, unknown> = {}
) {
  const res = await authed(token)
    .post("/wallets")
    .send({ name, categoryId: "savings", accentColor: "green", ...extra })
    .expect(201)
  return res.body as { id: string; balance: number }
}

export async function createRule(
  token: string,
  walletId: string,
  rule: {
    method: "fixed" | "percentage"
    value: number
    priority?: number
    name?: string
  }
) {
  return authed(token)
    .post("/split-rules")
    .send({
      name: rule.name ?? `Rule ${walletId.slice(0, 4)}`,
      priority: rule.priority ?? 1,
      destinationType: "wallet",
      walletId,
      method: rule.method,
      value: rule.value,
    })
}

/** A user with verified KYC, income set, and an active salary account. */
export async function readyUser() {
  const user = await signup()
  await completeKyc(user.token)
  await setIncome(user.token)
  return user
}

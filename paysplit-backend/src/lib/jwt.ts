import jwt from "jsonwebtoken"

import { env } from "../config/env.js"

const ISSUER = "paysplit-api"
const AUDIENCE = "paysplit-web"

export const SESSION_TTL_SECONDS = 24 * 60 * 60 // 24h
export const REMEMBER_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days

export type AccessTokenClaims = {
  /** user id */
  sub: string
  /** token version: bumped on logout / password change to revoke old tokens */
  tv: number
  /** "Remember for 30 days": keeps the same lifetime when the token is reissued */
  remember: boolean
}

export const ttlFor = (remember: boolean) =>
  remember ? REMEMBER_TTL_SECONDS : SESSION_TTL_SECONDS

/** Signs a token; its lifetime follows the `remember` choice. */
export function signAccessToken(claims: AccessTokenClaims) {
  const expiresIn = ttlFor(claims.remember)
  const accessToken = jwt.sign({ tv: claims.tv, rem: claims.remember }, env.JWT_SECRET, {
    subject: claims.sub,
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn,
    algorithm: "HS256",
  })
  return { accessToken, tokenType: "Bearer" as const, expiresIn }
}

/** Returns the claims, or null for any invalid/expired token. */
export function verifyAccessToken(token: string): AccessTokenClaims | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    })
    if (typeof payload === "string" || typeof payload.sub !== "string") return null
    if (typeof payload.tv !== "number") return null
    return { sub: payload.sub, tv: payload.tv, remember: payload.rem === true }
  } catch {
    return null
  }
}

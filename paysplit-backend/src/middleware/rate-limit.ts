import { rateLimit } from "express-rate-limit"

import { env } from "../config/env.js"
import { tooManyRequests } from "../lib/errors.js"

/** Limits per client IP; the 429 body uses the standard error format. */
function limiter(limit: number, windowMs = 60_000) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => env.isTest,
    handler: (_req, _res, next) =>
      next(tooManyRequests("Too many attempts, try again in a minute", "RATE_LIMITED")),
  })
}

export const apiLimiter = limiter(300)
export const signupLimiter = limiter(5)
export const loginLimiter = limiter(10)
export const sensitiveLimiter = limiter(10)

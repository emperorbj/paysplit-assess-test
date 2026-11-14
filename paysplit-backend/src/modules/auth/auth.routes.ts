import { Router } from "express"

import { mountRoutes, route } from "../../lib/http.js"
import {
  loginLimiter,
  sensitiveLimiter,
  signupLimiter,
} from "../../middleware/rate-limit.js"
import { changePasswordSchema, loginSchema, signupSchema } from "./auth.schemas.js"
import * as auth from "./auth.service.js"

const TAG = "Auth"

export const authRouter = Router()

mountRoutes(authRouter, "/auth", [
  route({
    method: "post",
    path: "/signup",
    tag: TAG,
    summary: "Create an account and sign in",
    description:
      "Names, email and password in one step (no email verification). Returns the same body as login. `rememberMe` gives a 30-day token, otherwise 24h.",
    auth: false,
    status: 201,
    body: signupSchema,
    errors: { 409: "EMAIL_TAKEN", 429: "RATE_LIMITED (5/min)" },
    middleware: [signupLimiter],
    handler: ({ body }) => auth.signup(body),
  }),
  route({
    method: "post",
    path: "/login",
    tag: TAG,
    summary: "Sign in with email and password",
    auth: false,
    body: loginSchema,
    errors: {
      401: "INVALID_CREDENTIALS",
      403: "ACCOUNT_DISABLED",
      429: "RATE_LIMITED (10/min)",
    },
    middleware: [loginLimiter],
    handler: ({ body }) => auth.login(body),
  }),
  route({
    method: "get",
    path: "/me",
    tag: TAG,
    summary: "Current user and onboarding progress",
    handler: ({ userId }) => auth.me(userId),
  }),
  route({
    method: "post",
    path: "/logout",
    tag: TAG,
    summary: "Sign out everywhere (revokes every issued token)",
    handler: ({ userId }) => auth.logout(userId),
  }),
  route({
    method: "post",
    path: "/password/change",
    tag: TAG,
    summary: "Change password; other sessions are signed out",
    description: "Returns a new access token that replaces the current one.",
    body: changePasswordSchema,
    errors: { 401: "INVALID_PASSWORD (wrong current password) or invalid token" },
    middleware: [sensitiveLimiter],
    handler: ({ userId, req, body }) =>
      auth.changePassword(userId, req.auth?.remember ?? false, body),
  }),
])

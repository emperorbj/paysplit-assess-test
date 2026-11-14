import type { RequestHandler } from "express"

import { unauthorized } from "../lib/errors.js"
import { verifyAccessToken } from "../lib/jwt.js"
import { prisma } from "../lib/prisma.js"

declare module "express-serve-static-core" {
  interface Request {
    auth?: { userId: string; remember: boolean }
  }
}

/**
 * Requires a valid Bearer token whose version still matches the user's
 * (logout and password change bump it, revoking every older token).
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization ?? ""
  const [scheme, token] = header.split(" ")
  if (scheme !== "Bearer" || !token) throw unauthorized()

  const claims = verifyAccessToken(token)
  if (!claims)
    throw unauthorized("Your session has expired. Please log in again.", "TOKEN_INVALID")

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { tokenVersion: true, isActive: true, deletedAt: true },
  })
  if (!user || user.deletedAt || !user.isActive || user.tokenVersion !== claims.tv)
    throw unauthorized("Your session has expired. Please log in again.", "TOKEN_REVOKED")

  req.auth = { userId: claims.sub, remember: claims.remember }
  next()
}

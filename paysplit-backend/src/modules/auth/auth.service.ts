import type { z } from "zod"

import { conflict, forbidden, unauthorized } from "../../lib/errors.js"
import { signAccessToken } from "../../lib/jwt.js"
import { DUMMY_HASH, hashPassword, verifyPassword } from "../../lib/password.js"
import { prisma } from "../../lib/prisma.js"
import { notify } from "../notifications/notifications.service.js"
import { getOnboarding } from "../onboarding/onboarding.service.js"
import { DEFAULT_PREFERENCES } from "../users/notification-preferences.js"
import { presentUser } from "../users/user.presenter.js"
import type { changePasswordSchema, loginSchema, signupSchema } from "./auth.schemas.js"

async function authResponse(user: Parameters<typeof presentUser>[0], remember: boolean) {
  const token = signAccessToken({ sub: user.id, tv: user.tokenVersion, remember })
  return {
    ...token,
    user: presentUser(user),
    onboarding: await getOnboarding(user.id),
  }
}

/** Creates the user with their (not yet issued) salary account. No email step. */
export async function signup(dto: z.output<typeof signupSchema>) {
  const existing = await prisma.user.findUnique({ where: { email: dto.email } })
  if (existing) throw conflict("An account with this email already exists", "EMAIL_TAKEN")

  const passwordHash = await hashPassword(dto.password)
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        lastLoginAt: new Date(),
        salaryAccount: { create: {} },
        kyc: { create: {} },
        notificationPreferences: { create: { preferences: DEFAULT_PREFERENCES } },
      },
    })
    await notify(
      created.id,
      {
        type: "welcome",
        title: "Welcome to PaySplit",
        body: "Complete KYC to get your salary account, then set up your first split.",
      },
      tx
    )
    return created
  })

  return authResponse(user, dto.rememberMe)
}

export async function login(dto: z.output<typeof loginSchema>) {
  const user = await prisma.user.findUnique({ where: { email: dto.email } })
  // Always run bcrypt so response time doesn't reveal whether the email exists.
  const valid = await verifyPassword(dto.password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !valid || user.deletedAt)
    throw unauthorized("Incorrect email or password", "INVALID_CREDENTIALS")
  if (!user.isActive)
    throw forbidden("This account has been deactivated", "ACCOUNT_DISABLED")

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })
  return authResponse(updated, dto.rememberMe)
}

export async function me(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  return { user: presentUser(user), onboarding: await getOnboarding(userId) }
}

/** Revokes every token issued so far for this user. */
export async function logout(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  })
  return { message: "You’ve been signed out." }
}

/**
 * Signs out every other session and returns a fresh token for this one.
 * 401 INVALID_PASSWORD when the current password is wrong.
 */
export async function changePassword(
  userId: string,
  remember: boolean,
  dto: z.output<typeof changePasswordSchema>
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  if (!(await verifyPassword(dto.currentPassword, user.passwordHash)))
    throw unauthorized("Your current password is incorrect", "INVALID_PASSWORD")

  const passwordHash = await hashPassword(dto.newPassword)
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.user.update({
      where: { id: userId },
      data: { passwordHash, passwordSetAt: new Date(), tokenVersion: { increment: 1 } },
    })
    await notify(
      userId,
      {
        type: "password_changed",
        title: "Password changed",
        body: "Your password was changed and your other sessions were signed out.",
      },
      tx
    )
    return row
  })

  const { accessToken, expiresIn } = signAccessToken({
    sub: userId,
    tv: updated.tokenVersion,
    remember,
  })
  return { message: "Password updated.", accessToken, expiresIn }
}

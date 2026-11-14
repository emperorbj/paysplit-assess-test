import { conflict } from "../../lib/errors.js"
import { prisma } from "../../lib/prisma.js"
import { deleteObject, publicUrl, uploadPublicImage } from "../../lib/storage.js"
import { getOnboarding } from "../onboarding/onboarding.service.js"
import { presentSalaryAccount } from "../salary-account/salary-account.presenter.js"
import {
  normalizePreferences,
  presentPreferences,
  type Channel,
  type Topic,
} from "./notification-preferences.js"
import { presentIncome, presentUser, tierFor } from "./user.presenter.js"

export async function getProfile(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { salaryAccount: true, income: true, notificationPreferences: true },
  })
  return {
    user: presentUser(user),
    /** Short, shareable account id: "PS-" + first 8 of the uuid. */
    accountId: `PS-${user.id.slice(0, 8).toUpperCase()}`,
    memberSince: user.createdAt.toISOString(),
    tier: tierFor(user),
    namesLocked: user.kycStatus === "verified",
    salaryAccount: presentSalaryAccount(user.salaryAccount, user),
    income: presentIncome(user.income),
    security: { passwordLastUpdated: user.passwordSetAt.toISOString() },
    notificationPreferences: presentPreferences(
      normalizePreferences(user.notificationPreferences?.preferences)
    ),
    onboarding: await getOnboarding(userId),
  }
}

export async function updateMe(
  userId: string,
  dto: {
    firstName?: string | undefined
    lastName?: string | undefined
    phoneNumber?: string | undefined
  }
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const renaming =
    (dto.firstName !== undefined && dto.firstName !== user.firstName) ||
    (dto.lastName !== undefined && dto.lastName !== user.lastName)
  if (renaming && user.kycStatus === "verified")
    throw conflict("Your name can't change after identity verification", "NAMES_LOCKED")

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
      ...(dto.phoneNumber !== undefined ? { phoneNumber: dto.phoneNumber } : {}),
    },
  })
  return getProfile(userId)
}

export async function getNotificationPreferences(userId: string) {
  const stored = await prisma.notificationPreference.findUnique({ where: { userId } })
  return presentPreferences(normalizePreferences(stored?.preferences))
}

/** Partial update: only the channels/topics sent are changed. */
export async function updateNotificationPreferences(
  userId: string,
  patch: Partial<Record<Channel, Partial<Record<Topic, boolean>>>>
) {
  const stored = await prisma.notificationPreference.findUnique({ where: { userId } })
  const preferences = normalizePreferences(stored?.preferences)
  for (const [channel, topics] of Object.entries(patch) as [
    Channel,
    Partial<Record<Topic, boolean>>,
  ][]) {
    for (const [topic, value] of Object.entries(topics ?? {}) as [Topic, boolean][]) {
      preferences[channel][topic] = value
    }
  }
  await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, preferences },
    update: { preferences },
  })
  return presentPreferences(preferences)
}

/** Stores the image under a new key, then removes the old one. */
export async function uploadProfileImage(
  userId: string,
  file: { buffer: Buffer; mimetype: string }
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const key = await uploadPublicImage(`avatars/${userId}`, file.buffer, file.mimetype)
  await prisma.user.update({ where: { id: userId }, data: { profileImageKey: key } })
  if (user.profileImageKey) await deleteObject(user.profileImageKey)
  return { message: "Profile photo updated.", profileImageUrl: publicUrl(key) }
}

export async function removeProfileImage(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  if (user.profileImageKey) {
    await prisma.user.update({ where: { id: userId }, data: { profileImageKey: null } })
    await deleteObject(user.profileImageKey)
  }
  return { message: "Profile photo removed.", profileImageUrl: null }
}

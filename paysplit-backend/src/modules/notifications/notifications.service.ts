import type { Prisma } from "../../generated/prisma/client.js"
import { notFound } from "../../lib/errors.js"
import { paginate, skipTake, type PageQuery } from "../../lib/pagination.js"
import { prisma, type Db } from "../../lib/prisma.js"
import { normalizePreferences, type Topic } from "../users/notification-preferences.js"

/** In-app notification types and the preference topic each one belongs to. */
const TOPIC_BY_TYPE = {
  welcome: "accountUpdates",
  kyc_verified: "accountUpdates",
  kyc_failed: "accountUpdates",
  salary_account_issued: "accountUpdates",
  salary_received: "salaryReceived",
  split_completed: "splitCompleted",
  wallet_moved: "transferUpdates",
  password_changed: null, // security: always delivered
} satisfies Record<string, Topic | null>

export type NotificationType = keyof typeof TOPIC_BY_TYPE

type NewNotification = {
  type: NotificationType
  title: string
  body: string
  data?: Prisma.InputJsonObject
}

/**
 * Creates an in-app notification unless the user turned that topic off for
 * the in-app ("push") channel. Pass the transaction client to keep it atomic
 * with the event that caused it.
 */
export async function notify(
  userId: string,
  notification: NewNotification,
  db: Db = prisma
) {
  const topic = TOPIC_BY_TYPE[notification.type]
  if (topic) {
    const stored = await db.notificationPreference.findUnique({ where: { userId } })
    if (!normalizePreferences(stored?.preferences).push[topic]) return null
  }
  return db.notification.create({
    data: {
      userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      ...(notification.data ? { data: notification.data } : {}),
    },
  })
}

type NotificationRow = Awaited<ReturnType<typeof prisma.notification.findFirstOrThrow>>

export function presentNotification(row: NotificationRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: (row.data as Record<string, unknown> | null) ?? null,
    read: row.readAt !== null,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

export const unreadCount = (userId: string) =>
  prisma.notification.count({ where: { userId, readAt: null } })

export async function listNotifications(
  userId: string,
  query: PageQuery & { unreadOnly?: boolean | undefined }
) {
  const where = { userId, ...(query.unreadOnly ? { readAt: null } : {}) }
  const [rows, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...skipTake(query),
    }),
    prisma.notification.count({ where }),
    unreadCount(userId),
  ])
  return { ...paginate(rows.map(presentNotification), total, query), unreadCount: unread }
}

export async function markRead(userId: string, id: string) {
  const existing = await prisma.notification.findFirst({ where: { id, userId } })
  if (!existing) throw notFound("Notification not found", "NOTIFICATION_NOT_FOUND")
  const row = existing.readAt
    ? existing
    : await prisma.notification.update({ where: { id }, data: { readAt: new Date() } })
  return presentNotification(row)
}

export async function markAllRead(userId: string) {
  const { count } = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })
  return { updated: count }
}

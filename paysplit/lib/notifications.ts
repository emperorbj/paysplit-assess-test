import type { Notification } from "@/lib/dashboard"
import type { ApiNotification } from "@/types/api/notifications"

const HREF_BY_TYPE: Record<string, string> = {
  salary_received: "/transactions",
  split_completed: "/split-rules",
  setup_completed: "/split-rules",
  salary_account_issued: "/profile",
}

export function notificationHref(notification: Pick<ApiNotification, "type">) {
  return HREF_BY_TYPE[notification.type] ?? "/dashboard"
}

/** Unread items for the rotating cards in the dashboard hero. */
export function toHeroNotifications(
  notifications: ApiNotification[]
): Notification[] {
  return notifications
    .filter((n) => !n.read)
    .slice(0, 3)
    .map((n) => ({ id: n.id, message: n.body, href: notificationHref(n) }))
}

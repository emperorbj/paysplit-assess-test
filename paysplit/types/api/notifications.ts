import type { Paginated } from "@/types/api/common"

export type ApiNotification = {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, unknown> | null
  read: boolean
  readAt: string | null
  createdAt: string
}

export type NotificationsResponse = Paginated<ApiNotification> & {
  unreadCount: number
}

export type NotificationsParams = {
  page?: number
  limit?: number
  unreadOnly?: boolean
}

import { apiClient } from "@/lib/api/client"
import type {
  ApiNotification,
  NotificationsParams,
  NotificationsResponse,
} from "@/types/api/notifications"

export const notificationsService = {
  list: (params: NotificationsParams) =>
    apiClient
      .get<NotificationsResponse>("/notifications", { params })
      .then((r) => r.data),

  markRead: (id: string) =>
    apiClient
      .post<ApiNotification>(`/notifications/${id}/read`)
      .then((r) => r.data),

  markAllRead: () =>
    apiClient
      .post<{ updated: number }>("/notifications/read-all")
      .then((r) => r.data),
}

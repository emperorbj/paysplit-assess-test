"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAccessToken } from "@/hooks/auth/use-auth"
import { toastError } from "@/lib/api/toast"
import { queryKeys } from "@/lib/query-keys"
import { notificationsService } from "@/services/notifications.service"
import type { NotificationsParams } from "@/types/api/notifications"

const DEFAULT_PARAMS: NotificationsParams = { limit: 10 }

export function useNotifications(params = DEFAULT_PARAMS) {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => notificationsService.list(params),
    enabled: !!token,
    refetchInterval: 60_000,
  })
}

// Reading a notification is ambient, so only a failure shows a toast.
function useNotificationMutation<T>(
  mutationFn: (input: T) => Promise<unknown>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
    onError: (error) => toastError(error),
  })
}

export function useMarkNotificationRead() {
  return useNotificationMutation(notificationsService.markRead)
}

export function useMarkAllNotificationsRead() {
  return useNotificationMutation<void>(notificationsService.markAllRead)
}

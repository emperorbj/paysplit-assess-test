"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAccessToken } from "@/hooks/auth/use-auth"
import { toastError, toastSuccess, type ToastOptions } from "@/lib/api/toast"
import { queryKeys } from "@/lib/query-keys"
import { usersService } from "@/services/users.service"
import type { MeResponse } from "@/types/api/auth"
import type {
  NotificationPreferences,
  Profile,
  UpdateMeDto,
  UpdateNotificationPreferencesDto,
} from "@/types/api/users"

export function useProfile() {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.users.profile(),
    queryFn: usersService.profile,
    enabled: !!token,
  })
}

/** Keep /auth/me (header, greeting) in step with profile changes. */
function useSyncMe() {
  const queryClient = useQueryClient()
  return (profile: Pick<Profile, "user" | "onboarding">) => {
    queryClient.setQueryData<MeResponse>(queryKeys.auth.me(), {
      user: profile.user,
      onboarding: profile.onboarding,
    })
  }
}

export function useUpdateMe(options?: ToastOptions) {
  const queryClient = useQueryClient()
  const syncMe = useSyncMe()
  return useMutation({
    mutationFn: (dto: UpdateMeDto) => usersService.updateMe(dto),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.users.profile(), profile)
      syncMe(profile)
      toastSuccess(undefined, "Personal details saved.", options)
    },
    onError: (error) => toastError(error, options),
  })
}

export function useNotificationPreferences() {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.users.notificationPreferences(),
    queryFn: usersService.notificationPreferences,
    enabled: !!token,
  })
}

/**
 * Toggles apply optimistically (switches feel instant) and roll back with an
 * error toast if the save fails. Success is silent: the switch is the feedback.
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()
  const key = queryKeys.users.notificationPreferences()
  return useMutation({
    mutationFn: (dto: UpdateNotificationPreferencesDto) =>
      usersService.updateNotificationPreferences(dto),
    onMutate: async (dto) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<NotificationPreferences>(key)
      if (previous) {
        const preferences = { ...previous.preferences }
        for (const [channel, topics] of Object.entries(dto)) {
          const c = channel as keyof typeof preferences
          preferences[c] = { ...preferences[c], ...topics }
        }
        queryClient.setQueryData(key, { ...previous, preferences })
      }
      return { previous }
    },
    onError: (error, _dto, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      toastError(error)
    },
    onSuccess: (data) => queryClient.setQueryData(key, data),
  })
}

export function useUploadProfileImage(options?: ToastOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (image: File) => usersService.uploadProfileImage(image),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.users.profile() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() }),
      ])
      toastSuccess(data.message, "Profile picture updated.", options)
    },
    onError: (error) => toastError(error, options),
  })
}

export function useRemoveProfileImage(options?: ToastOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => usersService.removeProfileImage(),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.users.profile() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() }),
      ])
      toastSuccess(data.message, "Profile picture removed.", options)
    },
    onError: (error) => toastError(error, options),
  })
}

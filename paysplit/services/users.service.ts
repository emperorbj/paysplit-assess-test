import { apiClient } from "@/lib/api/client"
import type {
  NotificationPreferences,
  Profile,
  ProfileImageResponse,
  UpdateMeDto,
  UpdateNotificationPreferencesDto,
} from "@/types/api/users"

export const usersService = {
  profile: () =>
    apiClient.get<Profile>("/users/me/profile").then((r) => r.data),

  /** Returns the full profile again. */
  updateMe: (dto: UpdateMeDto) =>
    apiClient.patch<Profile>("/users/me", dto).then((r) => r.data),

  notificationPreferences: () =>
    apiClient
      .get<NotificationPreferences>("/users/me/notification-preferences")
      .then((r) => r.data),

  /** Partial: send only the channels/topics that changed. */
  updateNotificationPreferences: (dto: UpdateNotificationPreferencesDto) =>
    apiClient
      .put<NotificationPreferences>("/users/me/notification-preferences", dto)
      .then((r) => r.data),

  uploadProfileImage: (image: File) => {
    const form = new FormData()
    form.append("image", image)
    return apiClient
      .put<ProfileImageResponse>("/users/me/profile-image", form)
      .then((r) => r.data)
  },

  removeProfileImage: () =>
    apiClient
      .delete<ProfileImageResponse>("/users/me/profile-image")
      .then((r) => r.data),
}

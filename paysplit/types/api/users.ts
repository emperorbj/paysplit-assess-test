import type { Onboarding, User } from "@/types/api/auth"

export type NotificationChannel = "push" | "sms" | "email"
export type NotificationTopic =
  "salaryReceived" | "splitCompleted" | "transferUpdates" | "accountUpdates"

export type ChannelPreferences = Record<NotificationTopic, boolean>

export type NotificationPreferences = {
  preferences: Record<NotificationChannel, ChannelPreferences>
  /** Human labels for each topic */
  topics: Record<NotificationTopic, string>
  /** Channels actually delivered today (others are stored for later) */
  deliveredChannels: NotificationChannel[]
}

export type UpdateNotificationPreferencesDto = Partial<
  Record<NotificationChannel, Partial<ChannelPreferences>>
>

export type SalaryAccount = {
  status: "not_issued" | "pending" | "active" | (string & {})
  /** kobo */
  balance: number
  currency: string
  accountName: string
  accountNumber: string | null
  maskedAccountNumber: string | null
  bankName: string | null
}

export type Income = {
  employerName: string
  /** kobo */
  monthlyAmount: number
  currency: string
  paydayDay: number
  paydayLabel: string
  nextPayday: string
  updatedAt: string
}

export type Profile = {
  user: User
  accountId: string
  memberSince: string
  tier: number
  /** First/last name can't change after KYC approval */
  namesLocked: boolean
  salaryAccount: SalaryAccount
  income: Income | null
  security: { passwordLastUpdated: string | null }
  notificationPreferences: NotificationPreferences
  onboarding: Onboarding
}

export type UpdateMeDto = {
  firstName?: string
  lastName?: string
  /** International format, e.g. +2348031234567 */
  phoneNumber?: string
}

export type ProfileImageResponse = {
  message: string
  profileImageUrl: string | null
}

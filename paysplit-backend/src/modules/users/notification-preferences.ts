export const CHANNELS = ["push", "sms", "email"] as const
export const TOPICS = [
  "salaryReceived",
  "splitCompleted",
  "transferUpdates",
  "accountUpdates",
] as const

export type Channel = (typeof CHANNELS)[number]
export type Topic = (typeof TOPICS)[number]
export type Preferences = Record<Channel, Record<Topic, boolean>>

export const TOPIC_LABELS: Record<Topic, string> = {
  salaryReceived: "Salary received",
  splitCompleted: "Split completed",
  transferUpdates: "Transfers and wallet moves",
  accountUpdates: "Account and security",
}

/** Only in-app ("push") notifications are delivered today; the rest are stored. */
export const DELIVERED_CHANNELS: Channel[] = ["push"]

const all = (value: boolean) =>
  Object.fromEntries(TOPICS.map((topic) => [topic, value])) as Record<Topic, boolean>

export const DEFAULT_PREFERENCES: Preferences = {
  push: all(true),
  email: all(true),
  sms: all(false),
}

/** Merge stored JSON over the defaults, ignoring unknown keys. */
export function normalizePreferences(stored: unknown): Preferences {
  const source = (stored ?? {}) as Partial<
    Record<string, Partial<Record<string, unknown>>>
  >
  const result = structuredClone(DEFAULT_PREFERENCES)
  for (const channel of CHANNELS) {
    for (const topic of TOPICS) {
      const value = source[channel]?.[topic]
      if (typeof value === "boolean") result[channel][topic] = value
    }
  }
  return result
}

export function presentPreferences(preferences: Preferences) {
  return {
    preferences,
    topics: TOPIC_LABELS,
    deliveredChannels: DELIVERED_CHANNELS,
  }
}

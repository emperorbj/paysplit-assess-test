import { describe, expect, it } from "vitest"

import { notificationHref, toHeroNotifications } from "@/lib/notifications"
import type { ApiNotification } from "@/types/api/notifications"

const notification = (
  id: string,
  overrides: Partial<ApiNotification> = {}
): ApiNotification => ({
  id,
  type: "salary_received",
  title: "Money received",
  body: `Body ${id}`,
  data: null,
  read: false,
  readAt: null,
  createdAt: "2026-11-09T10:48:57.023Z",
  ...overrides,
})

describe("notificationHref", () => {
  it("links known types to their screen", () => {
    expect(notificationHref({ type: "salary_received" })).toBe("/transactions")
    expect(notificationHref({ type: "split_completed" })).toBe("/split-rules")
  })

  it("falls back to the dashboard for new types", () => {
    expect(notificationHref({ type: "brand_new" })).toBe("/dashboard")
  })
})

describe("toHeroNotifications", () => {
  it("keeps the first three unread and uses the body as the message", () => {
    const result = toHeroNotifications([
      notification("a", { read: true }),
      notification("b"),
      notification("c"),
      notification("d"),
      notification("e"),
    ])
    expect(result.map((n) => n.id)).toEqual(["b", "c", "d"])
    expect(result[0]).toEqual({
      id: "b",
      message: "Body b",
      href: "/transactions",
    })
  })
})

"use client"

import * as React from "react"
import Link from "next/link"
import { Popover } from "@base-ui/react/popover"
import { BellIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/notifications/use-notifications"
import { notificationHref } from "@/lib/notifications"
import { cn } from "@/lib/utils"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/** Header bell with an unread badge and the latest notifications. */
export function NotificationsMenu() {
  const [open, setOpen] = React.useState(false)
  const notifications = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const unread = notifications.data?.unreadCount ?? 0
  const items = notifications.data?.data ?? []

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={
          unread ? `Notifications, ${unread} unread` : "Notifications"
        }
        className="relative grid size-10 place-items-center rounded-[10px] border border-line text-ink transition hover:bg-muted data-popup-open:bg-muted"
      >
        <BellIcon className="size-5" strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#D92D20] px-1 text-[11px] font-medium text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="end"
          sideOffset={8}
          className="z-50"
        >
          <Popover.Popup
            aria-label="Notifications"
            className="flex max-h-[min(480px,calc(100svh-6rem))] w-[min(380px,calc(100vw-2rem))] origin-(--transform-origin) flex-col overflow-hidden rounded-2xl bg-white text-ink shadow-[0_20px_40px_-12px_rgba(16,24,40,0.22)] transition-[opacity,scale] duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0"
          >
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
              <h2 className="font-semibold">Notifications</h2>
              {unread > 0 && (
                <button
                  type="button"
                  disabled={markAllRead.isPending}
                  onClick={() => markAllRead.mutate()}
                  className="text-sm text-brand hover:text-brand/80 disabled:opacity-50"
                >
                  Mark all as read
                </button>
              )}
            </header>

            <div className="overflow-y-auto">
              {notifications.isPending ? (
                <div aria-label="Loading notifications">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="space-y-2 px-5 py-3.5">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))}
                </div>
              ) : notifications.isError ? (
                <div role="alert" className="px-6 py-10 text-center">
                  <p className="text-sm text-[#475467]">
                    Couldn’t load your notifications.
                  </p>
                  <Button
                    size="lg"
                    className="mt-3 h-9 px-3 text-sm"
                    onClick={() => void notifications.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-[#475467]">
                  You’re all caught up.
                </p>
              ) : (
                <ul>
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="border-b border-line last:border-0"
                    >
                      <Link
                        href={notificationHref(item)}
                        onClick={() => {
                          setOpen(false)
                          if (!item.read) markRead.mutate(item.id)
                        }}
                        className={cn(
                          "block px-5 py-3.5 transition hover:bg-muted",
                          !item.read && "bg-brand-50"
                        )}
                      >
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="mt-0.5 text-sm text-[#475467]">
                          {item.body}
                        </p>
                        <p className="mt-1 text-xs text-[#667085]">
                          {formatDate(item.createdAt)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

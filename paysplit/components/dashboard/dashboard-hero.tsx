"use client"

import * as React from "react"
import Link from "next/link"
import { BellIcon, ChevronRightIcon, PlusIcon } from "lucide-react"

import { ExportIcon } from "@/components/icons/vuesax"
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/loading-button"
import { useExportTransactions } from "@/hooks/transactions/use-transactions"
import type { Notification } from "@/lib/dashboard"
import { ordinal } from "@/lib/finance"
import { cn } from "@/lib/utils"

// The greeting depends on the visitor's local clock, so it's read on the client
// only (the server renders a neutral fallback, avoiding hydration mismatches).
const subscribeToMinute = (onChange: () => void) => {
  const id = setInterval(onChange, 60_000)
  return () => clearInterval(id)
}
const currentMinute = () => Math.floor(Date.now() / 60_000)

function useLocalNow() {
  const minute = React.useSyncExternalStore(
    subscribeToMinute,
    currentMinute,
    () => null
  )
  return minute === null ? null : new Date(minute * 60_000)
}

function greetingFor(date: Date) {
  const hour = date.getHours()
  if (hour < 12) return "Good Morning"
  if (hour < 17) return "Good Afternoon"
  return "Good Evening"
}

export function DashboardHero({
  firstName,
  notifications,
  hasActivity,
}: {
  firstName: string
  notifications: Notification[]
  /** Disables Export until there's something in the ledger. */
  hasActivity: boolean
}) {
  const now = useLocalNow()
  const exportCsv = useExportTransactions()

  return (
    <section
      className="relative isolate overflow-hidden bg-[#0B0B0B] text-white md:h-[340px]"
      style={{
        backgroundImage: [
          "radial-gradient(55% 120% at 0% 100%, rgba(20,98,156,0.5), transparent 65%)",
          "linear-gradient(90deg, rgba(0,0,0,0.6), rgba(30,30,30,0.4))",
        ].join(","),
      }}
    >
      {notifications.length > 0 && (
        <NotificationStack
          notifications={notifications}
          className="absolute top-[98px] left-[38.75%] hidden w-[329px] lg:block"
        />
      )}

      <div className="relative flex h-full flex-col justify-end gap-6 px-4 pt-14 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-9">
        <div>
          <h1 className="text-3xl tracking-tight sm:text-[40px]">
            {now ? greetingFor(now) : "Welcome back"}, {firstName}!
          </h1>
          <p className="mt-2 min-h-6 text-base text-white/70">
            {now && (
              <>
                <span className="font-semibold text-white">
                  {now.toLocaleDateString("en-GB", { weekday: "long" })},
                </span>{" "}
                {now.toLocaleDateString("en-GB", { month: "long" })}{" "}
                {ordinal(now.getDate())}, {now.getFullYear()}
              </>
            )}
          </p>
        </div>

        <div className="flex gap-3">
          <LoadingButton
            size="xl"
            variant="outline"
            loading={exportCsv.isPending}
            onClick={() => exportCsv.mutate({})}
            disabled={!hasActivity}
            className="border-white/30 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white disabled:opacity-40 dark:bg-white/5"
          >
            Export
            <ExportIcon className="size-4" />
          </LoadingButton>
          <Button
            size="xl"
            className="px-5"
            nativeButton={false}
            render={<Link href="/destinations" />}
          >
            <PlusIcon className="size-4" strokeWidth={2} />
            Create Wallet
          </Button>
        </div>
      </div>
    </section>
  )
}

const ROTATE_MS = 6000

function NotificationStack({
  notifications,
  className,
}: {
  notifications: Notification[]
  className?: string
}) {
  const [active, setActive] = React.useState(0)
  const [paused, setPaused] = React.useState(false)
  const count = notifications.length

  React.useEffect(() => {
    if (paused || count < 2) return
    const id = setInterval(() => setActive((i) => (i + 1) % count), ROTATE_MS)
    return () => clearInterval(id)
  }, [paused, count])

  return (
    <div
      className={cn("h-[280px]", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Notifications"
    >
      {notifications.map((notification, index) => {
        // 0 = front card, 1/2 = cards fanned out behind it.
        const depth = (index - active + count) % count
        return (
          <article
            key={notification.id}
            aria-hidden={depth !== 0}
            aria-roledescription="slide"
            className={cn(
              "absolute inset-0 flex flex-col rounded-[28px] border border-white/5 p-5 shadow-2xl transition-[transform,opacity] duration-500 ease-out",
              depth > 2 && "opacity-0"
            )}
            style={{
              zIndex: count - depth,
              transform: [
                `translate(${[0, 46, 84][depth] ?? 84}px, ${[0, 64, 148][depth] ?? 148}px)`,
                `rotate(${[0, -3, -6][depth] ?? -6}deg)`,
              ].join(" "),
              opacity: [1, 0.45, 0.2][depth] ?? 0,
              background:
                "radial-gradient(90% 60% at 30% 100%, rgba(18,72,120,0.55), transparent 70%), linear-gradient(165deg, #10263A 0%, #060B12 55%, #000 100%)",
            }}
          >
            <header className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <BellIcon className="size-4" strokeWidth={1.75} />
                Notification
              </span>
              <Link
                href={notification.href}
                tabIndex={depth === 0 ? undefined : -1}
                className="flex items-center gap-1 text-brand hover:text-brand/80"
              >
                View
                <ChevronRightIcon className="size-4" />
              </Link>
            </header>
            <p
              className={cn(
                "mt-10 text-lg leading-snug transition-opacity duration-500",
                depth !== 0 && "opacity-0"
              )}
            >
              {notification.message}
            </p>
          </article>
        )
      })}

      {count > 1 && (
        <div className="absolute top-[218px] left-1/2 z-20 flex -translate-x-1/2 gap-1">
          {notifications.map((notification, index) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show notification ${index + 1} of ${count}`}
              aria-current={index === active}
              className={cn(
                "h-1 rounded-full transition-all",
                index === active
                  ? "w-7 bg-brand"
                  : "w-1.5 bg-white/25 hover:bg-white/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

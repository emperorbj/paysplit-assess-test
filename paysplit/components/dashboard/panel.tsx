import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Grey framed panel with a title row, used across the dashboard. */
export function Panel({
  title,
  action,
  className,
  children,
}: {
  title: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-[20px] border border-line bg-[#F8F8F8]",
        className
      )}
    >
      <header className="flex min-h-[60px] flex-wrap items-center justify-between gap-3 px-6 py-3">
        <h2 className="text-lg text-ink">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  )
}

/** "See rules ›" style link used in panel headers. */
export function PanelLink({
  href,
  label,
  showLabel = true,
}: {
  href: string
  label: string
  showLabel?: boolean
}) {
  return (
    <Link
      href={href}
      aria-label={showLabel ? undefined : label}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 text-base whitespace-nowrap transition",
        showLabel
          ? "text-brand hover:text-brand/80"
          : "text-ink hover:text-brand"
      )}
    >
      {showLabel && label}
      <ChevronRightIcon className="size-5" strokeWidth={1.75} />
    </Link>
  )
}

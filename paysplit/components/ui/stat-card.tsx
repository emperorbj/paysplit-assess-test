import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Light-blue gradient metric card. Pass `href` to make it a link with a chevron. */
export function StatCard({
  title,
  href,
  className,
  children,
}: {
  title: string
  href?: string
  className?: string
  children: React.ReactNode
}) {
  const classes = cn(
    "group flex min-h-[160px] flex-col rounded-[20px] bg-linear-to-b from-brand-50 to-white/0 p-5",
    href && "transition hover:to-brand-50/40",
    className
  )
  const heading = (
    <span className="flex items-center justify-between text-base text-ink">
      {title}
      {href && (
        <ChevronRightIcon
          className="size-5 transition group-hover:translate-x-0.5"
          strokeWidth={1.75}
        />
      )}
    </span>
  )

  return href ? (
    <Link href={href} className={classes}>
      {heading}
      {children}
    </Link>
  ) : (
    <div className={classes}>
      {heading}
      {children}
    </div>
  )
}

export function StatValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-auto pt-6 text-[28px] font-medium tracking-tight text-ink sm:text-[32px]">
      {children}
    </span>
  )
}

export function StatFooter({
  left,
  right,
}: {
  left: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <span className="mt-1 flex items-center justify-between gap-2 text-sm text-[#667085]">
      {left}
      {right}
    </span>
  )
}

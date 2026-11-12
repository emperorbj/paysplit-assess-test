import Link from "next/link"

import { cn } from "@/lib/utils"

type Crumb = { label: string; href?: string }

export function PageHeading({
  title,
  breadcrumbs,
  actions,
  className,
}: {
  title: string
  breadcrumbs?: Crumb[]
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-end justify-between gap-4 px-4 py-5 sm:px-9",
        className
      )}
    >
      <div>
        <h1 className="text-2xl text-ink">{title}</h1>
        {breadcrumbs && (
          <nav aria-label="Breadcrumb" className="mt-2">
            <ol className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, i) => (
                <li key={crumb.label} className="flex items-center gap-2">
                  {i > 0 && <span className="text-[#C4C4C4]">/</span>}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="text-brand hover:underline"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-[#6B6B6B]">
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>
      {actions}
    </div>
  )
}

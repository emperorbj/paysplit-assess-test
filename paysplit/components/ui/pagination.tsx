import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** 1-based page numbers with ellipses, e.g. [1, 2, 3, 4, 5, "…", 10]. */
function pageItems(page: number, pageCount: number): Array<number | "…"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  if (page <= 4) return [1, 2, 3, 4, 5, "…", pageCount]
  if (page >= pageCount - 3) {
    return [1, "…", ...Array.from({ length: 5 }, (_, i) => pageCount - 4 + i)]
  }
  return [1, "…", page - 1, page, page + 1, "…", pageCount]
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
}: {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  className?: string
}) {
  if (pageCount <= 1) return null

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center gap-1", className)}
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className="grid size-8 place-items-center rounded-full text-ink transition hover:bg-muted disabled:text-[#C4C4C4] disabled:hover:bg-transparent"
      >
        <ChevronLeftIcon className="size-4" />
      </button>
      {pageItems(page, pageCount).map((item, index) =>
        item === "…" ? (
          <span
            key={`gap-${index}`}
            className="w-8 text-center text-sm text-ink"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              "grid size-8 place-items-center rounded-full text-sm transition",
              item === page ? "bg-ink text-white" : "text-ink hover:bg-muted"
            )}
          >
            {item}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === pageCount}
        aria-label="Next page"
        className="grid size-8 place-items-center rounded-full bg-[#F2F2F2] text-ink transition hover:bg-[#E4E4E4] disabled:bg-transparent disabled:text-[#C4C4C4]"
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </nav>
  )
}

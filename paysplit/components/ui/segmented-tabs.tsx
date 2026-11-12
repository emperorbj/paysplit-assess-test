"use client"

import { cn } from "@/lib/utils"

/** Pill-style toggle between a few options (e.g. BVN | NIN). */
export function SegmentedTabs<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = "gray",
  className,
}: {
  label: string
  options: ReadonlyArray<{ id: T; label: string }>
  value: T
  onChange: (value: T) => void
  /** `gray`: darker pill on grey (forms). `white`: white pill on grey (filters). `brand`: blue text on light blue (settings). */
  tone?: "gray" | "white" | "brand"
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "inline-flex rounded-lg bg-[#F5F5F5] p-1",
        tone === "white" && "rounded-[10px] border border-line bg-[#F2F2F2]",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition",
            tone === "brand"
              ? value === option.id
                ? "bg-brand-50 text-brand"
                : "text-[#667085] hover:text-ink"
              : tone === "white"
                ? value === option.id
                  ? "bg-white text-ink shadow-xs"
                  : "text-ink hover:bg-white/60"
                : value === option.id
                  ? "bg-[#E9E9E9] font-medium text-ink"
                  : "text-[#8C8C8C] hover:text-ink"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

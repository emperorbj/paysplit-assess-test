"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/** Card-style radio option. Render inside an element with `role="radiogroup"`. */
export function RadioCard({
  checked,
  onSelect,
  title,
  description,
  icon,
  disabled,
  className,
}: {
  checked: boolean
  onSelect: () => void
  title: string
  description: string
  icon?: React.ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-[10px] border p-3 text-left transition outline-none focus-visible:ring-4 focus-visible:ring-brand/15 short:py-2",
        checked ? "border-ink" : "border-line hover:border-[#C4C4C4]",
        disabled && "cursor-not-allowed opacity-50 hover:border-line",
        className
      )}
    >
      {icon && (
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#F5F5F5]">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="mt-1 block truncate text-sm text-[#8C8C8C]">
          {description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full border",
          checked ? "border-2 border-ink" : "border-[#D0D5DD]"
        )}
      >
        {checked && <span className="size-3 rounded-full bg-ink" />}
      </span>
    </button>
  )
}

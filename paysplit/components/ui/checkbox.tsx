"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Checkbox with an inline label; wraps Base UI so it stays accessible. */
export function Checkbox({
  label,
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  label: React.ReactNode
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 text-sm text-[#344054]",
        className
      )}
    >
      <CheckboxPrimitive.Root
        className="grid size-4 shrink-0 place-items-center rounded-[4px] border border-input bg-white transition focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none data-checked:border-brand data-checked:bg-brand"
        {...props}
      >
        <CheckboxPrimitive.Indicator>
          <CheckIcon className="size-3 text-white" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label}
    </label>
  )
}

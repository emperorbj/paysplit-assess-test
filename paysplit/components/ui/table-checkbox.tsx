"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { CheckIcon, MinusIcon } from "lucide-react"

/** Compact checkbox for table row selection (label is screen-reader only). */
export function TableCheckbox({
  label,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & { label: string }) {
  return (
    <CheckboxPrimitive.Root
      aria-label={label}
      className="grid size-4 place-items-center rounded-[4px] border border-input bg-white transition focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none data-indeterminate:border-brand data-indeterminate:bg-brand data-checked:border-brand data-checked:bg-brand data-disabled:opacity-50"
      {...props}
    >
      <CheckboxPrimitive.Indicator className="text-white">
        {props.indeterminate ? (
          <MinusIcon className="size-3" strokeWidth={3} />
        ) : (
          <CheckIcon className="size-3" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

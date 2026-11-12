"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

/** Brand toggle switch (Base UI, so it's keyboard + screen-reader accessible). */
export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full bg-[#EAECF0] p-0.5 transition-colors outline-none focus-visible:ring-4 focus-visible:ring-brand/20 data-checked:bg-brand data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(16,24,40,0.2)] transition-transform data-checked:translate-x-4" />
    </SwitchPrimitive.Root>
  )
}

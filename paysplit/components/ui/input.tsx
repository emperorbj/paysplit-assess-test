import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-14 w-full min-w-0 rounded-[10px] border border-input bg-background px-3.5 text-base text-ink shadow-xs transition-[color,box-shadow,border-color] outline-none placeholder:text-muted-foreground",
        "focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/15",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("text-sm font-medium text-[#344054]", className)}
      {...props}
    />
  )
}

export { Input, Label }

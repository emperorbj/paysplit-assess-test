import * as React from "react"

import { Label } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** Form control height: 60px, dropping to 48px on short desktop screens. */
export const FIELD = "h-15 short:h-12"

export function Field({
  id,
  label,
  required,
  className,
  children,
}: {
  id?: string
  label: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-2 short:space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </Label>
      {children}
    </div>
  )
}

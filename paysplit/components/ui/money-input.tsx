"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"

const groupFormatter = new Intl.NumberFormat("en-NG")

/**
 * Naira amount input. Displays "₦850,000" while typing and reports the
 * raw number (or `null` when empty) through `onValueChange`.
 */
export function MoneyInput({
  value,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: number | null
  onValueChange: (value: number | null) => void
}) {
  const display = value === null ? "" : `₦${groupFormatter.format(value)}`

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "").slice(0, 13)
        onValueChange(digits ? Number(digits) : null)
      }}
    />
  )
}

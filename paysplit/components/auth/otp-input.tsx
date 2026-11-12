"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type OtpInputProps = {
  value: string
  onChange: (value: string) => void
  length?: number
  autoFocus?: boolean
  /** Hide digits (PIN entry). */
  mask?: boolean
  /** Accessible name for the group of boxes. */
  label?: string
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus,
  mask = false,
  label = "Verification code",
}: OtpInputProps) {
  const refs = React.useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? "")

  const focus = (index: number) => {
    refs.current[Math.max(0, Math.min(index, length - 1))]?.focus()
  }

  const setDigit = (index: number, digit: string) => {
    const next = digits.slice()
    next[index] = digit
    onChange(next.join("").slice(0, length))
  }

  const handleChange = (index: number, raw: string) => {
    const clean = raw.replace(/\D/g, "")
    if (!clean) {
      setDigit(index, "")
      return
    }
    // Typing over a filled box or pasting several digits spreads them forward.
    const next = digits.slice()
    let cursor = index
    for (const char of clean) {
      if (cursor >= length) break
      next[cursor] = char
      cursor += 1
    }
    onChange(next.join(""))
    focus(cursor)
  }

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault()
      setDigit(index - 1, "")
      focus(index - 1)
    } else if (event.key === "ArrowLeft") {
      event.preventDefault()
      focus(index - 1)
    } else if (event.key === "ArrowRight") {
      event.preventDefault()
      focus(index + 1)
    }
  }

  return (
    <div
      className="flex justify-center gap-2 sm:gap-3"
      role="group"
      aria-label={label}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node
          }}
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => event.target.select()}
          type={mask ? "password" : "text"}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          autoFocus={autoFocus && index === 0}
          aria-label={`${label} digit ${index + 1}`}
          className={cn(
            "size-12 rounded-[10px] border border-input bg-background text-center text-2xl text-[#101828] shadow-xs transition outline-none sm:size-[58px]",
            "focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
          )}
        />
      ))}
    </div>
  )
}

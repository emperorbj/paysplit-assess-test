"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"

import { CopyIcon } from "@/components/icons/vuesax"
import { cn } from "@/lib/utils"

/** Copies `value` to the clipboard and briefly shows a check. */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string
  label: string
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          // Clipboard may be unavailable (insecure origin); text stays selectable.
        }
      }}
      aria-label={copied ? "Copied" : label}
      className={cn("rounded-md p-1 transition hover:bg-muted", className)}
    >
      {copied ? (
        <CheckIcon className="size-5" strokeWidth={2.5} />
      ) : (
        <CopyIcon className="size-5" />
      )}
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  )
}

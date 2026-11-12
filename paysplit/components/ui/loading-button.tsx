import * as React from "react"
import { Loader2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Button with a pending state for mutations: disabled, spinner centred, and the
 * label kept (invisibly) so the width doesn't jump.
 */
export function LoadingButton({
  loading = false,
  disabled,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { loading?: boolean }) {
  return (
    <Button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn("relative", className)}
      {...props}
    >
      <span
        className={cn("inline-flex items-center gap-2", loading && "invisible")}
      >
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Loader2Icon className="size-5 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading</span>
        </span>
      )}
    </Button>
  )
}

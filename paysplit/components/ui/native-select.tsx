import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Styled native `<select>`: accessible and mobile-friendly by default. */
function NativeSelect({
  className,
  wrapperClassName,
  ...props
}: React.ComponentProps<"select"> & { wrapperClassName?: string }) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <select
        data-slot="native-select"
        className={cn(
          "h-15 w-full appearance-none rounded-[10px] border border-input bg-background pr-12 pl-3.5 text-base text-[#344054] shadow-xs transition outline-none short:h-12",
          "focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15",
          className
        )}
        {...props}
      />
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-[#344054]"
        strokeWidth={1.75}
      />
    </div>
  )
}

export { NativeSelect }

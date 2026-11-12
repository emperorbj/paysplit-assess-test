import { cn } from "@/lib/utils"

/** shadcn-style loading placeholder. Size it like the content it stands in for. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-[#EDEFF2]", className)}
      {...props}
    />
  )
}

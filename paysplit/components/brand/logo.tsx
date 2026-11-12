import { cn } from "@/lib/utils"

const PATHS = [
  "M34.04 5.76C33.08 4.8 31.16 4 29.8 4H18.2C16.84 4 14.92 4.8 13.96 5.76L5.76 13.96C4.8 14.92 4 16.84 4 18.2V29.8C4 31.16 4.8 33.08 5.76 34.04L8.82 37.1L37.1 8.82L34.04 5.76Z",
  "M42.24 13.96L39.22 10.94L10.94 39.22L13.96 42.24C14.92 43.2 16.84 44 18.2 44H29.8C31.16 44 33.08 43.2 34.04 42.24L42.24 34.04C43.2 33.08 44 31.16 44 29.8V18.2C44 16.84 43.2 14.92 42.24 13.96Z",
  "M4.98 40.94C4.4 41.52 4.4 42.48 4.98 43.06C5.28 43.36 5.66 43.5 6.04 43.5C6.42 43.5 6.8 43.36 7.1 43.06L10.94 39.22L8.82 37.1L4.98 40.94Z",
  "M43.06 7.1C43.64 6.52 43.64 5.56 43.06 4.98C42.48 4.4 41.52 4.4 40.94 4.98L37.1 8.82L39.22 10.94L43.06 7.1Z",
]

type LogoMarkProps = {
  className?: string
  /** `brand` is the blue mark used in headers, `ink` the black mark used in modals. */
  variant?: "brand" | "ink"
}

export function LogoMark({ className, variant = "brand" }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      fill="currentColor"
      className={cn(
        "size-12",
        variant === "brand" ? "text-brand" : "text-black",
        className
      )}
    >
      {PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-7" />
      <span className="text-base font-medium tracking-tight">Paysplit</span>
    </span>
  )
}

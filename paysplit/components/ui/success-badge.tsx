import { cn } from "@/lib/utils"

/** Black-to-brand check badge with soft light rays, used on success modals. */
export function SuccessBadge({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex justify-center", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-[560px] -translate-1/2"
        style={{
          background:
            "repeating-conic-gradient(from 8deg, rgba(223,223,223,0.55) 0deg 16deg, transparent 16deg 45deg)",
          maskImage:
            "radial-gradient(circle, black 14%, rgba(0,0,0,0.45) 30%, transparent 48%)",
        }}
      />
      <div className="relative grid size-36 place-items-center rounded-full bg-linear-to-b from-black to-brand">
        <svg viewBox="0 0 144 144" className="size-36" aria-hidden="true">
          <path
            d="M42 71.84L61.85 91.68L101.52 52"
            fill="none"
            stroke="white"
            strokeWidth="20.47"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}

import { formatNaira } from "@/lib/finance"
import { cn } from "@/lib/utils"

/** Target progress bar: striped dark fill with a metallic knob at the current %. */
export function GoalProgress({
  target,
  percent,
  size = "md",
  className,
}: {
  target: number | null
  percent: number | null
  /** `sm` for compact cards: thinner track and smaller knob. */
  size?: "sm" | "md"
  className?: string
}) {
  const knob = size === "sm" ? 32 : 40
  if (target === null || percent === null) {
    return (
      <div className={cn("text-sm text-[#667085]", className)}>
        No target set for this wallet.
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-xs text-[#475467]">
        <span>Target: {formatNaira(target)}</span>
        <span className="font-semibold text-ink">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Goal progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className={cn(
          "relative mt-2 rounded-full bg-[#EFEFEF]",
          size === "sm" ? "h-5" : "h-6"
        )}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `max(${percent}%, ${knob / 2}px)`,
            backgroundImage:
              "repeating-linear-gradient(135deg, #121212 0 5px, #2B2B2B 5px 10px)",
          }}
        />
        <span
          aria-hidden="true"
          className="absolute top-1/2 -translate-1/2 rounded-full border border-ink shadow-md"
          style={{
            // Keep the knob inside the track at 0% / 100%.
            width: knob,
            height: knob,
            left: `clamp(${knob / 2}px, ${percent}%, calc(100% - ${knob / 2}px))`,
            background:
              "radial-gradient(circle at 40% 50%, #FFFFFF 0%, #D6D6D6 35%, #8A8A8A 70%, #4A4A4A 100%)",
          }}
        />
      </div>
    </div>
  )
}

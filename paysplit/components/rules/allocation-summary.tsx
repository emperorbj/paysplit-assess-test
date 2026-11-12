import { formatNaira } from "@/lib/finance"
import { cn } from "@/lib/utils"

export type AllocationSegment = {
  id: string
  name: string
  /** naira */
  amount: number
  /** Destination colour from the API; falls back to the design palette */
  color?: string
}

// Cycled per segment; `hatched` adds the diagonal texture from the design.
const SEGMENT_STYLES = [
  { color: "#33A7F5", hatched: true },
  { color: "#2EE6E6", hatched: false },
  { color: "#121212", hatched: true },
  { color: "#0E4A6E", hatched: false },
  { color: "#1E3A9E", hatched: true },
  { color: "#5BB8F7", hatched: true },
  { color: "#8B3DFF", hatched: false },
  { color: "#12A633", hatched: true },
]

const HATCH =
  "repeating-linear-gradient(135deg, rgba(255,255,255,0.14) 0 4px, transparent 4px 8px)"

export function AllocationSummary({
  salary,
  segments,
}: {
  salary: number
  /** Active rules in priority order. */
  segments: AllocationSegment[]
}) {
  const total = segments.reduce((sum, s) => sum + s.amount, 0)
  const remaining = salary - total
  const percent = salary > 0 ? Math.round((total / salary) * 100) : 0
  // If rules exceed the salary, scale segments so the bar still fits.
  const scale = total > salary ? salary / total : 1

  return (
    <section
      aria-label="Allocation summary"
      className="rounded-[20px] bg-linear-to-b from-brand-50 to-white/0 px-5 py-6 sm:px-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs text-[#344054]">Monthly Salary Baseline</p>
          <p className="mt-1 text-[32px] font-medium tracking-tight text-ink">
            {formatNaira(salary)}
          </p>
        </div>
        <dl className="flex gap-7">
          <div>
            <dt className="text-xs text-[#344054]">Total Allocated</dt>
            <dd className="mt-1 text-xl font-medium text-ink">
              {formatNaira(total)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[#344054]">Spend Account Remainder</dt>
            <dd
              className={cn(
                "mt-1 text-xl font-medium",
                remaining >= 0 ? "text-[#12A633]" : "text-[#D92D20]"
              )}
            >
              {formatNaira(Math.max(remaining, 0))}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-[#475467]">
          Allocation Progress:{" "}
          <span className="font-medium text-ink">{percent}% of Salary</span>
        </p>
        <p
          className={
            remaining >= 0 ? "text-[#667085]" : "font-medium text-[#D92D20]"
          }
        >
          {remaining >= 0
            ? `${formatNaira(remaining)} unallocated`
            : `Over-allocated by ${formatNaira(-remaining)}`}
        </p>
      </div>

      <div
        role="img"
        aria-label={`${percent}% of salary allocated across ${segments.length} rules`}
        className="mt-3 flex h-6 overflow-hidden rounded-full bg-[#EFEFEF]"
      >
        {segments.map((segment, index) => {
          const style = SEGMENT_STYLES[index % SEGMENT_STYLES.length]
          const color = segment.color ?? style.color
          const share = salary > 0 ? (segment.amount / salary) * 100 * scale : 0
          return (
            <span
              key={segment.id}
              title={`${segment.name}: ${formatNaira(segment.amount)} (${Math.round(share)}%)`}
              className="h-full transition-[width] duration-500"
              style={{
                width: `${share}%`,
                backgroundColor: color,
                backgroundImage: style.hatched ? HATCH : undefined,
              }}
            />
          )
        })}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink">
        {segments.map((segment, index) => (
          <li key={segment.id} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{
                backgroundColor:
                  segment.color ??
                  SEGMENT_STYLES[index % SEGMENT_STYLES.length].color,
              }}
            />
            {segment.name}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-[#D9D9D9]"
          />
          Spend Balance
        </li>
      </ul>
    </section>
  )
}

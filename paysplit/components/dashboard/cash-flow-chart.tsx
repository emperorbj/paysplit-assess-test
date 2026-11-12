"use client"

import * as React from "react"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"

import { NativeSelect } from "@/components/ui/native-select"
import type { CashFlow, CashFlowPoint } from "@/lib/dashboard"
import { formatNaira } from "@/lib/finance"
import { cn } from "@/lib/utils"

const RANGES = [
  { months: 9, label: "Last 9 months" },
  { months: 6, label: "Last 6 months" },
  { months: 3, label: "Last 3 months" },
]

const compact = new Intl.NumberFormat("en-NG", {
  notation: "compact",
  maximumFractionDigits: 1,
})

function axisLabel(value: number) {
  if (value === 0) return "₦0"
  return `${value < 0 ? "-" : ""}₦${compact.format(Math.abs(value))}`
}

/** Smallest "nice" step (1, 2, 2.5, 5 × 10ⁿ) so three steps cover `max`. */
function niceStep(max: number) {
  const raw = max / 3
  if (raw <= 0) return 25_000
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const factor = [1, 2, 2.5, 5, 10].find((f) => f * magnitude >= raw) ?? 10
  return factor * magnitude
}

function monthLabel(iso: string, style: "short" | "long") {
  const date = new Date(iso)
  return style === "short"
    ? `${date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} ${String(date.getUTCFullYear()).slice(2)}`
    : date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
}

export function CashFlowChart({ cashFlow }: { cashFlow: CashFlow }) {
  const [range, setRange] = React.useState(9)
  const points = cashFlow.points.slice(-range)
  const hasData = points.some((p) => p.wallets > 0 || p.beneficiaries > 0)

  // Default to the month with the largest movement, as highlighted in the design.
  const busiest = points.reduce(
    (best, p, i) =>
      p.wallets + p.beneficiaries >
      points[best].wallets + points[best].beneficiaries
        ? i
        : best,
    0
  )
  const [hovered, setHovered] = React.useState<number | null>(null)
  const active = hasData ? (hovered ?? busiest) : null

  const step = niceStep(
    Math.max(...points.flatMap((p) => [p.wallets, p.beneficiaries]), 0)
  )
  const top = step * 3
  const ticks = [3, 2, 1, 0, -1, -2, -3].map((n) => n * step)
  const pct = (value: number) => `${Math.min(value / top, 1) * 50}%`

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg text-ink">
            Salary Allocation &amp; Split Cash Flow
          </h2>
          <p className="mt-2 flex items-baseline gap-3">
            <span className="text-[32px] font-medium tracking-tight text-ink">
              {formatNaira(cashFlow.total)}
            </span>
            {cashFlow.change !== null && (
              <>
                <span
                  className={cn(
                    "text-xs",
                    cashFlow.change >= 0 ? "text-[#12A633]" : "text-[#D92D20]"
                  )}
                >
                  {cashFlow.change >= 0 ? "+" : ""}
                  {cashFlow.change}%
                </span>
                <span className="text-xs text-[#667085]">from last month</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-5 pt-1">
          <Legend color="bg-brand" label="Wallets" />
          <Legend color="bg-ink" label="Beneficiaries" />
          <label className="sr-only" htmlFor="cash-flow-range">
            Chart period
          </label>
          <NativeSelect
            id="cash-flow-range"
            value={range}
            onChange={(e) => {
              setRange(Number(e.target.value))
              setHovered(null)
            }}
            className="h-10 border-line bg-[#F8F8F4] pr-10 pl-4 text-sm text-ink short:h-10"
          >
            {RANGES.map((r) => (
              <option key={r.months} value={r.months}>
                {r.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto py-2">
        <div className="flex min-w-[560px]">
          {/* Y axis */}
          <div className="relative h-[300px] w-14 shrink-0 text-xs text-[#667085]">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute right-3 -translate-y-1/2 whitespace-nowrap"
                style={{ top: `${50 - (tick / top) * 50}%` }}
              >
                {axisLabel(tick)}
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div
              role="group"
              aria-label="Monthly split cash flow"
              className="relative h-[300px] border-b border-l border-line"
              onMouseLeave={() => setHovered(null)}
            >
              {/* Grid lines */}
              {ticks.map((tick) => (
                <span
                  key={tick}
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-0",
                    tick === 0
                      ? "z-10 border-t-[1.5px] border-dashed border-ink/70"
                      : "border-t border-[#F2F2F2]"
                  )}
                  style={{ top: `${50 - (tick / top) * 50}%` }}
                />
              ))}

              <div className="absolute inset-0 flex">
                {points.map((point, index) => (
                  <Column
                    key={point.date}
                    point={point}
                    isActive={index === active}
                    isLast={index === points.length - 1}
                    tooltipOnLeft={index >= points.length - 2}
                    walletsHeight={pct(point.wallets)}
                    beneficiariesHeight={pct(point.beneficiaries)}
                    onActivate={() => hasData && setHovered(index)}
                  />
                ))}
              </div>

              {!hasData && (
                <p className="absolute inset-x-0 top-[62%] text-center text-sm text-[#8C8C8C]">
                  Your split cash flow will appear here after your first payday.
                </p>
              )}
            </div>

            <div className="flex">
              {points.map((point) => (
                <span
                  key={point.date}
                  className="flex-1 pt-4 text-center text-sm text-[#475467]"
                >
                  {monthLabel(point.date, "short")}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-sm text-ink">
      <span className={cn("size-1.5 rounded-full", color)} />
      {label}
    </span>
  )
}

function Column({
  point,
  isActive,
  isLast,
  tooltipOnLeft,
  walletsHeight,
  beneficiariesHeight,
  onActivate,
}: {
  point: CashFlowPoint
  isActive: boolean
  isLast: boolean
  tooltipOnLeft: boolean
  walletsHeight: string
  beneficiariesHeight: string
  onActivate: () => void
}) {
  const hasValue = point.wallets > 0 || point.beneficiaries > 0

  return (
    <button
      type="button"
      onMouseEnter={onActivate}
      onFocus={onActivate}
      aria-label={`${monthLabel(point.date, "long")}: wallets ${formatNaira(point.wallets)}, beneficiaries ${formatNaira(point.beneficiaries)}`}
      className={cn(
        "relative flex-1 outline-none focus-visible:bg-brand/5",
        !isLast && "border-r border-dashed border-[#E4E4E4]"
      )}
    >
      {point.wallets > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-x-[10%] bottom-1/2 rounded-t-xl transition-colors",
            isActive ? "bg-brand" : "bg-linear-to-b from-[#E3F2FD] to-white/0"
          )}
          style={{ height: walletsHeight }}
        >
          <span className="absolute inset-x-0 -top-px h-0.5 bg-brand" />
        </span>
      )}
      {point.beneficiaries > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-x-[10%] top-1/2 rounded-b-xl transition-colors",
            isActive ? "bg-ink" : "bg-linear-to-t from-[#EFEFEF] to-white/0"
          )}
          style={{ height: beneficiariesHeight }}
        >
          <span className="absolute inset-x-0 -bottom-px h-0.5 bg-ink" />
        </span>
      )}

      {isActive && hasValue && (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-y-0 right-0 z-20 border-r-[1.5px] border-dashed border-ink/70"
          />
          <span
            aria-hidden="true"
            className="absolute top-1/2 right-0 z-30 size-2.5 translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-brand bg-white"
          />
          <span
            className={cn(
              "absolute top-[14%] z-30 w-max rounded-xl border border-line bg-white px-3 py-2.5 text-left shadow-[0_8px_24px_-8px_rgba(16,24,40,0.15)]",
              tooltipOnLeft
                ? "right-[calc(100%+12px)]"
                : "left-[calc(100%+12px)]"
            )}
          >
            <span className="block text-xs text-[#667085]">
              {monthLabel(point.date, "long")}
            </span>
            <TooltipRow
              color="bg-brand"
              value={`+${formatNaira(point.wallets)}`}
              change={point.walletsChange}
            />
            <TooltipRow
              color="bg-ink"
              value={`-${formatNaira(point.beneficiaries)}`}
              change={point.beneficiariesChange}
            />
          </span>
        </>
      )}
    </button>
  )
}

function TooltipRow({
  color,
  value,
  change,
}: {
  color: string
  value: string
  change: number
}) {
  const up = change >= 0
  return (
    <span className="mt-2 flex items-center gap-2 text-sm font-medium text-ink">
      <span className={cn("size-1.5 rounded-full", color)} />
      {value}
      <span
        className={cn(
          "flex items-center text-[10px] font-normal",
          up ? "text-[#12A633]" : "text-[#F04438]"
        )}
      >
        {up ? (
          <ArrowUpIcon className="size-3" />
        ) : (
          <ArrowDownIcon className="size-3" />
        )}
        {Math.abs(change)}%
      </span>
    </span>
  )
}

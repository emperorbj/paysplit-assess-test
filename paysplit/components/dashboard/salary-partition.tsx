import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import { Panel, PanelLink } from "@/components/dashboard/panel"
import type { Partition } from "@/lib/dashboard"
import { formatNaira } from "@/lib/finance"
import { cn } from "@/lib/utils"

const SIZE = 200
const RADIUS = 88
const STROKE = 11
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function SalaryPartition({ partition }: { partition: Partition }) {
  const { salary, wallets, beneficiaries } = partition
  const remaining = Math.max(salary - wallets - beneficiaries, 0)
  const percentLeft = salary > 0 ? Math.round((remaining / salary) * 100) : null

  return (
    <Panel
      title="Salary Partition"
      action={<PanelLink href="/split-rules" label="See rules" />}
    >
      <div className="mx-2 mb-2 flex flex-1 flex-col rounded-[20px] border border-line bg-white p-5">
        <div className="relative mx-auto my-6 size-[200px]">
          <Donut
            salary={salary}
            wallets={wallets}
            beneficiaries={beneficiaries}
          />
          <div className="absolute inset-0 grid place-content-center text-center">
            <span className="text-xs font-medium text-ink">
              Salary Remaining
            </span>
            <span className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              {formatNaira(remaining)}
            </span>
            <span className="mt-1 text-xs text-[#12A633]">
              {percentLeft === null ? "-" : percentLeft}% Left
            </span>
          </div>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-4">
          <PartitionStat
            href="/destinations"
            amount={wallets}
            label="Wallets"
            barClass="bg-brand"
          />
          <PartitionStat
            href="/destinations?tab=beneficiaries"
            amount={beneficiaries}
            label="Beneficiaries"
            barClass="bg-ink"
          />
        </div>
      </div>
    </Panel>
  )
}

/**
 * Ring split clockwise from 12 o'clock: beneficiaries (black), what's left
 * (grey track), then wallets (blue) closing back at the top.
 */
function Donut({
  salary,
  wallets,
  beneficiaries,
}: {
  salary: number
  wallets: number
  beneficiaries: number
}) {
  const gap = 10 // px between segments; also absorbs the round caps
  const arc = (fraction: number) =>
    Math.max(fraction * CIRCUMFERENCE - gap - STROKE, 0)
  const walletsFraction = salary > 0 ? wallets / salary : 0
  const beneficiariesFraction = salary > 0 ? beneficiaries / salary : 0

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="size-full -rotate-90"
      role="img"
      aria-label={`Salary partition: wallets ${formatNaira(wallets)}, beneficiaries ${formatNaira(beneficiaries)}`}
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={72}
        fill="none"
        stroke="#D0D0D0"
        strokeDasharray="4 4"
      />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="#E4E4E4"
        strokeWidth={STROKE}
      />
      {beneficiariesFraction > 0 && (
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#121212"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${arc(beneficiariesFraction)} ${CIRCUMFERENCE}`}
          strokeDashoffset={-(gap + STROKE) / 2}
        />
      )}
      {walletsFraction > 0 && (
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#33A7F5"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${arc(walletsFraction)} ${CIRCUMFERENCE}`}
          strokeDashoffset={
            -((1 - walletsFraction) * CIRCUMFERENCE + (gap + STROKE) / 2)
          }
        />
      )}
    </svg>
  )
}

function PartitionStat({
  href,
  amount,
  label,
  barClass,
}: {
  href: string
  amount: number
  label: string
  barClass: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg transition hover:bg-muted/60"
    >
      <span
        aria-hidden="true"
        className={cn("h-10 w-[3px] rounded-full", barClass)}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-medium text-ink">
          {formatNaira(amount)}
        </span>
        <span className="block text-xs text-[#475467]">{label}</span>
      </span>
      <ChevronRightIcon
        className="size-5 shrink-0 text-ink transition group-hover:translate-x-0.5"
        strokeWidth={1.75}
      />
    </Link>
  )
}

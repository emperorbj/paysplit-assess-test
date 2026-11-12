import Link from "next/link"
import { PlusIcon, RotateCcwIcon } from "lucide-react"

import type { LinkedRule } from "@/lib/destinations"
import { formatNaira } from "@/lib/finance"
import { cn } from "@/lib/utils"

function ruleValue(rule: LinkedRule) {
  return rule.method === "percentage"
    ? `${rule.value}%`
    : formatNaira(rule.value)
}

function modifiedLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

/**
 * The split rule feeding this destination. `layout="row"` for the wallet page
 * (full width), `"stack"` for the narrow beneficiary sidebar.
 */
export function LinkedRuleCard({
  rule,
  createHref,
  layout = "row",
}: {
  rule: LinkedRule | null
  /** Where "Create Rule" goes when nothing is linked yet. */
  createHref: string
  layout?: "row" | "stack"
}) {
  const action = rule ? (
    <Link
      href={`/split-rules?edit=${rule.id}`}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-brand px-3 text-sm text-brand transition hover:bg-brand-50",
        layout === "stack" && "w-full"
      )}
    >
      <RotateCcwIcon className="size-4" strokeWidth={1.75} />
      Reconfigure Rule
    </Link>
  ) : (
    <Link
      href={createHref}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand px-3 text-sm text-white transition hover:bg-brand/85",
        layout === "stack" && "w-full"
      )}
    >
      <PlusIcon className="size-4" strokeWidth={2} />
      Create Rule
    </Link>
  )

  const modified = rule && (
    <span className="text-sm text-[#667085]">
      Last Modified: {modifiedLabel(rule.lastModified)}
    </span>
  )

  return (
    <div
      className={cn(
        "rounded-[20px] border border-line bg-white p-4",
        layout === "row" && "flex flex-wrap items-center justify-between gap-4"
      )}
    >
      <div>
        <p className="text-sm text-[#344054]">Allocation Method / Value</p>
        <p className="mt-1.5 text-lg font-semibold text-ink">
          {rule ? ruleValue(rule) : "No rule linked yet"}
        </p>
      </div>
      {layout === "row" ? (
        <div className="flex flex-wrap items-center gap-4">
          {modified}
          {action}
        </div>
      ) : (
        <div className="mt-2 space-y-3">
          {action}
          {modified}
        </div>
      )}
    </div>
  )
}

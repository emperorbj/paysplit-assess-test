"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import { Panel, PanelLink } from "@/components/dashboard/panel"
import { SplitActivityIcon } from "@/components/icons/vuesax"
import { SearchInput } from "@/components/ui/search-input"
import { STATUS_STYLES } from "@/components/transactions/transaction-details-modal"
import { Button } from "@/components/ui/button"
import { SegmentedTabs } from "@/components/ui/segmented-tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { TableCheckbox } from "@/components/ui/table-checkbox"
import { mapTransaction } from "@/hooks/transactions/map-transaction"
import { useTransactions } from "@/hooks/transactions/use-transactions"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { formatNaira } from "@/lib/finance"
import { cn } from "@/lib/utils"

const MAX_ROWS = 5

const FILTERS = [
  { id: "all", label: "All Transactions" },
  { id: "wallet", label: "Wallets" },
  { id: "beneficiary", label: "Beneficiaries" },
] as const

type Filter = (typeof FILTERS)[number]["id"]

const TONE_TEXT = {
  in: "text-[#12A633]",
  wallet: "text-brand",
  payout: "text-[#D92D20]",
} as const

/** "Recent Activity & Splits": GET /transactions?limit=5, filtered on the server. */
export function RecentActivity() {
  const [filter, setFilter] = React.useState<Filter>("all")
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const search = useDebouncedValue(query.trim())
  const activity = useTransactions({
    page: 1,
    limit: MAX_ROWS,
    type: filter,
    search: search || undefined,
  })
  const rows = (activity.data?.data ?? []).map(mapTransaction)
  const total = activity.data?.pagination.total ?? 0
  const isFiltered = filter !== "all" || search !== ""
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const someSelected = rows.some((r) => selected.has(r.id))

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  return (
    <Panel
      title="Recent Activity & Splits"
      action={
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            label="Search activity"
          />
          <SegmentedTabs
            label="Filter activity"
            tone="white"
            options={FILTERS}
            value={filter}
            onChange={setFilter}
          />
        </div>
      }
    >
      <div className="mx-2 overflow-x-auto rounded-[20px] border border-line bg-white">
        <table className="w-full min-w-[720px] text-left whitespace-nowrap">
          <thead>
            <tr className="border-b border-line text-sm text-[#344054]">
              <th scope="col" className="w-12 py-3.5 pl-5">
                <TableCheckbox
                  label="Select all visible activity"
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  disabled={rows.length === 0}
                  onCheckedChange={(on) =>
                    rows.forEach((row) => toggle(row.id, on))
                  }
                />
              </th>
              <th scope="col" className="py-3.5 font-normal">
                Destination / Rule
              </th>
              <th scope="col" className="py-3.5 font-normal">
                Category
              </th>
              <th scope="col" className="py-3.5 font-normal">
                Date
              </th>
              <th scope="col" className="py-3.5 font-normal">
                Status
              </th>
              <th scope="col" className="py-3.5 font-normal">
                Amount
              </th>
              <th scope="col" className="w-12">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr
                key={item.id}
                className="border-b border-line last:border-0 hover:bg-[#FCFCFD]"
              >
                <td className="py-3 pl-5">
                  <TableCheckbox
                    label={`Select ${item.description}`}
                    checked={selected.has(item.id)}
                    onCheckedChange={(on) => toggle(item.id, on)}
                  />
                </td>
                <td className="py-3">
                  <span className="flex items-center gap-3 text-base text-ink">
                    <SplitActivityIcon
                      className={cn("size-5 shrink-0", TONE_TEXT[item.tone])}
                    />
                    {item.description}
                  </span>
                </td>
                <td className="py-3">
                  <span className="rounded-lg border border-line px-3 py-1 text-sm text-ink">
                    {item.category}
                  </span>
                </td>
                <td className="py-3 text-base text-ink">
                  {new Date(item.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </td>
                <td className="py-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-xs capitalize",
                      STATUS_STYLES[item.status]
                    )}
                  >
                    {item.status}
                  </span>
                </td>
                <td className={cn("py-3 text-base", TONE_TEXT[item.tone])}>
                  {item.tone === "in" ? "+" : "-"}
                  {formatNaira(item.amount)}
                </td>
                <td className="pr-4 text-right">
                  <Link
                    href={`/transactions?ref=${encodeURIComponent(item.reference)}`}
                    aria-label={`View ${item.description} on ${item.date}`}
                    className="inline-grid size-8 place-items-center rounded-md text-ink transition hover:bg-muted"
                  >
                    <ChevronRightIcon className="size-5" strokeWidth={1.75} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {activity.isPending &&
          Array.from({ length: MAX_ROWS }, (_, i) => (
            <div
              key={i}
              className="flex h-[61px] items-center gap-6 border-b border-line px-5 last:border-0"
            >
              <Skeleton className="size-4" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-6 w-20 rounded-lg" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}

        {activity.isError && (
          <div role="alert" className="px-6 py-14 text-center">
            <p className="text-xl font-medium text-ink">
              Couldn’t load your activity
            </p>
            <Button
              size="lg"
              className="mt-4 h-10 px-4 text-sm"
              onClick={() => void activity.refetch()}
            >
              Retry
            </Button>
          </div>
        )}

        {activity.isSuccess && rows.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className="text-xl font-medium text-ink">
              {isFiltered ? "No matching activity" : "No activity yet"}
            </p>
            <p className="mt-2 text-base text-ink">
              {isFiltered
                ? "Try a different search or filter."
                : "Activities will be displayed here."}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-3 text-sm">
        {total > 0 ? (
          <>
            <span className="text-[#667085]">
              Showing {rows.length} of {total} activity entries
            </span>
            <PanelLink href="/transactions" label="View Full Ledger" />
          </>
        ) : (
          <span className="h-5" />
        )}
      </div>
    </Panel>
  )
}

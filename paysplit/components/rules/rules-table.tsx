"use client"

import * as React from "react"
import { PlayIcon, SquarePenIcon, Trash2Icon } from "lucide-react"

import { Panel } from "@/components/dashboard/panel"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import { SearchInput } from "@/components/ui/search-input"
import { SegmentedTabs } from "@/components/ui/segmented-tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { TableCheckbox } from "@/components/ui/table-checkbox"
import { formatNaira } from "@/lib/finance"
import { koboToNaira } from "@/lib/money"
import { formatTableDate } from "@/lib/transactions"
import { cn } from "@/lib/utils"
import type { SplitRule } from "@/types/api/split-rules"

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
] as const

export type RulesFilter = (typeof FILTERS)[number]["id"]

/** Two rounded bars, the "pause" glyph from the design. */
function PauseGlyph() {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="size-[18px]"
      aria-hidden="true"
    >
      <path d="M7.99 14.33V3.67C7.99 2.65 7.56 2.25 6.48 2.25H3.76C2.68 2.25 2.25 2.65 2.25 3.67V14.33C2.25 15.35 2.68 15.75 3.76 15.75H6.48C7.56 15.75 7.99 15.35 7.99 14.33Z" />
      <path d="M15.75 14.33V3.67C15.75 2.65 15.32 2.25 14.24 2.25H11.52C10.45 2.25 10.01 2.65 10.01 3.67V14.33C10.01 15.35 10.44 15.75 11.52 15.75H14.24C15.32 15.75 15.75 15.35 15.75 14.33Z" />
    </svg>
  )
}

/** Rules come pre-filtered, searched and paged by the API (priority order). */
export function RulesTable({
  rules,
  page,
  pageCount,
  total,
  onPageChange,
  query,
  onQueryChange,
  filter,
  onFilterChange,
  loading,
  error,
  onRetry,
  busyIds,
  onToggleStatus,
  onEdit,
  onDelete,
}: {
  rules: SplitRule[]
  page: number
  pageCount: number
  total: number
  onPageChange: (page: number) => void
  query: string
  onQueryChange: (query: string) => void
  filter: RulesFilter
  onFilterChange: (filter: RulesFilter) => void
  loading: boolean
  error: string | null
  onRetry: () => void
  /** Rules with a pause/resume in flight */
  busyIds: Set<string>
  onToggleStatus: (rule: SplitRule) => void
  onEdit: (rule: SplitRule) => void
  onDelete: (rule: SplitRule) => void
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const rows = rules
  const isFiltered = filter !== "all" || query.trim() !== ""
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
      title="All Salary Rules"
      action={
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={query}
            onChange={onQueryChange}
            label="Search rules"
          />
          <SegmentedTabs
            label="Filter rules"
            tone="white"
            options={FILTERS}
            value={filter}
            onChange={onFilterChange}
          />
        </div>
      }
    >
      <div className="mx-2 overflow-x-auto rounded-[20px] border border-line bg-white">
        <table className="w-full min-w-[900px] text-left whitespace-nowrap">
          <thead>
            <tr className="border-b border-line text-sm text-[#344054]">
              <th scope="col" className="w-12 py-3.5 pl-5">
                <TableCheckbox
                  label="Select all rules on this page"
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  disabled={rows.length === 0}
                  onCheckedChange={(on) =>
                    rows.forEach((r) => toggle(r.id, on))
                  }
                />
              </th>
              <th scope="col" className="py-3.5 font-normal">
                Rule Name
              </th>
              <th scope="col" className="py-3.5 font-normal">
                Destination
              </th>
              <th scope="col" className="py-3.5 font-normal">
                Method
              </th>
              <th scope="col" className="py-3.5 font-normal">
                Date Created
              </th>
              <th scope="col" className="py-3.5 font-normal">
                Allocated This Month
              </th>
              <th scope="col" className="py-3.5 pr-5 text-right font-normal">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((rule) => {
              const paused = rule.status === "paused"
              const busy = busyIds.has(rule.id)
              return (
                <tr
                  key={rule.id}
                  className="border-b border-line text-base text-ink last:border-0 hover:bg-[#FCFCFD]"
                >
                  <td className="py-3 pl-5">
                    <TableCheckbox
                      label={`Select ${rule.name}`}
                      checked={selected.has(rule.id)}
                      onCheckedChange={(on) => toggle(rule.id, on)}
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2">
                      <span className={cn(paused && "text-[#8C8C8C]")}>
                        {rule.name}
                      </span>
                      {paused && (
                        <span className="rounded-full bg-[#F2F4F7] px-2 py-0.5 text-xs text-[#667085]">
                          Paused
                        </span>
                      )}
                    </span>
                  </td>
                  <td className={cn("py-3 pr-4", paused && "text-[#8C8C8C]")}>
                    {rule.destination.label}
                    {rule.destination.paused && (
                      <span className="ml-2 text-xs text-[#B54708]">
                        (destination paused)
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4">{rule.displayValue}</td>
                  <td className="py-3 pr-4">
                    {formatTableDate(rule.createdAt)}
                  </td>
                  <td
                    className={cn(
                      "py-3 pr-4 font-semibold",
                      paused && "font-normal text-[#8C8C8C]"
                    )}
                  >
                    {formatNaira(koboToNaira(rule.allocatedThisMonth) ?? 0)}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onToggleStatus(rule)}
                        disabled={busy}
                        aria-label={`${paused ? "Resume" : "Pause"} ${rule.name}`}
                        title={paused ? "Resume rule" : "Pause rule"}
                        className="grid size-8 place-items-center rounded-md text-[#464646] transition hover:bg-muted disabled:opacity-40"
                      >
                        {paused ? (
                          <PlayIcon className="size-[18px]" strokeWidth={1.5} />
                        ) : (
                          <PauseGlyph />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(rule)}
                        aria-label={`Edit ${rule.name}`}
                        title="Edit rule"
                        className="grid size-8 place-items-center rounded-md text-[#464646] transition hover:bg-muted"
                      >
                        <SquarePenIcon
                          className="size-[18px]"
                          strokeWidth={1.5}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(rule)}
                        aria-label={`Delete ${rule.name}`}
                        title="Delete rule"
                        className="grid size-8 place-items-center rounded-md text-[#D92D20] transition hover:bg-danger-50"
                      >
                        <Trash2Icon className="size-[18px]" strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {loading &&
          Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="flex h-[57px] items-center gap-8 border-b border-line px-5 last:border-0"
            >
              <Skeleton className="size-4" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}

        {!loading && error && (
          <div role="alert" className="px-6 py-14 text-center">
            <p className="text-xl font-medium text-ink">
              Couldn’t load your rules
            </p>
            <p className="mt-2 text-sm text-[#667085]">{error}</p>
            <Button
              size="lg"
              className="mt-4 h-10 px-4 text-sm"
              onClick={onRetry}
            >
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className="text-xl font-medium text-ink">
              {isFiltered ? "No matching rules" : "No rules yet"}
            </p>
            <p className="mt-2 text-base text-ink">
              {isFiltered
                ? "Try a different search or filter."
                : "Create a rule to start splitting your salary automatically."}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm sm:px-6">
        <span className="text-[#667085]">
          Showing {rows.length} of {total} rules
        </span>
        <Pagination
          page={page}
          pageCount={Math.max(1, pageCount)}
          onPageChange={onPageChange}
        />
      </div>
    </Panel>
  )
}

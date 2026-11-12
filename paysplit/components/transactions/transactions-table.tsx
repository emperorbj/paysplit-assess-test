"use client"

import * as React from "react"
import { ChevronRightIcon } from "lucide-react"

import { Panel } from "@/components/dashboard/panel"
import { ExportIcon, SplitActivityIcon } from "@/components/icons/vuesax"
import {
  downloadReceipt,
  STATUS_STYLES,
  TransactionDetailsModal,
} from "@/components/transactions/transaction-details-modal"
import { Pagination } from "@/components/ui/pagination"
import { SearchInput } from "@/components/ui/search-input"
import { SegmentedTabs } from "@/components/ui/segmented-tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { TableCheckbox } from "@/components/ui/table-checkbox"
import { formatNaira } from "@/lib/finance"
import { formatTableDate, type Transaction } from "@/lib/transactions"
import { cn } from "@/lib/utils"

/**
 * Server-driven mode: the API pages/filters/searches, the table just renders
 * the current page and reports changes back.
 */
export type ServerTableState = {
  page: number
  pageCount: number
  total: number
  onPageChange: (page: number) => void
  query: string
  onQueryChange: (query: string) => void
  filterId: string
  onFilterChange: (id: string) => void
  /** First load: render skeleton rows */
  loading: boolean
  error?: string | null
  onRetry?: () => void
}

export type TransactionFilter = {
  id: string
  label: string
  match: (t: Transaction) => boolean
}

const TONE: Record<
  Transaction["tone"],
  { text: string; icon: string; sign: string }
> = {
  in: { text: "text-[#12A633]", icon: "text-[#12A633]", sign: "" },
  wallet: { text: "text-brand", icon: "text-brand", sign: "-" },
  payout: { text: "text-[#D92D20]", icon: "text-[#C65948]", sign: "-" },
}

/**
 * Searchable, filterable, paginated transaction table. Rows open the
 * Transaction Details modal (`action="details"`) or download a receipt.
 */
export function TransactionsTable({
  title,
  transactions,
  filters,
  initialFilter,
  initialQuery = "",
  action = "details",
  pageSize = 10,
  compact = false,
  server,
  className,
}: {
  title: string
  transactions: Transaction[]
  filters?: TransactionFilter[]
  initialFilter?: string
  initialQuery?: string
  action?: "details" | "receipt"
  pageSize?: number
  /** Truncate destination/date for narrow layouts (beneficiary page). */
  compact?: boolean
  /** Pass to let the API do paging/search/filtering (see ServerTableState). */
  server?: ServerTableState
  className?: string
}) {
  const [filterId, setFilterId] = React.useState(
    initialFilter ?? filters?.[0]?.id ?? ""
  )
  const [query, setQuery] = React.useState(initialQuery)
  const [page, setPage] = React.useState(1)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [details, setDetails] = React.useState<{
    open: boolean
    transaction: Transaction | null
  }>({ open: false, transaction: null })

  const filter = filters?.find((f) => f.id === filterId)
  const q = query.trim().toLowerCase()
  const matches = server
    ? transactions
    : transactions.filter(
        (t) =>
          (!filter || filter.match(t)) &&
          (!q ||
            t.reference.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q))
      )
  const total = server ? server.total : matches.length
  const pageCount = server
    ? Math.max(1, server.pageCount)
    : Math.max(1, Math.ceil(matches.length / pageSize))
  const currentPage = server ? server.page : Math.min(page, pageCount)
  const rows = server
    ? matches
    : matches.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const activeQuery = server ? server.query : query
  const activeFilterId = server ? server.filterId : filterId
  const isFiltered =
    activeQuery.trim() !== "" ||
    (!!filters?.length && activeFilterId !== filters[0].id)
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
      title={title}
      className={className}
      action={
        filters && (
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              value={activeQuery}
              onChange={(value) => {
                if (server) return server.onQueryChange(value)
                setQuery(value)
                setPage(1)
              }}
              label={`Search ${title}`}
            />
            <SegmentedTabs
              label={`Filter ${title}`}
              tone="white"
              options={filters}
              value={activeFilterId}
              onChange={(id) => {
                if (server) return server.onFilterChange(id)
                setFilterId(id)
                setPage(1)
              }}
            />
          </div>
        )
      }
    >
      <div className="mx-2 overflow-x-auto rounded-[20px] border border-line bg-white">
        <table className="w-full min-w-[820px] text-left whitespace-nowrap">
          <thead>
            <tr className="border-b border-line text-sm text-[#344054]">
              <th scope="col" className="w-12 py-3.5 pl-5">
                <TableCheckbox
                  label="Select all rows on this page"
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  disabled={rows.length === 0}
                  onCheckedChange={(on) =>
                    rows.forEach((r) => toggle(r.id, on))
                  }
                />
              </th>
              <th scope="col" className="py-3.5 font-normal">
                Reference
              </th>
              <th scope="col" className="py-3.5 font-normal">
                Destination
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
              <th scope="col" className="w-14">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {server?.loading &&
              Array.from({ length: 5 }, (_, i) => (
                <tr
                  key={`skeleton-${i}`}
                  aria-hidden="true"
                  className="border-b border-line last:border-0"
                >
                  <td className="py-3.5 pl-5">
                    <Skeleton className="size-4" />
                  </td>
                  <td className="py-3.5 pr-4">
                    <Skeleton className="h-5 w-40" />
                  </td>
                  <td className="py-3.5 pr-4">
                    <Skeleton className="h-5 w-44" />
                  </td>
                  <td className="py-3.5 pr-4">
                    <Skeleton className="h-6 w-20 rounded-lg" />
                  </td>
                  <td className="py-3.5 pr-4">
                    <Skeleton className="h-5 w-36" />
                  </td>
                  <td className="py-3.5 pr-4">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </td>
                  <td className="py-3.5 pr-4">
                    <Skeleton className="h-5 w-24" />
                  </td>
                  <td className="pr-4">
                    <Skeleton className="ml-auto size-6" />
                  </td>
                </tr>
              ))}
            {rows.map((t) => {
              const tone = TONE[t.tone]
              return (
                <tr
                  key={t.id}
                  className="border-b border-line text-base text-ink last:border-0 hover:bg-[#FCFCFD]"
                >
                  <td className="py-3 pl-5">
                    <TableCheckbox
                      label={`Select ${t.reference}`}
                      checked={selected.has(t.id)}
                      onCheckedChange={(on) => toggle(t.id, on)}
                    />
                  </td>
                  <td className="py-3 pr-4">{t.reference}</td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-3">
                      <SplitActivityIcon
                        className={cn("size-5 shrink-0", tone.icon)}
                      />
                      <span className={cn(compact && "max-w-32 truncate")}>
                        {t.description}
                      </span>
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="rounded-lg border border-line px-3 py-1 text-sm">
                      {t.category}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={cn(compact && "block max-w-28 truncate")}>
                      {formatTableDate(t.date)}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={cn(
                        "rounded-full px-2 py-1 text-xs capitalize",
                        STATUS_STYLES[t.status]
                      )}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className={cn("py-3 pr-4", tone.text)}>
                    {tone.sign}
                    {formatNaira(t.amount)}
                  </td>
                  <td className="pr-4 text-right">
                    {action === "receipt" ? (
                      <button
                        type="button"
                        onClick={() => downloadReceipt(t)}
                        aria-label={`Download receipt for ${t.reference}`}
                        className="inline-grid size-8 place-items-center rounded-md transition hover:bg-muted"
                      >
                        <ExportIcon className="size-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setDetails({ open: true, transaction: t })
                        }
                        aria-label={`View details for ${t.reference}`}
                        className="inline-grid size-8 place-items-center rounded-md transition hover:bg-muted"
                      >
                        <ChevronRightIcon
                          className="size-5"
                          strokeWidth={1.75}
                        />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {server?.error ? (
          <div role="alert" className="px-6 py-14 text-center">
            <p className="text-lg font-medium text-ink">
              Couldn’t load activity
            </p>
            <p className="mt-1 text-sm text-[#667085]">{server.error}</p>
            {server.onRetry && (
              <button
                type="button"
                onClick={server.onRetry}
                className="mt-3 text-sm font-medium text-brand hover:underline"
              >
                Try again
              </button>
            )}
          </div>
        ) : (
          rows.length === 0 &&
          !server?.loading && (
            <div className="px-6 py-14 text-center">
              <p className="text-xl font-medium text-ink">
                {isFiltered ? "No matching activity" : "No activity yet"}
              </p>
              <p className="mt-2 text-base text-ink">
                {isFiltered
                  ? "Try a different search or filter."
                  : "Transactions will be displayed here."}
              </p>
            </div>
          )
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm sm:px-6">
        <span className="text-[#667085]">
          Showing {rows.length} of {total.toLocaleString()} activity entries
        </span>
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={server ? server.onPageChange : setPage}
        />
      </div>

      <TransactionDetailsModal
        transaction={details.transaction}
        open={details.open}
        onOpenChange={(open) => setDetails((d) => ({ ...d, open }))}
      />
    </Panel>
  )
}

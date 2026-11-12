"use client"

import * as React from "react"
import Link from "next/link"
import { EyeIcon, PencilLineIcon, Trash2Icon } from "lucide-react"

import { Panel } from "@/components/dashboard/panel"
import { Pagination } from "@/components/ui/pagination"
import { SearchInput } from "@/components/ui/search-input"
import { SegmentedTabs } from "@/components/ui/segmented-tabs"
import { TableCheckbox } from "@/components/ui/table-checkbox"
import type { Beneficiary } from "@/lib/destinations"
import { ordinal } from "@/lib/finance"
import { maskAccountNumber } from "@/lib/session"
import { cn } from "@/lib/utils"

const FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "paused", label: "Paused" },
] as const

const PAGE_SIZE = 10

function nextSplitLabel(iso: string | null) {
  if (!iso) return "Paused"
  const date = new Date(iso)
  return `${date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} ${ordinal(date.getUTCDate())}`
}

export function BeneficiaryTable({
  beneficiaries,
  onEdit,
  onDelete,
}: {
  beneficiaries: Beneficiary[]
  onEdit: (beneficiary: Beneficiary) => void
  onDelete: (beneficiary: Beneficiary) => void
}) {
  const [filter, setFilter] =
    React.useState<(typeof FILTERS)[number]["id"]>("all")
  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  const q = query.trim().toLowerCase()
  const matches = beneficiaries.filter(
    (b) =>
      (filter === "all" || b.status === filter) &&
      (!q ||
        b.name.toLowerCase().includes(q) ||
        b.bank.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q))
  )
  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const rows = matches.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )
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
      title="All Beneficiary"
      action={
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={query}
            onChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
            label="Search beneficiaries"
          />
          <SegmentedTabs
            label="Filter beneficiaries"
            tone="white"
            options={FILTERS}
            value={filter}
            onChange={(value) => {
              setFilter(value)
              setPage(1)
            }}
          />
        </div>
      }
    >
      <div className="mx-2 overflow-x-auto rounded-[20px] border border-line bg-white">
        <table className="w-full min-w-[820px] text-left whitespace-nowrap">
          <thead>
            <tr className="border-b border-line text-sm text-[#344054]">
              <th scope="col" className="w-12 py-3.5 pl-5">
                <TableCheckbox
                  label="Select all beneficiaries on this page"
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  disabled={rows.length === 0}
                  onCheckedChange={(on) =>
                    rows.forEach((r) => toggle(r.id, on))
                  }
                />
              </th>
              <th scope="col" className="py-3.5 font-normal">
                Recipient / Entity
              </th>
              <th scope="col" className="py-3.5 font-normal">
                Bank Name
              </th>
              <th scope="col" className="py-3.5 font-normal">
                Account Number
              </th>
              <th scope="col" className="py-3.5 font-normal">
                Category
              </th>
              <th scope="col" className="py-3.5 font-normal">
                Next split
              </th>
              <th scope="col" className="py-3.5 pr-5 text-right font-normal">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr
                key={b.id}
                className="border-b border-line text-base text-ink last:border-0 hover:bg-[#FCFCFD]"
              >
                <td className="py-3 pl-5">
                  <TableCheckbox
                    label={`Select ${b.name}`}
                    checked={selected.has(b.id)}
                    onCheckedChange={(on) => toggle(b.id, on)}
                  />
                </td>
                <td className="py-3 pr-4">{b.name}</td>
                <td className="py-3 pr-4">{b.bank}</td>
                <td className="py-3 pr-4">
                  {maskAccountNumber(b.accountNumber)}
                </td>
                <td className="py-3 pr-4">
                  <span className="rounded-lg border border-line px-3 py-1 text-sm">
                    {b.category}
                  </span>
                </td>
                <td
                  className={cn(
                    "py-3 pr-4 font-medium",
                    !b.nextSplit && "font-normal text-[#8C8C8C]"
                  )}
                >
                  {nextSplitLabel(b.nextSplit)}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/destinations/beneficiaries/${b.id}`}
                      aria-label={`View ${b.name}`}
                      className="grid size-8 place-items-center rounded-md transition hover:bg-muted"
                    >
                      <EyeIcon className="size-5" strokeWidth={1.5} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => onEdit(b)}
                      aria-label={`Edit ${b.name}`}
                      className="grid size-8 place-items-center rounded-md transition hover:bg-muted"
                    >
                      <PencilLineIcon className="size-5" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(b)}
                      aria-label={`Delete ${b.name}`}
                      className="grid size-8 place-items-center rounded-md text-[#D92D20] transition hover:bg-danger-50"
                    >
                      <Trash2Icon className="size-5" strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className="text-xl font-medium text-ink">
              {beneficiaries.length === 0
                ? "No beneficiary yet"
                : "No matching beneficiary"}
            </p>
            <p className="mt-2 text-base text-ink">
              {beneficiaries.length === 0
                ? "Add a beneficiary to start paying people from your salary."
                : "Try a different search or filter."}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm sm:px-6">
        <span className="text-[#667085]">
          Showing {rows.length} of {matches.length} beneficiaries
        </span>
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={setPage}
        />
      </div>
    </Panel>
  )
}

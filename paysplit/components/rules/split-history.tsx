"use client"

import * as React from "react"

import { Panel } from "@/components/dashboard/panel"
import { Button } from "@/components/ui/button"
import { Modal, ModalTitle } from "@/components/ui/modal"
import { Pagination } from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { useSplitRun, useSplitRuns } from "@/hooks/split-runs/use-split-runs"
import { errorMessage } from "@/lib/api/errors"
import { formatNaira } from "@/lib/finance"
import { koboToNaira } from "@/lib/money"

const PAGE_SIZE = 5

const naira = (kobo: number) =>
  formatNaira(koboToNaira(kobo) ?? 0, { kobo: true })

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const capitalise = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1)

const COLUMNS = [
  "Date",
  "Type",
  "Status",
  "Wallets",
  "Beneficiaries",
  "Skipped",
]

/** Automatic and Run Now splits, newest first (GET /split-runs). */
export function SplitHistory() {
  const [page, setPage] = React.useState(1)
  const [viewing, setViewing] = React.useState<string | null>(null)
  const runs = useSplitRuns({ page, limit: PAGE_SIZE })
  const rows = runs.data?.data ?? []

  return (
    <Panel title="Split History">
      <div className="mx-2 overflow-x-auto rounded-[20px] border border-line bg-white">
        <table className="w-full min-w-[820px] text-left whitespace-nowrap">
          <thead>
            <tr className="border-b border-line text-sm text-[#344054]">
              {COLUMNS.map((column, index) => (
                <th
                  key={column}
                  scope="col"
                  className={`py-3.5 font-normal ${index === 0 ? "pl-5" : ""}`}
                >
                  {column}
                </th>
              ))}
              <th scope="col" className="py-3.5 pr-5 text-right font-normal">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {runs.isPending
              ? Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    {[...COLUMNS, "Action"].map((column, index) => (
                      <td
                        key={column}
                        className={`py-3.5 pr-4 ${index === 0 ? "pl-5" : ""}`}
                      >
                        <Skeleton className="h-5 w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-line text-base text-ink last:border-0 hover:bg-[#FCFCFD]"
                  >
                    <td className="py-3 pr-4 pl-5">
                      {formatDate(run.createdAt)}
                    </td>
                    <td className="py-3 pr-4">
                      {run.trigger === "manual" ? "Run Now" : "Automatic"}
                    </td>
                    <td className="py-3 pr-4">{capitalise(run.status)}</td>
                    <td className="py-3 pr-4">{naira(run.toWallets)}</td>
                    <td className="py-3 pr-4">{naira(run.toBeneficiaries)}</td>
                    <td className="py-3 pr-4">{run.skipped.length}</td>
                    <td className="py-3 pr-5 text-right">
                      <button
                        type="button"
                        onClick={() => setViewing(run.id)}
                        className="text-sm text-brand hover:text-brand/80"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {runs.isError ? (
          <div role="alert" className="px-6 py-12 text-center">
            <p className="text-sm text-[#475467]">{errorMessage(runs.error)}</p>
            <Button
              size="lg"
              className="mt-3 h-9 px-3 text-sm"
              onClick={() => void runs.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : (
          !runs.isPending &&
          rows.length === 0 && (
            <p className="px-6 py-12 text-center text-base text-ink">
              No splits have run yet.
            </p>
          )
        )}
      </div>

      <div className="flex justify-end px-4 py-3 sm:px-6">
        <Pagination
          page={page}
          pageCount={Math.max(1, runs.data?.pagination.pages ?? 1)}
          onPageChange={setPage}
        />
      </div>

      <SplitRunModal runId={viewing} onClose={() => setViewing(null)} />
    </Panel>
  )
}

function SplitRunModal({
  runId,
  onClose,
}: {
  runId: string | null
  onClose: () => void
}) {
  const run = useSplitRun(runId)

  return (
    <Modal
      open={runId !== null}
      onOpenChange={(open) => !open && onClose()}
      className="max-w-[520px]"
    >
      <div className="p-6">
        <ModalTitle className="pr-10 text-lg font-semibold text-ink">
          Split details
        </ModalTitle>

        {run.isPending ? (
          <div aria-label="Loading split" className="mt-4 space-y-3">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : run.isError ? (
          <div role="alert" className="mt-4">
            <p className="text-sm text-[#475467]">{errorMessage(run.error)}</p>
            <Button
              size="lg"
              className="mt-3 h-9 px-3 text-sm"
              onClick={() => void run.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-[#475467]">
              {naira(run.data.baseAmount)} split on{" "}
              {formatDate(run.data.createdAt)}
            </p>
            {run.data.transactions.length === 0 ? (
              <p className="mt-4 text-sm text-[#475467]">
                No money moved in this split.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {run.data.transactions.map((transaction) => (
                  <li
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {transaction.title}
                      </p>
                      <p className="text-xs text-[#667085]">
                        {capitalise(transaction.status)} ·{" "}
                        {transaction.reference}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm text-ink">
                      {naira(transaction.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {run.data.skipped.length > 0 && (
              <p className="mt-3 text-sm text-[#B54708]">
                {run.data.skipped.length} rule(s) didn’t fit the available
                balance and were skipped.
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

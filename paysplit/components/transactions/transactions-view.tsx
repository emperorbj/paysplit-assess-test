"use client"

import * as React from "react"

import { PageHeading } from "@/components/app-shell/page-heading"
import { ExportIcon } from "@/components/icons/vuesax"
import {
  TransactionsTable,
  type TransactionFilter,
} from "@/components/transactions/transactions-table"
import { LoadingButton } from "@/components/ui/loading-button"
import { mapTransaction } from "@/hooks/transactions/map-transaction"
import {
  useExportTransactions,
  useTransactions,
} from "@/hooks/transactions/use-transactions"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { errorMessage } from "@/lib/api/errors"

// The API filters; `match` is unused in server mode.
const FILTERS: TransactionFilter[] = [
  { id: "all", label: "All", match: () => true },
  { id: "wallet", label: "Wallet", match: () => true },
  { id: "beneficiary", label: "Beneficiary", match: () => true },
]

export type TransactionsFilterId = "all" | "wallet" | "beneficiary"

const PAGE_SIZE = 10

/** Transactions page: GET /transactions, export via /transactions/export. */
export function TransactionsView({
  initialFilter,
  initialQuery,
}: {
  initialFilter: TransactionsFilterId
  initialQuery: string
}) {
  const [page, setPage] = React.useState(1)
  const [query, setQuery] = React.useState(initialQuery)
  const [filter, setFilter] =
    React.useState<TransactionsFilterId>(initialFilter)
  const search = useDebouncedValue(query.trim())

  const filters = { type: filter, search: search || undefined }
  const list = useTransactions({ ...filters, page, limit: PAGE_SIZE })
  const exportCsv = useExportTransactions()

  return (
    <main className="pb-6">
      <PageHeading
        title="Transactions"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Transactions" },
        ]}
        actions={
          <LoadingButton
            size="lg"
            className="h-10 px-4 text-sm"
            loading={exportCsv.isPending}
            disabled={!list.data || list.data.pagination.total === 0}
            onClick={() => exportCsv.mutate(filters)}
          >
            <ExportIcon className="size-4" />
            Export Statement CSV
          </LoadingButton>
        }
      />
      <div className="mx-2 rounded-[32px] border border-line bg-white p-2 sm:mx-5 sm:p-4">
        <TransactionsTable
          title="Transaction & Splits History"
          transactions={(list.data?.data ?? []).map(mapTransaction)}
          filters={FILTERS}
          server={{
            page,
            pageCount: list.data?.pagination.pages ?? 1,
            total: list.data?.pagination.total ?? 0,
            onPageChange: setPage,
            query,
            onQueryChange: (value) => {
              setQuery(value)
              setPage(1)
            },
            filterId: filter,
            onFilterChange: (id) => {
              setFilter(id as TransactionsFilterId)
              setPage(1)
            },
            loading: list.isPending,
            error: list.isError ? errorMessage(list.error) : null,
            onRetry: () => void list.refetch(),
          }}
        />
      </div>
    </main>
  )
}

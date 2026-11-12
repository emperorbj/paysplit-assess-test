"use client"

import * as React from "react"

import {
  TransactionsTable,
  type TransactionFilter,
} from "@/components/transactions/transactions-table"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { mapTransaction } from "@/hooks/transactions/map-transaction"
import {
  useWalletActivity,
  useWalletTransactions,
} from "@/hooks/wallets/use-wallets"
import { errorMessage } from "@/lib/api/errors"

// Filtering happens on the server; `match` is unused in server mode.
const ACTIVITY_FILTERS: TransactionFilter[] = [
  { id: "all", label: "All", match: () => true },
  { id: "in", label: "Money in", match: () => true },
  { id: "out", label: "Money out", match: () => true },
]

const HISTORY_FILTERS: TransactionFilter[] = [
  { id: "all", label: "All", match: () => true },
  { id: "allocated", label: "Allocated", match: () => true },
  { id: "moved", label: "Moved", match: () => true },
]

function useTableParams<F extends string>(initialFilter: F) {
  const [page, setPage] = React.useState(1)
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<F>(initialFilter)
  const search = useDebouncedValue(query.trim())
  return {
    page,
    setPage,
    query,
    setQuery: (value: string) => {
      setQuery(value)
      setPage(1)
    },
    filter,
    setFilter: (value: F) => {
      setFilter(value)
      setPage(1)
    },
    search,
  }
}

/** "All Wallet Activity" on the Destinations page (GET /wallets/activity). */
export function WalletActivityTable() {
  const t = useTableParams<"all" | "in" | "out">("all")
  const activity = useWalletActivity({
    page: t.page,
    limit: 5,
    direction: t.filter,
    search: t.search || undefined,
  })

  return (
    <TransactionsTable
      title="All Wallet Activity"
      transactions={(activity.data?.data ?? []).map(mapTransaction)}
      filters={ACTIVITY_FILTERS}
      server={{
        page: t.page,
        pageCount: activity.data?.pagination.pages ?? 1,
        total: activity.data?.pagination.total ?? 0,
        onPageChange: t.setPage,
        query: t.query,
        onQueryChange: t.setQuery,
        filterId: t.filter,
        onFilterChange: (id) => t.setFilter(id as "all" | "in" | "out"),
        loading: activity.isPending,
        error: activity.isError ? errorMessage(activity.error) : null,
        onRetry: () => void activity.refetch(),
      }}
    />
  )
}

/** "Wallet Transaction History" on a wallet's page (GET /wallets/{id}/transactions). */
export function WalletHistoryTable({
  walletId,
  className,
}: {
  walletId: string
  className?: string
}) {
  const t = useTableParams<"all" | "allocated" | "moved">("all")
  const history = useWalletTransactions(walletId, {
    page: t.page,
    limit: 10,
    filter: t.filter,
    search: t.search || undefined,
  })

  return (
    <TransactionsTable
      className={className}
      title="Wallet Transaction History"
      transactions={(history.data?.data ?? []).map(mapTransaction)}
      filters={HISTORY_FILTERS}
      server={{
        page: t.page,
        pageCount: history.data?.pagination.pages ?? 1,
        total: history.data?.pagination.total ?? 0,
        onPageChange: t.setPage,
        query: t.query,
        onQueryChange: t.setQuery,
        filterId: t.filter,
        onFilterChange: (id) =>
          t.setFilter(id as "all" | "allocated" | "moved"),
        loading: history.isPending,
        error: history.isError ? errorMessage(history.error) : null,
        onRetry: () => void history.refetch(),
      }}
    />
  )
}

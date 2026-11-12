"use client"

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query"

import { useAccessToken } from "@/hooks/auth/use-auth"
import { toastError, toastSuccess } from "@/lib/api/toast"
import { queryKeys } from "@/lib/query-keys"
import { transactionsService } from "@/services/transactions.service"
import type {
  TransactionsExportParams,
  TransactionsParams,
} from "@/types/api/transactions"

export function useTransactions(params: TransactionsParams) {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.transactions.list(params),
    queryFn: () => transactionsService.list(params),
    enabled: !!token,
    placeholderData: keepPreviousData,
  })
}

/** Receipt details; only fetched while the details modal is open. */
export function useTransaction(id: string | null) {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.transactions.detail(id ?? ""),
    queryFn: () => transactionsService.detail(id!),
    enabled: !!token && !!id,
  })
}

/** Downloads the CSV statement for the current filters. */
export function useExportTransactions() {
  return useMutation({
    mutationFn: (params: TransactionsExportParams) =>
      transactionsService.exportCsv(params),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `paysplit-statement-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toastSuccess(undefined, "Statement downloaded.")
    },
    onError: (error) => toastError(error),
  })
}

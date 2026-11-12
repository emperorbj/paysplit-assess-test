"use client"

import { useMutation, useQuery } from "@tanstack/react-query"

import { useInvalidateFinance } from "@/hooks/use-invalidate-finance"
import { toastError, toastSuccess, type ToastOptions } from "@/lib/api/toast"
import { formatNaira } from "@/lib/finance"
import { koboToNaira } from "@/lib/money"
import { queryKeys } from "@/lib/query-keys"
import { splitRunsService } from "@/services/split-runs.service"
import type { SplitRunsParams } from "@/types/api/split-runs"

export function useSplitRuns(params: SplitRunsParams) {
  return useQuery({
    queryKey: queryKeys.splitRuns.list(params),
    queryFn: () => splitRunsService.list(params),
  })
}

export function useSplitRun(id: string | null) {
  return useQuery({
    queryKey: queryKeys.splitRuns.detail(id ?? ""),
    queryFn: () => splitRunsService.get(id ?? ""),
    enabled: !!id,
  })
}

export function useRunSplit(options?: ToastOptions) {
  const invalidateFinance = useInvalidateFinance()
  return useMutation({
    mutationFn: splitRunsService.run,
    onSuccess: async (run) => {
      await invalidateFinance()
      const total = koboToNaira(run.toWallets + run.toBeneficiaries) ?? 0
      toastSuccess(
        undefined,
        `Split ${run.status === "processing" ? "started" : "complete"}: ${formatNaira(total, { kobo: true })}.`,
        options
      )
    },
    onError: (error) => toastError(error, options),
  })
}

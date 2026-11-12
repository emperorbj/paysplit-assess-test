"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { useAccessToken } from "@/hooks/auth/use-auth"
import { queryKeys } from "@/lib/query-keys"
import { dashboardService } from "@/services/dashboard.service"
import type { CashFlowParams } from "@/types/api/dashboard"

export function useDashboardSummary() {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: dashboardService.summary,
    enabled: !!token,
  })
}

export function useCashFlow(params: CashFlowParams) {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.dashboard.cashFlow(params),
    queryFn: () => dashboardService.cashFlow(params),
    enabled: !!token,
    placeholderData: keepPreviousData,
  })
}

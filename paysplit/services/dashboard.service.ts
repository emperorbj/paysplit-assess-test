import { apiClient } from "@/lib/api/client"
import { cleanParams } from "@/lib/api/params"
import type {
  CashFlowParams,
  CashFlowResponse,
  DashboardSummary,
} from "@/types/api/dashboard"

export const dashboardService = {
  summary: () =>
    apiClient.get<DashboardSummary>("/dashboard/summary").then((r) => r.data),

  /** Monthly buckets by default (last 9 months); daily for ranges ≤ 62 days. */
  cashFlow: (params: CashFlowParams) =>
    apiClient
      .get<CashFlowResponse>("/dashboard/cash-flow", {
        params: cleanParams(params),
      })
      .then((r) => r.data),
}

import { apiClient } from "@/lib/api/client"
import { cleanParams } from "@/lib/api/params"
import type { Paginated } from "@/types/api/common"
import type {
  ApiTransaction,
  TransactionDetail,
  TransactionsExportParams,
  TransactionsParams,
} from "@/types/api/transactions"

export const transactionsService = {
  /** Also feeds the dashboard's "Recent Activity & Splits" (limit 5). */
  list: (params: TransactionsParams) =>
    apiClient
      .get<Paginated<ApiTransaction>>("/transactions", {
        params: cleanParams(params),
      })
      .then((r) => r.data),

  detail: (id: string) =>
    apiClient.get<TransactionDetail>(`/transactions/${id}`).then((r) => r.data),

  /** CSV statement with the list's filters (max 5,000 rows). */
  exportCsv: (params: TransactionsExportParams) =>
    apiClient
      .get<Blob>("/transactions/export", {
        params: cleanParams(params),
        responseType: "blob",
      })
      .then((r) => r.data),
}

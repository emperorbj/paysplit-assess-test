import { apiClient } from "@/lib/api/client"
import type { Paginated } from "@/types/api/common"
import type {
  SplitRun,
  SplitRunDetail,
  SplitRunsParams,
} from "@/types/api/split-runs"

export const splitRunsService = {
  list: (params: SplitRunsParams) =>
    apiClient
      .get<Paginated<SplitRun>>("/split-runs", { params })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<SplitRunDetail>(`/split-runs/${id}`).then((r) => r.data),

  run: () => apiClient.post<SplitRunDetail>("/split-runs").then((r) => r.data),
}

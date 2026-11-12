import { apiClient } from "@/lib/api/client"
import { cleanParams } from "@/lib/api/params"
import type { Paginated } from "@/types/api/common"
import type {
  CreateSplitRuleDto,
  CreateSplitRuleResponse,
  SplitRule,
  SplitRulesParams,
  SplitRulesSummary,
  UpdateSplitRuleDto,
} from "@/types/api/split-rules"

export const splitRulesService = {
  summary: () =>
    apiClient
      .get<SplitRulesSummary>("/split-rules/summary")
      .then((r) => r.data),

  /** Priority order. */
  list: (params: SplitRulesParams) =>
    apiClient
      .get<Paginated<SplitRule>>("/split-rules", {
        params: cleanParams(params),
      })
      .then((r) => r.data),

  detail: (id: string) =>
    apiClient.get<SplitRule>(`/split-rules/${id}`).then((r) => r.data),

  /** 409 DESTINATION_HAS_RULE; 422 ALLOCATION_EXCEEDS_SALARY / DESTINATION_NOT_FOUND / INVALID_RULE_VALUE */
  create: (dto: CreateSplitRuleDto) =>
    apiClient
      .post<CreateSplitRuleResponse>("/split-rules", dto)
      .then((r) => r.data),

  /** Edit, or pause/resume with `{ status }`. */
  update: (id: string, dto: UpdateSplitRuleDto) =>
    apiClient.patch<SplitRule>(`/split-rules/${id}`, dto).then((r) => r.data),

  remove: (id: string) =>
    apiClient
      .delete<{ message: string }>(`/split-rules/${id}`)
      .then((r) => r.data),
}

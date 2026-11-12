import { apiClient } from "@/lib/api/client"
import type {
  IncomeResponse,
  SetupProgressResponse,
  UpsertIncomeDto,
  UpsertIncomeResponse,
} from "@/types/api/setup"

export const setupService = {
  income: () =>
    apiClient.get<IncomeResponse>("/setup/income").then((r) => r.data),

  /** Setup step 1, also Profile → Salary Income Source. */
  saveIncome: (dto: UpsertIncomeDto) =>
    apiClient
      .put<UpsertIncomeResponse>("/setup/income", dto)
      .then((r) => r.data),

  progress: () =>
    apiClient.get<SetupProgressResponse>("/setup/progress").then((r) => r.data),
}

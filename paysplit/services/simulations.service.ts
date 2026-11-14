import { apiClient } from "@/lib/api/client"
import type {
  SimulateSalaryCreditDto,
  SimulateSalaryCreditResponse,
} from "@/types/api/simulations"

export const simulationsService = {
  /**
   * Sandbox only: pretends an employer paid salary into the account. The
   * idempotency key makes a retried request apply the credit once.
   */
  salaryCredit: (dto: SimulateSalaryCreditDto, idempotencyKey: string) =>
    apiClient
      .post<SimulateSalaryCreditResponse>("/simulations/salary-credit", dto, {
        headers: { "Idempotency-Key": idempotencyKey },
      })
      .then((r) => r.data),
}

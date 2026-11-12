import { apiClient } from "@/lib/api/client"
import type {
  AddSalaryIdentityDto,
  SalaryAccountDetails,
} from "@/types/api/salary-account"

export const salaryAccountService = {
  get: () =>
    apiClient.get<SalaryAccountDetails>("/salary-account").then((r) => r.data),

  addIdentity: (dto: AddSalaryIdentityDto) =>
    apiClient
      .post<SalaryAccountDetails>("/salary-account/identity", dto)
      .then((r) => r.data),
}

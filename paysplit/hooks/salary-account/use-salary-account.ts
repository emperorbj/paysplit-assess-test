"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAccessToken } from "@/hooks/auth/use-auth"
import { useInvalidateFinance } from "@/hooks/use-invalidate-finance"
import { toastError, toastSuccess, type ToastOptions } from "@/lib/api/toast"
import { queryKeys } from "@/lib/query-keys"
import { salaryAccountService } from "@/services/salary-account.service"
import type { AddSalaryIdentityDto } from "@/types/api/salary-account"

export function useSalaryAccount() {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.salaryAccount.detail(),
    queryFn: salaryAccountService.get,
    enabled: !!token,
  })
}

export function useAddSalaryIdentity(options?: ToastOptions) {
  const invalidateFinance = useInvalidateFinance()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: AddSalaryIdentityDto) =>
      salaryAccountService.addIdentity(dto),
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.salaryAccount.detail(), data)
      await invalidateFinance()
      toastSuccess(undefined, "Your ID was added.", options)
    },
    onError: (error) => {
      toastError(error, options)
      // The account may already be active or being set up (409).
      void queryClient.invalidateQueries({
        queryKey: queryKeys.salaryAccount.all,
      })
    },
  })
}

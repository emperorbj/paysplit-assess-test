"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAccessToken } from "@/hooks/auth/use-auth"
import { toastError, toastSuccess, type ToastOptions } from "@/lib/api/toast"
import { queryKeys } from "@/lib/query-keys"
import { setupService } from "@/services/setup.service"
import type { MeResponse } from "@/types/api/auth"
import type { UpsertIncomeDto } from "@/types/api/setup"

export function useIncome() {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.setup.income(),
    queryFn: async () => (await setupService.income()).income,
    enabled: !!token,
  })
}

export function useSetupProgress() {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.setup.progress(),
    queryFn: async () => (await setupService.progress()).onboarding,
    enabled: !!token,
  })
}

export function useSaveIncome(options?: ToastOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpsertIncomeDto) => setupService.saveIncome(dto),
    onSuccess: async ({ income, onboarding }) => {
      queryClient.setQueryData(queryKeys.setup.income(), income)
      queryClient.setQueryData(queryKeys.setup.progress(), onboarding)
      queryClient.setQueryData<MeResponse>(queryKeys.auth.me(), (prev) =>
        prev ? { ...prev, onboarding } : prev
      )
      await queryClient.invalidateQueries({
        queryKey: queryKeys.users.profile(),
      })
      toastSuccess(undefined, "Salary details saved.", options)
    },
    onError: (error) => toastError(error, options),
  })
}

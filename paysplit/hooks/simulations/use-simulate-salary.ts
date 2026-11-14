"use client"

import { useMutation } from "@tanstack/react-query"

import { useInvalidateFinance } from "@/hooks/use-invalidate-finance"
import { toastError, toastSuccess, type ToastOptions } from "@/lib/api/toast"
import { simulationsService } from "@/services/simulations.service"
import type { SimulateSalaryCreditDto } from "@/types/api/simulations"

export function useSimulateSalaryCredit(options?: ToastOptions) {
  const invalidateFinance = useInvalidateFinance()
  return useMutation({
    mutationFn: ({
      idempotencyKey,
      ...dto
    }: SimulateSalaryCreditDto & { idempotencyKey: string }) =>
      simulationsService.salaryCredit(dto, idempotencyKey),
    onSuccess: async (data) => {
      await invalidateFinance()
      toastSuccess(data.message, "Salary received.", options)
    },
    onError: (error) => toastError(error, options),
  })
}

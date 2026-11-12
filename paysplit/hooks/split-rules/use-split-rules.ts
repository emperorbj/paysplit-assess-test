"use client"

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { useAccessToken } from "@/hooks/auth/use-auth"
import { useInvalidateFinance } from "@/hooks/use-invalidate-finance"
import { toastError, toastSuccess, type ToastOptions } from "@/lib/api/toast"
import { queryKeys } from "@/lib/query-keys"
import { splitRulesService } from "@/services/split-rules.service"
import type { MeResponse } from "@/types/api/auth"
import type {
  CreateSplitRuleDto,
  SplitRulesParams,
  UpdateSplitRuleDto,
} from "@/types/api/split-rules"

export function useSplitRulesSummary() {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.splitRules.summary(),
    queryFn: splitRulesService.summary,
    enabled: !!token,
  })
}

export function useSplitRules(params: SplitRulesParams) {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.splitRules.list(params),
    queryFn: () => splitRulesService.list(params),
    enabled: !!token,
    placeholderData: keepPreviousData,
  })
}

export function useSplitRule(id: string | null) {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.splitRules.detail(id ?? ""),
    queryFn: () => splitRulesService.detail(id!),
    enabled: !!token && !!id,
  })
}

export function useCreateSplitRule(options?: ToastOptions) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateFinance()
  return useMutation({
    mutationFn: (dto: CreateSplitRuleDto) => splitRulesService.create(dto),
    onSuccess: async ({ rule, onboarding }) => {
      // Creating the first rule can complete setup; update the checklist now.
      queryClient.setQueryData<MeResponse>(queryKeys.auth.me(), (prev) =>
        prev ? { ...prev, onboarding } : prev
      )
      await invalidate()
      toastSuccess(undefined, `“${rule.name}” rule activated.`, options)
    },
    onError: (error) => toastError(error, options),
  })
}

export function useUpdateSplitRule(options?: ToastOptions) {
  const invalidate = useInvalidateFinance()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateSplitRuleDto }) =>
      splitRulesService.update(id, dto),
    onSuccess: async (rule, { dto }) => {
      await invalidate()
      const onlyStatus = Object.keys(dto).length === 1 && dto.status
      toastSuccess(
        undefined,
        onlyStatus
          ? `“${rule.name}” ${rule.status === "paused" ? "paused" : "resumed"}.`
          : "Rule updated.",
        options
      )
    },
    onError: (error) => toastError(error, options),
  })
}

export function useDeleteSplitRule(options?: ToastOptions) {
  const invalidate = useInvalidateFinance()
  return useMutation({
    mutationFn: (id: string) => splitRulesService.remove(id),
    onSuccess: async (data) => {
      await invalidate()
      toastSuccess(data.message, "Split rule deleted.", options)
    },
    onError: (error) => toastError(error, options),
  })
}

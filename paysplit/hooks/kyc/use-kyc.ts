"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAccessToken } from "@/hooks/auth/use-auth"
import { toastError, toastSuccess, type ToastOptions } from "@/lib/api/toast"
import { toLivenessError } from "@/lib/kyc/liveness-error"
import { queryKeys } from "@/lib/query-keys"
import { kycService } from "@/services/kyc.service"
import type {
  InternationalIdentityDto,
  KycActionResponse,
  KycStatusResponse,
  NigeriaIdentityDto,
  UpdateKycProfileDto,
} from "@/types/api/kyc"

export function useKycCountries() {
  return useQuery({
    queryKey: queryKeys.kyc.countries(),
    queryFn: kycService.countries,
    staleTime: Infinity, // static reference data
  })
}

export function useKycStatus() {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.kyc.status(),
    queryFn: kycService.status,
    enabled: !!token,
  })
}

/** After any KYC step: apply the returned status, then refetch status + onboarding. */
function useAfterKycStep() {
  const queryClient = useQueryClient()
  return async (data: KycActionResponse) => {
    if (data.steps && data.currentStep) {
      queryClient.setQueryData<KycStatusResponse>(
        queryKeys.kyc.status(),
        (prev) =>
          prev
            ? { ...prev, ...data, steps: data.steps! }
            : (data as KycStatusResponse)
      )
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.kyc.status() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() }),
    ])
  }
}

export function useUpdateKycProfile(options?: ToastOptions) {
  const after = useAfterKycStep()
  return useMutation({
    mutationFn: (dto: UpdateKycProfileDto) => kycService.updateProfile(dto),
    onSuccess: async (data) => {
      await after(data)
      toastSuccess(data.message, "Profile saved.", options)
    },
    onError: (error) => toastError(error, options),
  })
}

export function useVerifyNigeriaIdentity(options?: ToastOptions) {
  const after = useAfterKycStep()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: NigeriaIdentityDto) =>
      kycService.verifyNigeriaIdentity(dto),
    onSuccess: async (data) => {
      await after(data)
      toastSuccess(data.message, "Identity verified.", options)
    },
    onError: (error) => {
      toastError(error, options)
      // A failed attempt changes failureReason and attemptsRemaining.
      void queryClient.invalidateQueries({ queryKey: queryKeys.kyc.status() })
    },
  })
}

export function useUploadInternationalIdentity(options?: ToastOptions) {
  const after = useAfterKycStep()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: InternationalIdentityDto) =>
      kycService.uploadInternationalIdentity(dto),
    onSuccess: async (data) => {
      await after(data)
      toastSuccess(data.message, "Document accepted.", options)
    },
    onError: (error) => {
      toastError(error, options)
      // A failed attempt changes failureReason and attemptsRemaining.
      void queryClient.invalidateQueries({ queryKey: queryKeys.kyc.status() })
    },
  })
}

export function useSubmitLiveness(options?: ToastOptions) {
  const after = useAfterKycStep()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (selfie: Blob) => kycService.submitLiveness(selfie),
    onSuccess: async (data) => {
      await after(data)
      toastSuccess(data.message, "Identity approved.", options)
    },
    onError: (error) => {
      toastError(toLivenessError(error), options)
      // A failed attempt changes failureReason and attemptsRemaining.
      void queryClient.invalidateQueries({ queryKey: queryKeys.kyc.status() })
    },
  })
}

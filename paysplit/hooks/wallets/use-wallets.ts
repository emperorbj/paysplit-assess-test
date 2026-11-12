"use client"

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query"

import { useAccessToken } from "@/hooks/auth/use-auth"
import { useInvalidateFinance } from "@/hooks/use-invalidate-finance"
import { toastError, toastSuccess, type ToastOptions } from "@/lib/api/toast"
import { queryKeys } from "@/lib/query-keys"
import { categoriesService, walletsService } from "@/services/wallets.service"
import type {
  CreateWalletDto,
  UpdateWalletDto,
  WalletActivityParams,
  WalletTransactionsParams,
} from "@/types/api/wallets"

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: categoriesService.list,
    staleTime: Infinity, // fixed list with stable ids
  })
}

export function useWallets() {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.wallets.list(),
    queryFn: walletsService.list,
    enabled: !!token,
  })
}

export function useAccentColors() {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.wallets.accentColors(),
    queryFn: walletsService.accentColors,
    enabled: !!token,
    staleTime: Infinity,
  })
}

export function useWalletActivity(params: WalletActivityParams) {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.wallets.activity(params),
    queryFn: () => walletsService.activity(params),
    enabled: !!token,
    placeholderData: keepPreviousData, // no flash between pages
  })
}

export function useWallet(id: string) {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.wallets.detail(id),
    queryFn: () => walletsService.detail(id),
    enabled: !!token && !!id,
  })
}

export function useWalletTransactions(
  id: string,
  params: WalletTransactionsParams
) {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.wallets.transactions(id, params),
    queryFn: () => walletsService.transactions(id, params),
    enabled: !!token && !!id,
    placeholderData: keepPreviousData,
  })
}

export function useCreateWallet(options?: ToastOptions) {
  const invalidate = useInvalidateFinance()
  return useMutation({
    mutationFn: (dto: CreateWalletDto) => walletsService.create(dto),
    onSuccess: async (wallet) => {
      await invalidate()
      toastSuccess(undefined, `“${wallet.name}” wallet created.`, options)
    },
    onError: (error) => toastError(error, options),
  })
}

export function useUpdateWallet(id: string, options?: ToastOptions) {
  const invalidate = useInvalidateFinance()
  return useMutation({
    mutationFn: (dto: UpdateWalletDto) => walletsService.update(id, dto),
    onSuccess: async () => {
      await invalidate()
      toastSuccess(undefined, "Wallet updated.", options)
    },
    onError: (error) => toastError(error, options),
  })
}

export function useDeleteWallet(options?: ToastOptions) {
  const invalidate = useInvalidateFinance()
  return useMutation({
    mutationFn: (id: string) => walletsService.remove(id),
    onSuccess: async (data) => {
      await invalidate()
      toastSuccess(data.message, "Wallet deleted.", options)
    },
    onError: (error) => toastError(error, options),
  })
}

export function useMoveWalletFunds(id: string, options?: ToastOptions) {
  const invalidate = useInvalidateFinance()
  return useMutation({
    /** amount in kobo */
    mutationFn: (amount: number) => walletsService.move(id, { amount }),
    onSuccess: async (data) => {
      await invalidate()
      toastSuccess(data.message, "Funds moved to your salary account.", options)
    },
    onError: (error) => toastError(error, options),
  })
}

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { toastError, toastSuccess, type ToastOptions } from "@/lib/api/toast"
import {
  clearSession,
  getAccessToken,
  replaceAccessToken,
  setSession,
  subscribeToSession,
} from "@/lib/auth/session"
import { queryKeys } from "@/lib/query-keys"
import { authService } from "@/services/auth.service"
import type {
  AuthResponse,
  ChangePasswordDto,
  LoginDto,
  MeResponse,
  SignupDto,
} from "@/types/api/auth"

/* --------------------------------- Session -------------------------------- */

/**
 * The stored access token. `undefined` during SSR / first render (unknown),
 * `null` when signed out.
 */
export function useAccessToken() {
  return React.useSyncExternalStore(
    subscribeToSession,
    getAccessToken,
    () => undefined
  )
}

/** Current user + onboarding. Only runs when a token exists. */
export function useMe() {
  const token = useAccessToken()
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: authService.me,
    enabled: !!token,
    staleTime: 60_000,
  })
}

function useStoreSession() {
  const queryClient = useQueryClient()
  return (auth: AuthResponse, remember: boolean) => {
    setSession(auth.accessToken, auth.expiresIn, remember)
    queryClient.setQueryData<MeResponse>(queryKeys.auth.me(), {
      user: auth.user,
      onboarding: auth.onboarding,
    })
  }
}

export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: authService.logout,
    // Sign out locally even if the backend can't be reached.
    onSettled: () => {
      clearSession()
      queryClient.clear()
      router.push("/")
      toast.success("You’ve been signed out.")
    },
  })
}

export function useChangePassword(options?: ToastOptions) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: ChangePasswordDto) => authService.changePassword(dto),
    onSuccess: (data) => {
      replaceAccessToken(data.accessToken, data.expiresIn)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.users.profile(),
      })
      toastSuccess(data.message, "Password updated.", options)
    },
    onError: (error) => toastError(error, options),
  })
}

/* ---------------------------------- Login --------------------------------- */

export function useLogin(options?: ToastOptions) {
  const storeSession = useStoreSession()
  return useMutation({
    mutationFn: (dto: LoginDto) => authService.login(dto),
    onSuccess: (auth, dto) => {
      storeSession(auth, !!dto.rememberMe)
      toastSuccess(undefined, `Welcome back, ${auth.user.firstName}!`, options)
    },
    onError: (error) => toastError(error, options),
  })
}

/* ---------------------------------- Signup -------------------------------- */

/** Creates the account and signs straight in (no email verification). */
export function useSignup(options?: ToastOptions) {
  const storeSession = useStoreSession()
  return useMutation({
    mutationFn: (dto: SignupDto) => authService.signup(dto),
    onSuccess: (auth, dto) => {
      storeSession(auth, !!dto.rememberMe)
      toastSuccess(undefined, "Your account is ready.", options)
    },
    onError: (error) => toastError(error, options),
  })
}

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { toApiError } from "@/lib/api/errors"
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
import {
  ACCOUNT_SETUP_INCOMPLETE,
  type AuthResponse,
  type ChangePasswordDto,
  type LoginDto,
  type MeResponse,
  type SetPasswordDto,
  type SignupDto,
  type VerifyCodeDto,
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
    onError: (error) => {
      // Signup never finished: the backend emails a fresh code. The caller
      // moves the user to the verify step, so explain instead of erroring.
      if (toApiError(error).code === ACCOUNT_SETUP_INCOMPLETE) {
        if (!options?.silent) {
          toast.warning(
            "Finish setting up your account — we’ve emailed you a new code."
          )
        }
        return
      }
      toastError(error, options)
    },
  })
}

/* ---------------------------------- Signup -------------------------------- */

export function useSignup(options?: ToastOptions) {
  return useMutation({
    mutationFn: (dto: SignupDto) => authService.signup(dto),
    onSuccess: (data) =>
      toastSuccess(data.message, "Check your email for a code.", options),
    onError: (error) => toastError(error, options),
  })
}

export function useVerifyEmail(options?: ToastOptions) {
  return useMutation({
    mutationFn: (dto: VerifyCodeDto) => authService.verifyEmail(dto),
    onSuccess: (data) => toastSuccess(data.message, "Email verified.", options),
    onError: (error) => toastError(error, options),
  })
}

export function useResendEmailCode(options?: ToastOptions) {
  return useMutation({
    mutationFn: (email: string) => authService.resendEmailCode(email),
    onSuccess: (data) =>
      toastSuccess(data.message, "A new code is on its way.", options),
    onError: (error) => toastError(error, options),
  })
}

export function useSetPassword(options?: ToastOptions) {
  const storeSession = useStoreSession()
  return useMutation({
    mutationFn: ({
      setupToken,
      ...dto
    }: SetPasswordDto & { setupToken: string }) =>
      authService.setPassword(setupToken, dto),
    // A fresh account stays signed in for the token's lifetime.
    onSuccess: (auth) => {
      storeSession(auth, true)
      toastSuccess(undefined, "Your account is ready.", options)
    },
    onError: (error) => toastError(error, options),
  })
}

/* ----------------------------- Forgot password ---------------------------- */

export function useForgotPassword(options?: ToastOptions) {
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
    onSuccess: (data) =>
      toastSuccess(data.message, "Check your email for a code.", options),
    onError: (error) => toastError(error, options),
  })
}

export function useVerifyResetCode(options?: ToastOptions) {
  return useMutation({
    mutationFn: (dto: VerifyCodeDto) => authService.verifyResetCode(dto),
    onSuccess: (data) => toastSuccess(data.message, "Code verified.", options),
    onError: (error) => toastError(error, options),
  })
}

export function useResetPassword(options?: ToastOptions) {
  return useMutation({
    mutationFn: (dto: { email: string; newPassword: string }) =>
      authService.resetPassword(dto),
    onSuccess: (data) =>
      toastSuccess(data.message, "Password reset. Please log in.", options),
    onError: (error) => toastError(error, options),
  })
}

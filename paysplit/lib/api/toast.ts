"use client"

import { toast } from "sonner"

import { errorMessage } from "@/lib/api/errors"

/** Options every mutation hook accepts. */
export type ToastOptions = {
  /** Suppress toasts (the screen shows the result inline instead). */
  silent?: boolean
}

export function toastSuccess(
  message: string | undefined,
  fallback: string,
  options?: ToastOptions
) {
  if (options?.silent) return
  toast.success(message || fallback)
}

export function toastError(error: unknown, options?: ToastOptions) {
  if (options?.silent) return
  toast.error(errorMessage(error))
}

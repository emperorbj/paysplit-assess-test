"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

/** shadcn-style Sonner toaster: rich colours (green success, red error, amber warning). */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      richColors
      closeButton
      position="top-right"
      toastOptions={{ classNames: { toast: "font-sans text-sm" } }}
      {...props}
    />
  )
}

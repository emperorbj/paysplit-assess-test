"use client"

import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  /** Classes for the popup card, e.g. a `max-w-*` to set its width. */
  className?: string
  showClose?: boolean
  /** Prevent closing by clicking the backdrop (Escape still works). */
  disablePointerDismissal?: boolean
}

export function Modal({
  open,
  onOpenChange,
  children,
  className,
  showClose = true,
  disablePointerDismissal,
}: ModalProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => onOpenChange(next)}
      disablePointerDismissal={disablePointerDismissal}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto p-4">
          <Dialog.Popup
            className={cn(
              "relative my-auto w-full max-w-[540px] shrink-0 overflow-hidden rounded-2xl bg-white text-ink shadow-[0_20px_40px_-12px_rgba(16,24,40,0.18)] outline-none",
              "transition-[opacity,scale] duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
              className
            )}
          >
            {showClose && (
              <Dialog.Close
                aria-label="Close"
                className="absolute top-6 right-6 z-10 rounded-md p-1 text-[#667085] transition hover:bg-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              >
                <XIcon className="size-6" strokeWidth={1.75} />
              </Dialog.Close>
            )}
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export const ModalTitle = Dialog.Title
export const ModalDescription = Dialog.Description

export function ModalDivider({ className }: { className?: string }) {
  return <hr className={cn("my-6 border-line", className)} />
}

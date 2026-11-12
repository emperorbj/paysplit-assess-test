"use client"

import { Button } from "@/components/ui/button"
import {
  Modal,
  ModalDescription,
  ModalDivider,
  ModalTitle,
} from "@/components/ui/modal"
import { cn } from "@/lib/utils"

/** Small "Are you sure?" dialog with Cancel + a confirm action. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  destructive?: boolean
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-[400px]"
      showClose={false}
    >
      <div className="px-6 pt-6">
        <ModalTitle className="text-lg font-semibold text-ink">
          {title}
        </ModalTitle>
        <ModalDescription className="mt-1 text-sm text-[#475467]">
          {description}
        </ModalDescription>
      </div>
      <ModalDivider className="my-5" />
      <div className="grid grid-cols-2 gap-3 px-6 pb-6">
        <Button
          variant="outline"
          size="xl"
          className="border-input text-[#344054]"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          size="xl"
          className={cn(
            destructive && "bg-[#D92D20] text-white hover:bg-[#B42318]"
          )}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

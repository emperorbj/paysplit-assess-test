"use client"

import * as React from "react"
import { CheckIcon, EyeIcon, EyeOffIcon } from "lucide-react"

import { OtpInput } from "@/components/auth/otp-input"
import { Field, FIELD } from "@/components/forms/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Modal,
  ModalDescription,
  ModalDivider,
  ModalTitle,
} from "@/components/ui/modal"
import { useChangePassword } from "@/hooks/auth/use-auth"
import { cn } from "@/lib/utils"

function ModalShell({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  canSubmit,
  onSubmit,
  pending = false,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  submitLabel: string
  canSubmit: boolean
  onSubmit: () => void
  pending?: boolean
  children: React.ReactNode
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} className="max-w-[480px]">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (canSubmit && !pending) onSubmit()
        }}
      >
        <div className="px-6 pt-6">
          <ModalTitle className="pr-10 text-lg font-semibold text-ink">
            {title}
          </ModalTitle>
          <ModalDescription className="mt-1 text-sm text-[#475467]">
            {description}
          </ModalDescription>
          <div className="mt-5 space-y-4">{children}</div>
        </div>
        <ModalDivider className="my-5" />
        <div className="grid grid-cols-2 gap-3 px-6 pb-6">
          <Button
            type="button"
            variant="outline"
            size="xl"
            className="border-input text-[#344054]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            size="xl"
            disabled={!canSubmit}
            loading={pending}
          >
            {submitLabel}
          </LoadingButton>
        </div>
      </form>
    </Modal>
  )
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
}) {
  const [visible, setVisible] = React.useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(FIELD, "pr-12")}
        required
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-3 my-auto grid size-8 place-items-center rounded-md text-[#344054] hover:bg-muted"
      >
        {visible ? (
          <EyeOffIcon className="size-5" strokeWidth={1.75} />
        ) : (
          <EyeIcon className="size-5" strokeWidth={1.75} />
        )}
      </button>
    </div>
  )
}

function Requirement({
  met,
  children,
}: {
  met: boolean
  children: React.ReactNode
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-1.5",
        met ? "text-[#12A633]" : "text-[#667085]"
      )}
    >
      <CheckIcon
        className={cn("size-3.5", !met && "opacity-30")}
        strokeWidth={3}
      />
      {children}
    </li>
  )
}

export function ChangePasswordModal({
  open,
  onOpenChange,
  onChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}) {
  const [current, setCurrent] = React.useState("")
  const [next, setNext] = React.useState("")
  const [confirm, setConfirm] = React.useState("")

  const longEnough = next.length >= 8
  const hasNumber = /\d/.test(next)
  const matches = next !== "" && next === confirm
  const canSubmit = current !== "" && longEnough && hasNumber && matches
  const changePassword = useChangePassword()

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Change password"
      description="Use at least 8 characters, including a number."
      submitLabel="Update password"
      canSubmit={canSubmit}
      pending={changePassword.isPending}
      onSubmit={() =>
        changePassword.mutate(
          {
            currentPassword: current,
            newPassword: next,
            confirmPassword: confirm,
          },
          { onSuccess: onChanged }
        )
      }
    >
      <Field id="current-password" label="Current password">
        <PasswordInput
          id="current-password"
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
        />
      </Field>
      <Field id="new-password" label="New password">
        <PasswordInput
          id="new-password"
          value={next}
          onChange={setNext}
          autoComplete="new-password"
        />
      </Field>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-live="polite">
        <Requirement met={longEnough}>8+ characters</Requirement>
        <Requirement met={hasNumber}>A number</Requirement>
      </ul>
      <Field id="confirm-password" label="Confirm new password">
        <PasswordInput
          id="confirm-password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
      </Field>
      {confirm !== "" && !matches && (
        <p role="alert" className="text-sm text-destructive">
          Passwords don’t match.
        </p>
      )}
    </ModalShell>
  )
}

export function ChangePinModal({
  open,
  onOpenChange,
  onChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}) {
  const [current, setCurrent] = React.useState("")
  const [next, setNext] = React.useState("")
  const [confirm, setConfirm] = React.useState("")

  const complete =
    current.length === 4 && next.length === 4 && confirm.length === 4
  const matches = next === confirm
  const canSubmit = complete && matches && next !== current

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Change transaction PIN"
      description="Your 4-digit PIN authorises moves and payouts."
      submitLabel="Update PIN"
      canSubmit={canSubmit}
      onSubmit={() => {
        // TODO: update via the API.
        onChanged()
      }}
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#344054]">Current PIN</p>
        <OtpInput
          length={4}
          mask
          label="Current PIN"
          value={current}
          onChange={setCurrent}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#344054]">New PIN</p>
        <OtpInput
          length={4}
          mask
          label="New PIN"
          value={next}
          onChange={setNext}
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#344054]">Confirm new PIN</p>
        <OtpInput
          length={4}
          mask
          label="Confirm new PIN"
          value={confirm}
          onChange={setConfirm}
        />
      </div>
      {complete && !matches && (
        <p role="alert" className="text-center text-sm text-destructive">
          The new PINs don’t match.
        </p>
      )}
      {complete && matches && next === current && (
        <p role="alert" className="text-center text-sm text-destructive">
          Choose a PIN different from your current one.
        </p>
      )}
    </ModalShell>
  )
}

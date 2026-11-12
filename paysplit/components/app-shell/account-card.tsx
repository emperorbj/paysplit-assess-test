"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { XIcon } from "lucide-react"

import { UserAvatar } from "@/components/app-shell/user-avatar"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { CopyButton } from "@/components/ui/copy-button"
import { ModalDivider } from "@/components/ui/modal"
import { Skeleton } from "@/components/ui/skeleton"
import { useLogout, useMe } from "@/hooks/auth/use-auth"
import { useSalaryAccount } from "@/hooks/salary-account/use-salary-account"
import { fullName, tierFor } from "@/lib/auth/user"

/**
 * The user's account summary plus Log Out / View Profile. Rendered in the
 * header popover and the "View Account Details" modal.
 */
export function AccountCard({
  onClose,
  onSignOut,
}: {
  onClose: () => void
  /** Called when "Log Out" is pressed; the owner shows <SignOutDialog />. */
  onSignOut: () => void
}) {
  const router = useRouter()
  const { data } = useMe()
  const user = data?.user
  // The dedicated salary account is issued after KYC approval.
  const salary = useSalaryAccount().data
  const accounts = salary?.accounts?.length
    ? salary.accounts
    : salary?.accountNumber
      ? [
          {
            accountNumber: salary.accountNumber,
            accountName: salary.accountName,
            bankName: salary.bankName ?? "—",
          },
        ]
      : []

  return (
    <>
      <div className="flex items-center gap-3 px-6 pt-6">
        {user ? (
          <UserAvatar user={user} />
        ) : (
          <Skeleton className="size-10 rounded-full" />
        )}
        <div className="min-w-0 flex-1">
          {user ? (
            <>
              <p className="truncate text-lg font-semibold text-ink">
                {fullName(user)}
              </p>
              <p className="truncate text-xs text-[#667085]">
                Tier {tierFor(user)} · {user.email}
              </p>
            </>
          ) : (
            <>
              <Skeleton className="h-6 w-36" />
              <Skeleton className="mt-1.5 h-3 w-24" />
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1 text-[#667085] transition hover:bg-muted hover:text-ink"
        >
          <XIcon className="size-6" strokeWidth={1.75} />
        </button>
      </div>

      <ModalDivider className="my-4" />

      {accounts.length > 0 ? (
        <div className="max-h-[40svh] divide-y divide-line overflow-y-auto px-6">
          {accounts.map((account) => (
            <dl
              key={account.accountNumber}
              className="space-y-3 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <dt className="flex items-center justify-between text-sm text-[#667085]">
                  Account Number:
                  <CopyButton
                    value={account.accountNumber}
                    label="Copy account number"
                    className="text-[#009933] hover:bg-success-50"
                  />
                </dt>
                <dd className="text-2xl tracking-wide text-ink">
                  {account.accountNumber}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[#667085]">Account Name:</dt>
                <dd className="text-base text-ink">{account.accountName}</dd>
              </div>
              <div>
                <dt className="text-sm text-[#667085]">Bank Name:</dt>
                <dd className="text-base text-ink">{account.bankName}</dd>
              </div>
            </dl>
          ))}
        </div>
      ) : (
        <div className="mx-6 rounded-xl bg-brand-50 p-4 text-sm text-[#344054]">
          Your dedicated PaySplit account number is issued once your identity is
          verified.
          <button
            type="button"
            onClick={() => {
              onClose()
              router.push("/kyc")
            }}
            className="mt-2 block font-medium text-brand hover:underline"
          >
            Complete KYC →
          </button>
        </div>
      )}

      <ModalDivider className="my-5" />

      <div className="grid grid-cols-2 gap-3 px-6 pb-6">
        <Button
          variant="outline"
          size="xl"
          className="border-input text-[#344054]"
          onClick={onSignOut}
        >
          Log Out
        </Button>
        <Button
          size="xl"
          onClick={() => {
            onClose()
            router.push("/profile")
          }}
        >
          View Profile
        </Button>
      </div>
    </>
  )
}

export function SignOutDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const logout = useLogout()
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Sign out of Paysplit?"
      description="If you sign out you’ll need to sign in again to access your account."
      confirmLabel={logout.isPending ? "Signing out…" : "Sign out"}
      onConfirm={() => {
        if (!logout.isPending) logout.mutate()
      }}
    />
  )
}

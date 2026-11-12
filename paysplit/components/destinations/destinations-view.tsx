"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PlusIcon } from "lucide-react"

import type { RecipientFormValue } from "@/components/forms/recipient-fields"
import {
  toWalletDto,
  type WalletFormValue,
} from "@/components/forms/wallet-fields"
import { BeneficiaryTable } from "@/components/destinations/beneficiary-table"
import {
  BeneficiaryFormModal,
  WalletFormModal,
} from "@/components/destinations/destination-modals"
import { WalletCarousel } from "@/components/destinations/wallet-carousel"
import { WalletActivityTable } from "@/components/destinations/wallet-activity-tables"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { SegmentedTabs } from "@/components/ui/segmented-tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useCreateWallet, useWallets } from "@/hooks/wallets/use-wallets"
import { errorMessage } from "@/lib/api/errors"
import type { Beneficiary } from "@/lib/destinations"

export type DestinationsTab = "wallets" | "beneficiaries"

const TABS = [
  { id: "wallets", label: "Wallets" },
  { id: "beneficiaries", label: "Beneficiary" },
] as const

export function toRecipientForm(b: Beneficiary): RecipientFormValue {
  return {
    bank: b.bank,
    accountNumber: b.accountNumber,
    accountName: b.name,
    category: b.category,
    narration: b.narration,
  }
}

/**
 * Wallets / Beneficiary tabs. Wallets come from the API.
 * TODO: beneficiaries are still local mock state (integrate /beneficiaries next).
 */
export function DestinationsView({
  initialTab,
  initialBeneficiaries,
}: {
  initialTab: DestinationsTab
  initialBeneficiaries: Beneficiary[]
}) {
  const router = useRouter()
  const [tab, setTab] = React.useState<DestinationsTab>(initialTab)
  const createWalletMutation = useCreateWallet()
  const [beneficiaries, setBeneficiaries] = React.useState(initialBeneficiaries)

  // `formKey` remounts the modal so each opening starts from fresh values.
  const [walletModal, setWalletModal] = React.useState({
    open: false,
    formKey: 0,
  })
  const [beneficiaryModal, setBeneficiaryModal] = React.useState<{
    open: boolean
    formKey: number
    editing: Beneficiary | null
  }>({ open: false, formKey: 0, editing: null })
  const [deleting, setDeleting] = React.useState<Beneficiary | null>(null)

  const changeTab = (next: DestinationsTab) => {
    setTab(next)
    router.replace(
      next === "wallets" ? "/destinations" : "/destinations?tab=beneficiaries",
      {
        scroll: false,
      }
    )
  }

  const createWallet = (
    value: WalletFormValue,
    then?: (walletId: string) => void
  ) =>
    createWalletMutation.mutate(toWalletDto(value), {
      onSuccess: (wallet) => {
        setWalletModal((m) => ({ ...m, open: false }))
        then?.(wallet.id)
      },
    })

  const saveBeneficiary = (value: RecipientFormValue) => {
    const editing = beneficiaryModal.editing
    if (editing) {
      setBeneficiaries((prev) =>
        prev.map((b) =>
          b.id === editing.id
            ? {
                ...b,
                name: value.accountName,
                bank: value.bank,
                accountNumber: value.accountNumber,
                category: value.category,
                narration: value.narration,
              }
            : b
        )
      )
    } else {
      setBeneficiaries((prev) => [
        ...prev,
        {
          id: `b${Date.now()}`,
          name: value.accountName,
          bank: value.bank,
          accountNumber: value.accountNumber,
          category: value.category,
          narration: value.narration,
          nextSplit: null,
          status: "active",
          totalAllocated: 0,
          rule: null,
        },
      ])
    }
    setBeneficiaryModal((m) => ({ ...m, open: false }))
  }

  return (
    <div className="mx-2 rounded-[32px] border border-line bg-white p-2 sm:mx-5 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-1 pb-4 sm:px-4">
        <SegmentedTabs
          label="Destination type"
          options={TABS}
          value={tab}
          onChange={changeTab}
          className="p-1.5"
        />
        {tab === "wallets" ? (
          <Button
            size="lg"
            className="h-10 px-4"
            onClick={() =>
              setWalletModal((m) => ({ open: true, formKey: m.formKey + 1 }))
            }
          >
            <PlusIcon className="size-4" strokeWidth={2} />
            Create Wallet
          </Button>
        ) : (
          <Button
            size="lg"
            className="h-10 px-4"
            onClick={() =>
              setBeneficiaryModal((m) => ({
                open: true,
                formKey: m.formKey + 1,
                editing: null,
              }))
            }
          >
            <PlusIcon className="size-4" strokeWidth={2} />
            Add beneficiary
          </Button>
        )}
      </div>

      {tab === "wallets" ? (
        <div className="space-y-6">
          <WalletsSection />
          <WalletActivityTable />
        </div>
      ) : (
        <BeneficiaryTable
          beneficiaries={beneficiaries}
          onEdit={(b) =>
            setBeneficiaryModal((m) => ({
              open: true,
              formKey: m.formKey + 1,
              editing: b,
            }))
          }
          onDelete={setDeleting}
        />
      )}

      <WalletFormModal
        key={`wallet-${walletModal.formKey}`}
        open={walletModal.open}
        onOpenChange={(open) => setWalletModal((m) => ({ ...m, open }))}
        pending={createWalletMutation.isPending}
        onSave={(value) => createWallet(value)}
        onSaveAndCreateRule={(value) =>
          createWallet(value, (id) =>
            router.push(`/split-rules?new=1&wallet=${id}`)
          )
        }
      />
      <BeneficiaryFormModal
        key={`beneficiary-${beneficiaryModal.formKey}`}
        open={beneficiaryModal.open}
        onOpenChange={(open) => setBeneficiaryModal((m) => ({ ...m, open }))}
        initialValue={
          beneficiaryModal.editing
            ? toRecipientForm(beneficiaryModal.editing)
            : undefined
        }
        onSave={saveBeneficiary}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "beneficiary"}?`}
        description="Splits to this beneficiary will stop and any linked rule will be removed. This can’t be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          setBeneficiaries((prev) => prev.filter((b) => b.id !== deleting?.id))
          setDeleting(null)
        }}
      />
    </div>
  )
}

/** Wallet cards from GET /wallets, with a matching skeleton row while loading. */
function WalletsSection() {
  const wallets = useWallets()

  if (wallets.isPending) {
    return (
      <div
        aria-label="Loading wallets"
        className="flex gap-4 overflow-hidden pb-2"
      >
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="flex w-[calc((100%-3rem)/4)] min-w-[280px] shrink-0 flex-col rounded-[20px] bg-[#F8F8F8] p-5"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="size-11 rounded-[10px]" />
              <div className="flex-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-1.5 h-3 w-16" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="mt-6 h-3 w-full" />
            <Skeleton className="mt-2 h-5 w-full rounded-full" />
            <Skeleton className="mt-8 h-4 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (wallets.isError) {
    return (
      <div
        role="alert"
        className="rounded-[20px] border border-line px-6 py-12 text-center"
      >
        <p className="text-lg font-medium text-ink">
          Couldn’t load your wallets
        </p>
        <p className="mt-1 text-sm text-[#667085]">
          {errorMessage(wallets.error)}
        </p>
        <Button
          size="lg"
          className="mt-4 h-10 px-4 text-sm"
          onClick={() => void wallets.refetch()}
        >
          Try again
        </Button>
      </div>
    )
  }

  if (wallets.data.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-line px-6 py-14 text-center">
        <p className="text-xl font-medium text-ink">No wallet yet</p>
        <p className="mt-2 text-sm text-ink">
          Create a wallet to start setting money aside from every salary.
        </p>
      </div>
    )
  }

  return <WalletCarousel wallets={wallets.data} />
}

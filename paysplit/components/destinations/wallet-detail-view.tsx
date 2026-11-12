"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, PencilLineIcon, Trash2Icon } from "lucide-react"

import { PageHeading } from "@/components/app-shell/page-heading"
import {
  MoveFundsModal,
  WalletFormModal,
} from "@/components/destinations/destination-modals"
import { LinkedRuleCard } from "@/components/destinations/linked-rule-card"
import { WalletHistoryTable } from "@/components/destinations/wallet-activity-tables"
import {
  toWalletDto,
  walletToFormValue,
} from "@/components/forms/wallet-fields"
import { SplitActivityIcon } from "@/components/icons/vuesax"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { GoalProgress } from "@/components/ui/goal-progress"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard, StatFooter, StatValue } from "@/components/ui/stat-card"
import {
  useDeleteWallet,
  useMoveWalletFunds,
  useUpdateWallet,
  useWallet,
} from "@/hooks/wallets/use-wallets"
import { errorMessage, toApiError } from "@/lib/api/errors"
import type { LinkedRule } from "@/lib/destinations"
import { formatNaira } from "@/lib/finance"
import { koboToNaira, nairaToKobo } from "@/lib/money"
import type { SplitRule } from "@/types/api/split-rules"
import type { WalletDetail } from "@/types/api/wallets"

const CONTAINER =
  "mx-2 rounded-[32px] border border-line bg-white p-2 sm:mx-5 sm:p-4"

function toLinkedRule(rule: SplitRule | null): LinkedRule | null {
  if (!rule) return null
  return {
    id: rule.id,
    method: rule.method,
    // Fixed values are kobo; percentages are plain percent.
    value:
      rule.method === "fixed" ? (koboToNaira(rule.value) ?? 0) : rule.value,
    lastModified: rule.updatedAt,
  }
}

export function WalletDetailView({ walletId }: { walletId: string }) {
  const wallet = useWallet(walletId)

  if (wallet.isPending) return <WalletDetailSkeleton />

  if (wallet.isError) {
    const notFound = toApiError(wallet.error).status === 404
    return (
      <main className="pb-6">
        <WalletHeading name={notFound ? "Not found" : "Wallet"} />
        <div role="alert" className={`${CONTAINER} px-6 py-16 text-center`}>
          <p className="text-lg font-medium text-ink">
            {notFound
              ? "This wallet doesn’t exist"
              : "Couldn’t load this wallet"}
          </p>
          <p className="mt-1 text-sm text-[#667085]">
            {notFound
              ? "It may have been deleted."
              : errorMessage(wallet.error)}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button
              variant="outline"
              size="lg"
              className="h-10 px-4 text-sm"
              nativeButton={false}
              render={<Link href="/destinations" />}
            >
              Back to wallets
            </Button>
            {!notFound && (
              <Button
                size="lg"
                className="h-10 px-4 text-sm"
                onClick={() => void wallet.refetch()}
              >
                Try again
              </Button>
            )}
          </div>
        </div>
      </main>
    )
  }

  return <WalletDetailLoaded wallet={wallet.data} />
}

function WalletHeading({ name }: { name: string }) {
  return (
    <PageHeading
      title="Destinations"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Destinations", href: "/destinations" },
        { label: name },
      ]}
    />
  )
}

function WalletDetailLoaded({ wallet }: { wallet: WalletDetail }) {
  const router = useRouter()
  const [editing, setEditing] = React.useState({ open: false, formKey: 0 })
  const [moving, setMoving] = React.useState({ open: false, formKey: 0 })
  const [deleting, setDeleting] = React.useState(false)

  const update = useUpdateWallet(wallet.id)
  const move = useMoveWalletFunds(wallet.id)
  const remove = useDeleteWallet()

  const available = koboToNaira(wallet.stats.availableBalance) ?? 0

  return (
    <main className="pb-6">
      <WalletHeading name={wallet.name} />
      <div className={CONTAINER}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-1 pb-4 sm:px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/destinations"
              aria-label="Back to destinations"
              className="grid size-9 place-items-center rounded-md text-ink transition hover:bg-muted"
            >
              <ArrowLeftIcon className="size-5" strokeWidth={1.75} />
            </Link>
            <h2 className="text-xl text-ink">{wallet.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="lg"
              className="h-10 px-3 text-sm font-normal text-[#D92D20] hover:bg-danger-50 hover:text-[#D92D20]"
              onClick={() => setDeleting(true)}
            >
              <Trash2Icon className="size-4" strokeWidth={1.75} />
              Delete
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="h-10 px-3 text-sm font-normal"
              onClick={() =>
                setEditing((e) => ({ open: true, formKey: e.formKey + 1 }))
              }
            >
              <PencilLineIcon className="size-4" strokeWidth={1.75} />
              Edit Wallet
            </Button>
            <Button
              size="lg"
              className="h-10 px-4 text-sm font-normal"
              disabled={available <= 0}
              onClick={() =>
                setMoving((m) => ({ open: true, formKey: m.formKey + 1 }))
              }
            >
              <SplitActivityIcon className="size-5 text-white [&_rect]:opacity-0" />
              Move
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Available Balance">
            <StatValue>{formatNaira(available)}</StatValue>
            <StatFooter left="Available in wallet" />
          </StatCard>
          <StatCard title="Total Allocated">
            <StatValue>
              {formatNaira(koboToNaira(wallet.stats.totalAllocated) ?? 0)}
            </StatValue>
            <StatFooter left="Cumulative salary split" />
          </StatCard>
          <StatCard title="Total Moved back">
            <StatValue>
              {formatNaira(koboToNaira(wallet.stats.totalMovedBack) ?? 0)}
            </StatValue>
            <StatFooter left="Transferred to main salary" />
          </StatCard>
          <StatCard title="Goal Progress Target">
            <GoalProgress
              className="mt-auto pt-6"
              target={koboToNaira(wallet.targetAmount)}
              percent={
                wallet.targetAmount === null ? null : wallet.progressPercent
              }
            />
          </StatCard>
        </div>

        <h3 className="mt-6 mb-3 px-4 text-lg text-ink">Linked Rule</h3>
        <LinkedRuleCard
          rule={toLinkedRule(wallet.linkedRule)}
          createHref={`/split-rules?new=1&wallet=${wallet.id}`}
        />

        <WalletHistoryTable className="mt-4" walletId={wallet.id} />
      </div>

      <WalletFormModal
        key={`edit-${editing.formKey}`}
        open={editing.open}
        onOpenChange={(open) => setEditing((e) => ({ ...e, open }))}
        initialValue={walletToFormValue(wallet)}
        pending={update.isPending}
        onSave={(value) =>
          update.mutate(toWalletDto(value), {
            onSuccess: () => setEditing((e) => ({ ...e, open: false })),
          })
        }
      />
      <MoveFundsModal
        key={`move-${moving.formKey}`}
        open={moving.open}
        onOpenChange={(open) => setMoving((m) => ({ ...m, open }))}
        walletName={wallet.name}
        available={available}
        pending={move.isPending}
        onMove={(amount) =>
          move.mutate(nairaToKobo(amount) ?? 0, {
            onSuccess: () => setMoving((m) => ({ ...m, open: false })),
          })
        }
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete “${wallet.name}”?`}
        description="Its split rule is deleted too. Only empty wallets can be deleted — move any balance back to your salary account first."
        confirmLabel={remove.isPending ? "Deleting…" : "Delete"}
        destructive
        onConfirm={() =>
          remove.mutate(wallet.id, {
            onSuccess: () => router.push("/destinations"),
            onSettled: () => setDeleting(false),
          })
        }
      />
    </main>
  )
}

/** Mirrors the wallet page: header row, four stat cards, linked rule, history table. */
export function WalletDetailSkeleton() {
  return (
    <main className="pb-6" aria-label="Loading wallet">
      <WalletHeading name="…" />
      <div className={CONTAINER}>
        <div className="flex items-center justify-between px-2 pt-1 pb-4 sm:px-4">
          <Skeleton className="h-7 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 rounded-[10px]" />
            <Skeleton className="h-10 w-28 rounded-[10px]" />
            <Skeleton className="h-10 w-24 rounded-[10px]" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex min-h-[160px] flex-col rounded-[20px] bg-linear-to-b from-brand-50 to-white/0 p-5"
            >
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-auto h-8 w-40" />
              <Skeleton className="mt-2 h-4 w-28" />
            </div>
          ))}
        </div>
        <Skeleton className="mx-4 mt-6 mb-3 h-6 w-28" />
        <Skeleton className="h-[86px] w-full rounded-[20px]" />
        <div className="mt-4 rounded-[20px] border border-line bg-[#F8F8F8] p-2">
          <Skeleton className="m-4 h-6 w-56" />
          <div className="space-y-px overflow-hidden rounded-[20px] border border-line bg-white">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-6 px-5 py-3.5">
                <Skeleton className="size-4" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

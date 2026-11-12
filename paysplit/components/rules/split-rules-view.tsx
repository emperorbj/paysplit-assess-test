"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PlusIcon } from "lucide-react"

import { PageHeading } from "@/components/app-shell/page-heading"
import {
  emptyRule,
  ruleToFormValue,
  toRuleDto,
  type DestinationOption,
  type RuleDestinationType,
  type RuleFormValue,
} from "@/components/forms/rule-fields"
import { AllocationSummary } from "@/components/rules/allocation-summary"
import { RuleFormModal } from "@/components/rules/rule-form-modal"
import { SplitHistory } from "@/components/rules/split-history"
import { RulesTable, type RulesFilter } from "@/components/rules/rules-table"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useCreateSplitRule,
  useDeleteSplitRule,
  useSplitRule,
  useSplitRules,
  useSplitRulesSummary,
  useUpdateSplitRule,
} from "@/hooks/split-rules/use-split-rules"
import { useRunSplit } from "@/hooks/split-runs/use-split-runs"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useWallets } from "@/hooks/wallets/use-wallets"
import { errorMessage } from "@/lib/api/errors"
import { formatNaira } from "@/lib/finance"
import { koboToNaira } from "@/lib/money"
import type { SplitRule } from "@/types/api/split-rules"

const PAGE_SIZE = 10

// TODO: beneficiary destinations once the beneficiaries endpoints are wired.
const BENEFICIARY_OPTIONS: DestinationOption[] = []
const EMPTY_HINT = {
  wallet: "No wallet yet — create one first",
  beneficiary: "Beneficiary payouts are coming soon",
}

type ModalState = {
  open: boolean
  /** Bumped on every open so the form remounts with fresh values. */
  formKey: number
  editing: SplitRule | null
  initial: RuleFormValue
}

export type InitialRuleModal =
  | { kind: "create"; destination: RuleDestinationType; targetId: string }
  | { kind: "edit"; ruleId: string }
  | null

const naira = (kobo: number) => koboToNaira(kobo) ?? 0

/**
 * Split Rules page: summary bar (GET /split-rules/summary), rules table
 * (GET /split-rules) and create / edit / pause / delete.
 */
export function SplitRulesView({
  initialModal,
}: {
  /** Opened from links like ?new=1&wallet=id or ?edit=ruleId */
  initialModal: InitialRuleModal
}) {
  const router = useRouter()
  const summary = useSplitRulesSummary()
  const wallets = useWallets()

  const [page, setPage] = React.useState(1)
  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState<RulesFilter>("all")
  const search = useDebouncedValue(query.trim())
  const list = useSplitRules({
    page,
    limit: PAGE_SIZE,
    status: filter,
    search: search || undefined,
  })

  const create = useCreateSplitRule()
  const update = useUpdateSplitRule()
  const toggle = useUpdateSplitRule()
  const remove = useDeleteSplitRule()
  const [busyIds, setBusyIds] = React.useState<Set<string>>(new Set())
  const [deleting, setDeleting] = React.useState<SplitRule | null>(null)
  const runSplit = useRunSplit()
  const [confirmingRun, setConfirmingRun] = React.useState(false)

  const walletOptions: DestinationOption[] = (wallets.data ?? []).map((w) => ({
    id: w.id,
    label: `${w.name} (current bal: ${formatNaira(naira(w.balance), { kobo: true })})`,
  }))

  const defaultCreate = (
    destination: RuleDestinationType = "wallet",
    targetId?: string
  ) =>
    emptyRule(
      destination,
      targetId ??
        (destination === "wallet" ? walletOptions : BENEFICIARY_OPTIONS)[0]
          ?.id ??
        ""
    )

  const [modal, setModal] = React.useState<ModalState>(() => ({
    open: initialModal?.kind === "create",
    formKey: 1,
    editing: null,
    initial:
      initialModal?.kind === "create"
        ? emptyRule(initialModal.destination, initialModal.targetId)
        : emptyRule(),
  }))

  // ?edit=id: open the editor once that rule has loaded.
  const deepLinkedRule = useSplitRule(
    initialModal?.kind === "edit" ? initialModal.ruleId : null
  )
  const [deepLinkHandled, setDeepLinkHandled] = React.useState(false)
  if (deepLinkedRule.data && !deepLinkHandled) {
    setDeepLinkHandled(true)
    setModal((m) => ({
      open: true,
      formKey: m.formKey + 1,
      editing: deepLinkedRule.data,
      initial: ruleToFormValue(deepLinkedRule.data),
    }))
  }

  const closeModal = () => {
    setModal((m) => ({ ...m, open: false }))
    if (initialModal) router.replace("/split-rules", { scroll: false })
  }

  const salary = naira(summary.data?.baselineSalary ?? 0)
  // Unallocated salary, giving back the edited rule's own planned share.
  const editingShare =
    modal.editing?.status === "active" ? modal.editing.plannedAmount : 0
  const available = naira((summary.data?.remainder ?? 0) + editingShare)

  const saveRule = (value: RuleFormValue) => {
    const dto = toRuleDto(value)
    if (modal.editing) {
      update.mutate({ id: modal.editing.id, dto }, { onSuccess: closeModal })
    } else {
      create.mutate({ ...dto, status: "active" }, { onSuccess: closeModal })
    }
  }

  const toggleStatus = (rule: SplitRule) => {
    setBusyIds((prev) => new Set(prev).add(rule.id))
    toggle.mutate(
      {
        id: rule.id,
        dto: { status: rule.status === "active" ? "paused" : "active" },
      },
      {
        onSettled: () =>
          setBusyIds((prev) => {
            const next = new Set(prev)
            next.delete(rule.id)
            return next
          }),
      }
    )
  }

  return (
    <>
      <PageHeading
        title="Split Rules"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Split Rules" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              className="h-10 px-4 text-sm"
              onClick={() => setConfirmingRun(true)}
            >
              Run Now
            </Button>
            <Button
              size="lg"
              className="h-10 px-4 text-sm"
              onClick={() =>
                setModal((m) => ({
                  open: true,
                  formKey: m.formKey + 1,
                  editing: null,
                  initial: defaultCreate(),
                }))
              }
            >
              <PlusIcon className="size-4" strokeWidth={2} />
              Add New Rule
            </Button>
          </div>
        }
      />

      <div className="mx-2 space-y-6 rounded-[32px] border border-line bg-white p-2 sm:mx-5 sm:p-4">
        {summary.data ? (
          <AllocationSummary
            salary={salary}
            segments={summary.data.segments.map((s) => ({
              id: s.ruleId,
              name: s.destinationName,
              amount: naira(s.amount),
              color: s.color,
            }))}
          />
        ) : summary.isError ? (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-[20px] bg-danger-50 px-5 py-4 text-sm"
          >
            <span>
              Couldn’t load your allocation summary.{" "}
              {errorMessage(summary.error)}
            </span>
            <Button
              size="lg"
              className="h-9 px-3 text-sm"
              onClick={() => void summary.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <AllocationSummarySkeleton />
        )}

        <RulesTable
          rules={list.data?.data ?? []}
          page={page}
          pageCount={list.data?.pagination.pages ?? 1}
          total={list.data?.pagination.total ?? 0}
          onPageChange={setPage}
          query={query}
          onQueryChange={(value) => {
            setQuery(value)
            setPage(1)
          }}
          filter={filter}
          onFilterChange={(value) => {
            setFilter(value)
            setPage(1)
          }}
          loading={list.isPending}
          error={list.isError ? errorMessage(list.error) : null}
          onRetry={() => void list.refetch()}
          busyIds={busyIds}
          onToggleStatus={toggleStatus}
          onEdit={(rule) =>
            setModal((m) => ({
              open: true,
              formKey: m.formKey + 1,
              editing: rule,
              initial: ruleToFormValue(rule),
            }))
          }
          onDelete={setDeleting}
        />

        <SplitHistory />
      </div>

      <RuleFormModal
        key={modal.formKey}
        open={modal.open}
        onOpenChange={(open) => (open ? null : closeModal())}
        mode={modal.editing ? "edit" : "create"}
        initialValue={modal.initial}
        walletOptions={walletOptions}
        beneficiaryOptions={BENEFICIARY_OPTIONS}
        emptyHint={EMPTY_HINT}
        salary={salary}
        available={available}
        pending={create.isPending || update.isPending}
        onSave={saveRule}
      />
      <ConfirmDialog
        open={confirmingRun}
        onOpenChange={setConfirmingRun}
        title="Run your split now?"
        description="Your active rules will run on your current salary account balance. Percentage rules use the whole balance, so this can move more than a normal payday."
        confirmLabel={runSplit.isPending ? "Running…" : "Run Now"}
        onConfirm={() => {
          if (runSplit.isPending) return
          runSplit.mutate(undefined, {
            onSettled: () => setConfirmingRun(false),
          })
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete “${deleting?.name ?? "rule"}”?`}
        description="This rule will stop splitting your salary from the next payday. Money already moved stays where it is."
        confirmLabel={remove.isPending ? "Deleting…" : "Delete"}
        destructive
        onConfirm={() => {
          if (!deleting) return
          remove.mutate(deleting.id, { onSettled: () => setDeleting(null) })
        }}
      />
    </>
  )
}

/** Same block sizes as AllocationSummary. */
function AllocationSummarySkeleton() {
  return (
    <div
      aria-label="Loading allocation summary"
      className="rounded-[20px] bg-linear-to-b from-brand-50 to-white/0 px-5 py-6 sm:px-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-2 h-10 w-48" />
        </div>
        <div className="flex gap-7">
          <Skeleton className="h-12 w-28" />
          <Skeleton className="h-12 w-36" />
        </div>
      </div>
      <Skeleton className="mt-8 h-5 w-64" />
      <Skeleton className="mt-3 h-6 w-full rounded-full" />
      <Skeleton className="mt-3 h-5 w-72" />
    </div>
  )
}

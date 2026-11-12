"use client"

import { ExportIcon } from "@/components/icons/vuesax"
import { Modal, ModalTitle } from "@/components/ui/modal"
import { Skeleton } from "@/components/ui/skeleton"
import { useTransaction } from "@/hooks/transactions/use-transactions"
import { downloadFile } from "@/lib/csv"
import { formatNaira } from "@/lib/finance"
import { formatTimestamp, type Transaction } from "@/lib/transactions"
import type { TransactionDetail } from "@/types/api/transactions"
import { cn } from "@/lib/utils"

export const STATUS_STYLES: Record<Transaction["status"], string> = {
  success: "bg-success-50 text-[#12A633]",
  pending: "bg-[#FFF6E5] text-[#B54708]",
  failed: "bg-danger-50 text-[#D92D20]",
  reversed: "bg-[#F2F4F7] text-[#475467]",
}

export function downloadReceipt(t: Transaction, detail?: TransactionDetail) {
  const bank = detail?.recipient?.bankName
  const account = detail?.recipient?.maskedAccountNumber
  const lines = [
    "PAYSPLIT TRANSACTION RECEIPT",
    "",
    `Settlement Reference: ${t.reference}`,
    `${t.tone === "in" ? "Received from" : "Recipient / Destination"}: ${t.counterparty}`,
    `Destination Type: ${t.counterpartyType}`,
    `Timestamp: ${formatTimestamp(t.date)}`,
    `Amount: ${formatNaira(t.amount)}`,
    `Status: ${t.status}`,
    ...(bank ? [`Bank: ${bank}${account ? ` (${account})` : ""}`] : []),
    ...(detail?.narration ? [`Narration: ${detail.narration}`] : []),
    ...(detail && detail.fee > 0
      ? [`Fee: ${formatNaira(detail.fee / 100)}`]
      : []),
  ]
  downloadFile(
    `${t.reference}.txt`,
    lines.join("\n"),
    "text/plain;charset=utf-8"
  )
}

export function TransactionDetailsModal({
  transaction,
  open,
  onOpenChange,
}: {
  /** Keep passing the last transaction while closing so the exit animation has content. */
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = transaction
  // Receipt extras (bank, narration, fee) from GET /transactions/{id}.
  const detail = useTransaction(open && t ? t.id : null)
  const bank = detail.data?.recipient?.bankName
  const account = detail.data?.recipient?.maskedAccountNumber

  return (
    <Modal
      open={open && t !== null}
      onOpenChange={onOpenChange}
      className="max-w-[480px] bg-[#F5F7FA]"
    >
      <div className="bg-white px-6 pt-6 pb-5">
        <ModalTitle className="text-lg font-medium text-ink">
          Transaction Details
        </ModalTitle>
      </div>

      {t && (
        <>
          <div className="mx-6 mt-6 bg-white">
            <div className="flex flex-col items-center border-b border-line px-6 py-6 text-center">
              <p className="text-sm text-[#475467]">
                {t.tone === "in"
                  ? "Total Received Amount"
                  : "Total Disbursed Amount"}
              </p>
              <p className="mt-1 text-[40px] leading-tight font-semibold tracking-tight text-ink">
                {formatNaira(t.amount)}
              </p>
              <span
                className={cn(
                  "mt-2 rounded-full px-2 py-1 text-xs capitalize",
                  STATUS_STYLES[t.status]
                )}
              >
                {t.status}
              </span>
            </div>
            <dl className="space-y-5 px-6 py-6 text-sm">
              <Row
                label={
                  t.tone === "in" ? "Received From" : "Recipient / Destination"
                }
                value={t.counterparty}
                strong
              />
              <Row label="Destination Type" value={t.counterpartyType} strong />
              <Row label="Timestamp" value={formatTimestamp(t.date)} />
              <Row
                label="Settlement Reference"
                value={`Ref: ${detail.data?.settlementReference ?? t.reference}`}
              />
              {detail.isPending ? (
                <Skeleton className="h-5 w-full" />
              ) : (
                <>
                  {bank && (
                    <Row
                      label="Bank"
                      value={account ? `${bank} · ${account}` : bank}
                    />
                  )}
                  {detail.data?.narration && (
                    <Row label="Narration" value={detail.data.narration} />
                  )}
                  {!!detail.data?.fee && (
                    <Row
                      label="Fee"
                      value={formatNaira(detail.data.fee / 100)}
                    />
                  )}
                </>
              )}
            </dl>
          </div>

          <div className="mt-6 flex justify-end border-t border-line bg-white px-6 py-5">
            <button
              type="button"
              onClick={() => downloadReceipt(t, detail.data)}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-base text-ink transition hover:bg-muted"
            >
              <ExportIcon className="size-4" />
              Export
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

function Row({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[#667085]">{label}</dt>
      <dd className={cn("text-right text-ink", strong && "font-semibold")}>
        {value}
      </dd>
    </div>
  )
}

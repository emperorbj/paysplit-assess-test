import { CopyButton } from "@/components/ui/copy-button"
import { cn } from "@/lib/utils"

/** Big account number with copy, followed by label/value rows. */
export function AccountDetails({
  accountNumber,
  rows,
  className,
}: {
  accountNumber: string
  rows: Array<{ label: string; value: string }>
  className?: string
}) {
  return (
    <dl
      className={cn(
        "space-y-3 rounded-[20px] border border-line bg-white p-4",
        className
      )}
    >
      <div>
        <dt className="flex items-center justify-between text-sm text-[#667085]">
          Account Number:
          <CopyButton
            value={accountNumber}
            label="Copy account number"
            className="text-ink"
          />
        </dt>
        <dd className="text-4xl tracking-tight text-ink">{accountNumber}</dd>
      </div>
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-sm text-[#667085]">{row.label}:</dt>
          <dd className="text-base text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

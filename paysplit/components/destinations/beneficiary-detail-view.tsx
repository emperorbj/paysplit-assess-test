import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { LinkedRuleCard } from "@/components/destinations/linked-rule-card"
import { TransactionsTable } from "@/components/transactions/transactions-table"
import { AccountDetails } from "@/components/ui/account-details"
import { StatCard, StatFooter, StatValue } from "@/components/ui/stat-card"
import type { Beneficiary } from "@/lib/destinations"
import type { Transaction } from "@/lib/transactions"
import { formatNaira } from "@/lib/finance"

export function BeneficiaryDetailView({
  beneficiary,
  ledger,
}: {
  beneficiary: Beneficiary
  ledger: Transaction[]
}) {
  return (
    <div className="mx-2 rounded-[32px] border border-line bg-white p-2 sm:mx-5 sm:p-4">
      <div className="flex items-center gap-3 px-2 pt-1 pb-4 sm:px-4">
        <Link
          href="/destinations?tab=beneficiaries"
          aria-label="Back to beneficiaries"
          className="grid size-9 place-items-center rounded-md text-ink transition hover:bg-muted"
        >
          <ArrowLeftIcon className="size-5" strokeWidth={1.75} />
        </Link>
        <h2 className="text-xl text-ink">{beneficiary.name}</h2>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-[20px] border border-line bg-[#F8F8F8] p-2">
          <StatCard
            title="Total Allocated"
            href={`/transactions?type=beneficiary&q=${encodeURIComponent(beneficiary.name)}`}
            className="bg-linear-to-b from-brand-50 to-[#F8F8F8]"
          >
            <StatValue>{formatNaira(beneficiary.totalAllocated)}</StatValue>
            <StatFooter left="Cumulative salary split" />
          </StatCard>

          <h3 className="px-3 text-lg text-ink">Linked Rule</h3>
          <LinkedRuleCard
            layout="stack"
            rule={beneficiary.rule}
            createHref={`/split-rules?new=1&beneficiary=${beneficiary.id}`}
          />

          <AccountDetails
            accountNumber={beneficiary.accountNumber}
            rows={[
              { label: "Account Name", value: beneficiary.name },
              { label: "Bank Name", value: beneficiary.bank },
              { label: "Category", value: beneficiary.category },
              { label: "Narration", value: beneficiary.narration || "—" },
            ]}
          />
        </aside>

        <TransactionsTable
          title="Transfer History"
          transactions={ledger}
          action="receipt"
          compact
        />
      </div>
    </div>
  )
}

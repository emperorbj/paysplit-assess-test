import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PageHeading } from "@/components/app-shell/page-heading"
import { BeneficiaryDetailView } from "@/components/destinations/beneficiary-detail-view"
import { getBeneficiary, getBeneficiaryLedger } from "@/lib/destinations"
import { toTransactions } from "@/lib/transactions"

type Props = { params: Promise<{ beneficiaryId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const beneficiary = getBeneficiary((await params).beneficiaryId)
  return { title: `${beneficiary?.name ?? "Beneficiary"} — PaySplit` }
}

export default async function BeneficiaryPage({ params }: Props) {
  const { beneficiaryId } = await params
  const beneficiary = getBeneficiary(beneficiaryId)
  if (!beneficiary) notFound()

  return (
    <main className="pb-6">
      <PageHeading
        title="Destinations"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Destinations", href: "/destinations?tab=beneficiaries" },
          { label: beneficiary.name },
        ]}
      />
      <BeneficiaryDetailView
        beneficiary={beneficiary}
        ledger={toTransactions(
          getBeneficiaryLedger(beneficiary.id),
          "beneficiary"
        )}
      />
    </main>
  )
}

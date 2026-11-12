import type { Metadata } from "next"

import { PageHeading } from "@/components/app-shell/page-heading"
import { DestinationsView } from "@/components/destinations/destinations-view"
import { getBeneficiaries } from "@/lib/destinations"

export const metadata: Metadata = { title: "Destinations — PaySplit" }

export default async function DestinationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams

  return (
    <main className="pb-6">
      <PageHeading
        title="Destinations"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Destinations" },
        ]}
      />
      <DestinationsView
        initialTab={tab === "beneficiaries" ? "beneficiaries" : "wallets"}
        // TODO: beneficiaries API; wallets load client-side from GET /wallets.
        initialBeneficiaries={getBeneficiaries()}
      />
    </main>
  )
}

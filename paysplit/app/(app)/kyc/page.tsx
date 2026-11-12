import type { Metadata } from "next"

import { PageHeading } from "@/components/app-shell/page-heading"
import { KycFlow } from "@/components/kyc/kyc-flow"

export const metadata: Metadata = { title: "Complete KYC — PaySplit" }

export default function KycPage() {
  return (
    <main className="pb-6 lg:flex lg:h-[calc(100svh-63px)] lg:flex-col lg:pb-4 short:pb-2">
      <PageHeading
        className="lg:py-4 short:py-2.5"
        title="Complete KYC"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Onboarding" },
        ]}
      />
      <KycFlow />
    </main>
  )
}

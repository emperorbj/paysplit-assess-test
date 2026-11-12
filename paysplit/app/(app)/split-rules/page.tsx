import type { Metadata } from "next"

import {
  SplitRulesView,
  type InitialRuleModal,
} from "@/components/rules/split-rules-view"

export const metadata: Metadata = { title: "Split Rules — PaySplit" }

export default async function SplitRulesPage({
  searchParams,
}: {
  // Deep links: ?new=1[&wallet=id | &beneficiary=id] or ?edit=ruleId
  searchParams: Promise<{
    new?: string
    wallet?: string
    beneficiary?: string
    edit?: string
  }>
}) {
  const params = await searchParams

  const initialModal: InitialRuleModal = params.edit
    ? { kind: "edit", ruleId: params.edit }
    : params.new
      ? {
          kind: "create",
          destination: params.beneficiary ? "beneficiary" : "wallet",
          targetId: params.beneficiary ?? params.wallet ?? "",
        }
      : null

  return (
    <main className="pb-6">
      <SplitRulesView initialModal={initialModal} />
    </main>
  )
}

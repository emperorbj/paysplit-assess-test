import type { Metadata } from "next"

import {
  TransactionsView,
  type TransactionsFilterId,
} from "@/components/transactions/transactions-view"

export const metadata: Metadata = { title: "Transactions — PaySplit" }

export default async function TransactionsPage({
  searchParams,
}: {
  // Links from other pages: ?q=text, ?ref=PAY-…, ?type=wallet|beneficiary
  searchParams: Promise<{ q?: string; ref?: string; type?: string }>
}) {
  const params = await searchParams
  const initialFilter: TransactionsFilterId =
    params.type === "wallet" || params.type === "beneficiary"
      ? params.type
      : "all"

  return (
    <TransactionsView
      initialFilter={initialFilter}
      initialQuery={params.q ?? params.ref ?? ""}
    />
  )
}

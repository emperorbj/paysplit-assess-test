import type { Metadata } from "next"

import { WalletDetailView } from "@/components/destinations/wallet-detail-view"

export const metadata: Metadata = { title: "Wallet — PaySplit" }

export default async function WalletPage({
  params,
}: {
  params: Promise<{ walletId: string }>
}) {
  const { walletId } = await params
  // Loads client-side from GET /wallets/{id} (skeleton while loading, 404 state).
  return <WalletDetailView key={walletId} walletId={walletId} />
}

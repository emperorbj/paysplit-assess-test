import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import { Panel, PanelLink } from "@/components/dashboard/panel"
import { WalletTile } from "@/components/dashboard/wallet-icon"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { tint } from "@/lib/color"
import { formatNaira } from "@/lib/finance"
import { koboToNaira } from "@/lib/money"
import type { Wallet } from "@/types/api/wallets"

export function WalletsPanel({
  wallets,
  limit = 4,
  showChevron = false,
  loading = false,
  className,
}: {
  /** From GET /wallets (amounts in kobo) */
  wallets: Wallet[]
  loading?: boolean
  limit?: number
  /** Show a › on each row (profile sidebar). */
  showChevron?: boolean
  className?: string
}) {
  return (
    <Panel
      title="Wallets"
      className={className}
      action={
        <PanelLink href="/destinations" label="All wallets" showLabel={false} />
      }
    >
      {loading ? (
        <ul
          aria-label="Loading wallets"
          className="mx-2 mb-2 flex flex-col gap-1"
        >
          {Array.from({ length: Math.min(limit, 3) }, (_, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5"
            >
              <Skeleton className="size-10 rounded-lg" />
              <span className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1.5 h-3 w-20" />
              </span>
              <Skeleton className="h-5 w-24" />
            </li>
          ))}
        </ul>
      ) : wallets.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 pt-4 pb-10 text-center">
          <p className="text-xl font-medium text-ink">No wallet yet</p>
          <p className="mt-2 text-sm text-ink">
            You have no wallet to display yet.
            <br />
            Create a wallet
          </p>
          <Button
            size="sm"
            className="mt-3 h-8 px-3 text-sm"
            nativeButton={false}
            render={<Link href="/destinations" />}
          >
            Create Wallet
          </Button>
        </div>
      ) : (
        <ul className="mx-2 mb-2 flex flex-col">
          {wallets.slice(0, limit).map((wallet, index) => (
            <li
              key={wallet.id}
              // Cards overlap slightly, like a stacked deck.
              className={index > 0 ? "-mt-2" : undefined}
              style={{ zIndex: index }}
            >
              <Link
                href={`/destinations/${wallet.id}`}
                className="relative flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-[0_-4px_12px_-6px_rgba(16,24,40,0.08)] transition hover:brightness-[0.98]"
                style={{ backgroundColor: tint(wallet.accentHex) }}
              >
                <WalletTile
                  category={wallet.category.name}
                  color={wallet.accentHex}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium text-ink">
                    {wallet.name}
                  </span>
                  <span className="block text-sm text-[#475467]">
                    {wallet.category.name}
                  </span>
                </span>
                <span className="text-lg font-medium text-ink">
                  {formatNaira(koboToNaira(wallet.balance) ?? 0)}
                </span>
                {showChevron && (
                  <ChevronRightIcon
                    aria-hidden="true"
                    className="-mr-1 size-5 shrink-0 text-ink"
                    strokeWidth={1.75}
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

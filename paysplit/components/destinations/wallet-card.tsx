import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { WalletTile } from "@/components/dashboard/wallet-icon"
import { GoalProgress } from "@/components/ui/goal-progress"
import { tint } from "@/lib/color"
import { formatNaira } from "@/lib/finance"
import { koboToNaira } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { Wallet } from "@/types/api/wallets"

export function formatShortDate(iso: string) {
  return new Date(iso)
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    })
    .replace(",", "")
}

export function WalletCard({
  wallet,
  className,
}: {
  /** From GET /wallets (amounts in kobo) */
  wallet: Wallet
  className?: string
}) {
  return (
    <article
      className={cn("flex flex-col rounded-[20px] p-5", className)}
      style={{
        backgroundImage: `linear-gradient(180deg, ${tint(wallet.accentHex)} 0%, #FFFFFF 100%)`,
      }}
    >
      <div className="flex items-start gap-3">
        <WalletTile
          category={wallet.category.name}
          color={wallet.accentHex}
          className="size-11 rounded-[10px] [&_svg]:size-6"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-medium text-ink">
            {wallet.name}
          </h3>
          <p className="truncate text-xs text-[#475467]">
            {wallet.category.name}
          </p>
        </div>
        <p className="shrink-0 text-xl tracking-tight text-ink">
          {formatNaira(koboToNaira(wallet.balance) ?? 0)}
        </p>
      </div>

      <GoalProgress
        size="sm"
        className="mt-6 mb-6"
        target={koboToNaira(wallet.targetAmount)}
        percent={wallet.targetAmount === null ? null : wallet.progressPercent}
      />

      <hr className="mt-auto border-dashed border-line" />

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-[#667085]">
          Created:{" "}
          <span className="ml-1">{formatShortDate(wallet.createdAt)}</span>
        </span>
        <Link
          href={`/destinations/${wallet.id}`}
          className="flex items-center gap-1.5 text-ink transition hover:text-brand"
        >
          View wallet
          <ArrowRightIcon className="size-3.5" />
          <span className="sr-only">: {wallet.name}</span>
        </Link>
      </div>
    </article>
  )
}

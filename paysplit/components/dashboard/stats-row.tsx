"use client"

import * as React from "react"
import { ArrowUpIcon, EyeIcon, EyeOffIcon } from "lucide-react"

import { AccountCard, SignOutDialog } from "@/components/app-shell/account-card"
import { Modal } from "@/components/ui/modal"
import { StatCard, StatFooter, StatValue } from "@/components/ui/stat-card"
import { formatNaira } from "@/lib/finance"
import { fullName, isKycDone } from "@/lib/auth/user"
import { koboToNaira } from "@/lib/money"
import { maskAccountNumber } from "@/lib/session"
import type { User } from "@/types/api/auth"
import type { DashboardSummary } from "@/types/api/dashboard"
import { cn } from "@/lib/utils"

export function StatsRow({
  summary,
  user,
}: {
  /** GET /dashboard/summary */
  summary: DashboardSummary
  user: User
}) {
  const [hidden, setHidden] = React.useState(false)
  const [showAccount, setShowAccount] = React.useState(false)
  const [signingOut, setSigningOut] = React.useState(false)
  const { splitAllocation, nextSplitRun, salaryAccount, wallets } = summary
  const hasRules = splitAllocation.activeRules > 0
  const salaryBalance = koboToNaira(salaryAccount.balance) ?? 0
  const accountNumber =
    salaryAccount.maskedAccountNumber ??
    (salaryAccount.accountNumber
      ? maskAccountNumber(salaryAccount.accountNumber)
      : null)
  const totalInWallets = koboToNaira(wallets.total) ?? 0

  return (
    <div className="grid gap-4 px-4 pt-6 sm:px-9 sm:pt-9 xl:grid-cols-[minmax(0,1fr)_minmax(0,939px)] xl:items-center">
      <div>
        <p className="text-base text-ink">Salary Account Balance</p>
        <div className="mt-2 flex items-center gap-4">
          <p className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            {hidden
              ? "₦••••••"
              : formatNaira(salaryBalance, { kobo: salaryBalance === 0 })}
          </p>
          <button
            type="button"
            onClick={() => setHidden((v) => !v)}
            aria-label={hidden ? "Show balance" : "Hide balance"}
            aria-pressed={hidden}
            className="rounded-md p-1 text-ink transition hover:bg-muted"
          >
            {hidden ? (
              <EyeOffIcon className="size-7" strokeWidth={1.5} />
            ) : (
              <EyeIcon className="size-7" strokeWidth={1.5} />
            )}
          </button>
        </div>
        <p className="mt-3 text-sm text-[#475467]">
          {isKycDone(user.kycStatus) && accountNumber && `${accountNumber} `}
          {fullName(user)}
          <button
            type="button"
            onClick={() => setShowAccount(true)}
            className="ml-3 text-brand underline underline-offset-4 hover:text-brand/80"
          >
            View Account Details
          </button>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Split Allocation" href="/split-rules">
          <StatValue>
            {formatNaira(koboToNaira(splitAllocation.amount) ?? 0)}
          </StatValue>
          <StatFooter
            left={
              hasRules
                ? `${splitAllocation.activeRules} Split running`
                : "No set rule"
            }
            right={
              <span className="flex items-center gap-1 text-[#12A633]">
                <ArrowUpIcon className="size-4" strokeWidth={2} />
                {hasRules
                  ? `${splitAllocation.percentOfSalary}% of Salary`
                  : "-"}
              </span>
            }
          />
        </StatCard>
        <StatCard title="Total in Wallets" href="/destinations">
          <StatValue>{formatNaira(totalInWallets)}</StatValue>
          <StatFooter
            left={`${wallets.activeCount} Active wallets`}
            right={
              <span className="text-ink">
                {wallets.activeCount > 0
                  ? `${wallets.withTargetCount} Target wallets`
                  : "No wallet created"}
              </span>
            }
          />
        </StatCard>
        <StatCard title="Expected Next Split Run" href="/split-rules">
          <StatValue>
            {nextSplitRun.date
              ? new Date(nextSplitRun.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })
              : "-"}
          </StatValue>
          <StatFooter
            left="Fund Status:"
            right={
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  nextSplitRun.fundStatus === "available"
                    ? "bg-success-50 text-[#12A633]"
                    : "bg-danger-50 text-[#D92D20]"
                )}
              >
                {nextSplitRun.fundStatus === "available"
                  ? "Available"
                  : "Unavailable"}
              </span>
            }
          />
        </StatCard>
      </div>

      <Modal
        open={showAccount}
        onOpenChange={setShowAccount}
        className="max-w-[380px]"
        showClose={false}
      >
        <AccountCard
          onClose={() => setShowAccount(false)}
          onSignOut={() => {
            setShowAccount(false)
            setSigningOut(true)
          }}
        />
      </Modal>
      <SignOutDialog open={signingOut} onOpenChange={setSigningOut} />
    </div>
  )
}

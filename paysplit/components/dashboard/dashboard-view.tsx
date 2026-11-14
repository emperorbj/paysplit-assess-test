"use client"

import { CashFlowChart } from "@/components/dashboard/cash-flow-chart"
import { DashboardHero } from "@/components/dashboard/dashboard-hero"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { OnboardingBanner } from "@/components/dashboard/onboarding-banner"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { SalaryIdentityPrompt } from "@/components/dashboard/salary-identity-prompt"
import { SalaryPartition } from "@/components/dashboard/salary-partition"
import { StatsRow } from "@/components/dashboard/stats-row"
import { WalletsPanel } from "@/components/dashboard/wallets-panel"
import { SetupLauncher } from "@/components/setup/setup-launcher"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useMe } from "@/hooks/auth/use-auth"
import {
  useCashFlow,
  useDashboardSummary,
} from "@/hooks/dashboard/use-dashboard"
import { useNotifications } from "@/hooks/notifications/use-notifications"
import { useWallets } from "@/hooks/wallets/use-wallets"
import { errorMessage } from "@/lib/api/errors"
import { onboardingChecklist } from "@/lib/auth/user"
import { toCashFlow, toPartition } from "@/lib/dashboard"
import { toHeroNotifications } from "@/lib/notifications"

const EMPTY_CASH_FLOW = { total: 0, change: null, points: [] }

/**
 * Dashboard body: GET /auth/me (user), /dashboard/summary (balances, stats,
 * partition, onboarding), /dashboard/cash-flow (chart), /transactions?limit=5
 * (recent activity), /wallets (wallets panel) and /notifications (hero cards).
 */
export function DashboardView({ openSetup }: { openSetup: boolean }) {
  const me = useMe()
  const summary = useDashboardSummary()
  const cashFlow = useCashFlow({})
  const wallets = useWallets()
  const notifications = useNotifications()

  if (me.isPending || summary.isPending) return <DashboardSkeleton />

  const failed = me.isError ? me : summary.isError ? summary : null
  if (failed) {
    return (
      <div
        role="alert"
        className="mx-5 mt-10 rounded-[20px] border border-line bg-white px-6 py-16 text-center"
      >
        <p className="text-lg font-medium text-ink">
          We couldn’t load your dashboard
        </p>
        <p className="mt-1 text-sm text-[#667085]">
          {errorMessage(failed.error)}
        </p>
        <Button
          size="lg"
          className="mt-5 h-10 px-4 text-sm"
          onClick={() => {
            void me.refetch()
            void summary.refetch()
          }}
        >
          Try again
        </Button>
      </div>
    )
  }

  const user = me.data!.user
  const data = summary.data!
  const checklist = onboardingChecklist(data.onboarding)
  const onboardingComplete =
    checklist.signup && checklist.kyc && checklist.setup

  return (
    <main className="pb-6">
      <DashboardHero
        firstName={user.firstName}
        notifications={toHeroNotifications(notifications.data?.data ?? [])}
        hasActivity={
          (cashFlow.data?.totals.inflow ?? 0) > 0 || data.wallets.total > 0
        }
        simulation={
          data.salaryAccount.status === "active"
            ? {
                defaultAmount: data.income?.monthlyAmount ?? null,
                defaultSender: data.income?.employerName ?? null,
              }
            : undefined
        }
      />

      {!onboardingComplete && <OnboardingBanner onboarding={checklist} />}
      <SalaryIdentityPrompt />

      <StatsRow summary={data} user={user} />

      <div className="mx-2 mt-6 grid gap-4 rounded-[32px] border border-line bg-white p-2 sm:mx-5 sm:p-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 px-3 pt-4 pb-2 sm:px-5">
          {cashFlow.isPending ? (
            <div aria-label="Loading cash flow" className="space-y-4">
              <Skeleton className="h-6 w-80" />
              <Skeleton className="h-10 w-56" />
              <Skeleton className="h-[300px] w-full rounded-[12px]" />
            </div>
          ) : (
            <CashFlowChart
              cashFlow={
                cashFlow.data ? toCashFlow(cashFlow.data) : EMPTY_CASH_FLOW
              }
            />
          )}
        </div>
        <SalaryPartition partition={toPartition(data)} />
        <RecentActivity />
        <WalletsPanel
          wallets={wallets.data ?? []}
          loading={wallets.isPending}
        />
      </div>

      <SetupLauncher initiallyOpen={openSetup} />
    </main>
  )
}

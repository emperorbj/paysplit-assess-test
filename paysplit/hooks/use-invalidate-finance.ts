"use client"

import { useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

/**
 * Money movements and rule changes touch balances, the ledger, the split
 * summary and the onboarding checklist, so refresh all of them together.
 */
export function useInvalidateFinance() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all(
      [
        queryKeys.wallets.all,
        queryKeys.dashboard.all,
        queryKeys.transactions.all,
        queryKeys.splitRules.all,
        queryKeys.splitRuns.all,
        queryKeys.salaryAccount.all,
        queryKeys.notifications.all,
        queryKeys.setup.progress(),
        queryKeys.auth.me(),
        queryKeys.users.profile(),
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey }))
    )
}

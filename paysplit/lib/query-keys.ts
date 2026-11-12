import type { CashFlowParams } from "@/types/api/dashboard"
import type { NotificationsParams } from "@/types/api/notifications"
import type { SplitRunsParams } from "@/types/api/split-runs"
import type { SplitRulesParams } from "@/types/api/split-rules"
import type { TransactionsParams } from "@/types/api/transactions"
import type {
  WalletActivityParams,
  WalletTransactionsParams,
} from "@/types/api/wallets"

/** All TanStack Query keys, so invalidation stays consistent. */
export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    me: () => [...queryKeys.auth.all, "me"] as const,
  },
  kyc: {
    all: ["kyc"] as const,
    countries: () => [...queryKeys.kyc.all, "countries"] as const,
    status: () => [...queryKeys.kyc.all, "status"] as const,
  },
  users: {
    all: ["users"] as const,
    profile: () => [...queryKeys.users.all, "profile"] as const,
    notificationPreferences: () =>
      [...queryKeys.users.all, "notification-preferences"] as const,
  },
  setup: {
    all: ["setup"] as const,
    income: () => [...queryKeys.setup.all, "income"] as const,
    progress: () => [...queryKeys.setup.all, "progress"] as const,
  },
  categories: () => ["categories"] as const,
  salaryAccount: {
    all: ["salary-account"] as const,
    detail: () => [...queryKeys.salaryAccount.all, "detail"] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (params: NotificationsParams) =>
      [...queryKeys.notifications.all, "list", params] as const,
  },
  splitRuns: {
    all: ["split-runs"] as const,
    list: (params: SplitRunsParams) =>
      [...queryKeys.splitRuns.all, "list", params] as const,
    detail: (id: string) => [...queryKeys.splitRuns.all, "detail", id] as const,
  },
  wallets: {
    all: ["wallets"] as const,
    list: () => [...queryKeys.wallets.all, "list"] as const,
    accentColors: () => [...queryKeys.wallets.all, "accent-colors"] as const,
    activity: (params: WalletActivityParams) =>
      [...queryKeys.wallets.all, "activity", params] as const,
    detail: (id: string) => [...queryKeys.wallets.all, "detail", id] as const,
    transactions: (id: string, params: WalletTransactionsParams) =>
      [...queryKeys.wallets.all, "transactions", id, params] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    summary: () => [...queryKeys.dashboard.all, "summary"] as const,
    cashFlow: (params: CashFlowParams) =>
      [...queryKeys.dashboard.all, "cash-flow", params] as const,
  },
  transactions: {
    all: ["transactions"] as const,
    list: (params: TransactionsParams) =>
      [...queryKeys.transactions.all, "list", params] as const,
    detail: (id: string) =>
      [...queryKeys.transactions.all, "detail", id] as const,
  },
  splitRules: {
    all: ["split-rules"] as const,
    summary: () => [...queryKeys.splitRules.all, "summary"] as const,
    list: (params: SplitRulesParams) =>
      [...queryKeys.splitRules.all, "list", params] as const,
    detail: (id: string) =>
      [...queryKeys.splitRules.all, "detail", id] as const,
  },
}

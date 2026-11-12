import { apiClient } from "@/lib/api/client"
import { cleanParams as clean } from "@/lib/api/params"
import type { Category, Paginated } from "@/types/api/common"
import type {
  AccentColorOption,
  CreateWalletDto,
  MoveWalletFundsDto,
  MoveWalletFundsResponse,
  UpdateWalletDto,
  Wallet,
  WalletActivityParams,
  WalletDetail,
  WalletTransactionRow,
  WalletTransactionsParams,
} from "@/types/api/wallets"

export const categoriesService = {
  /** Shared by wallets, beneficiaries and rules. Public, stable ids. */
  list: () =>
    apiClient
      .get<Category[]>("/categories", { skipAuth: true })
      .then((r) => r.data),
}

export const walletsService = {
  list: () => apiClient.get<Wallet[]>("/wallets").then((r) => r.data),

  accentColors: () =>
    apiClient
      .get<AccentColorOption[]>("/wallets/accent-colors")
      .then((r) => r.data),

  activity: (params: WalletActivityParams) =>
    apiClient
      .get<Paginated<WalletTransactionRow>>("/wallets/activity", {
        params: clean(params),
      })
      .then((r) => r.data),

  detail: (id: string) =>
    apiClient.get<WalletDetail>(`/wallets/${id}`).then((r) => r.data),

  transactions: (id: string, params: WalletTransactionsParams) =>
    apiClient
      .get<Paginated<WalletTransactionRow>>(`/wallets/${id}/transactions`, {
        params: clean(params),
      })
      .then((r) => r.data),

  create: (dto: CreateWalletDto) =>
    apiClient.post<Wallet>("/wallets", dto).then((r) => r.data),

  update: (id: string, dto: UpdateWalletDto) =>
    apiClient.patch<Wallet>(`/wallets/${id}`, dto).then((r) => r.data),

  /** 409 WALLET_NOT_EMPTY if it still holds money. */
  remove: (id: string) =>
    apiClient.delete<{ message: string }>(`/wallets/${id}`).then((r) => r.data),

  move: (id: string, dto: MoveWalletFundsDto) =>
    apiClient
      .post<MoveWalletFundsResponse>(`/wallets/${id}/move`, dto)
      .then((r) => r.data),
}

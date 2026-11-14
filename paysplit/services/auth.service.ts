import { apiClient } from "@/lib/api/client"
import { getAccessToken } from "@/lib/auth/session"
import type {
  AuthResponse,
  ChangePasswordDto,
  ChangePasswordResponse,
  LoginDto,
  MeResponse,
  MessageResponse,
  SignupDto,
} from "@/types/api/auth"

// Public auth endpoints use `skipAuth`: a 401 there means a wrong code or
// password, not an expired session.
const publicCall = { skipAuth: true } as const

export const authService = {
  /** Creates the account and signs in (no email verification step). */
  signup: (dto: SignupDto) =>
    apiClient
      .post<AuthResponse>("/auth/signup", dto, publicCall)
      .then((r) => r.data),

  login: (dto: LoginDto) =>
    apiClient
      .post<AuthResponse>("/auth/login", dto, publicCall)
      .then((r) => r.data),

  me: () => apiClient.get<MeResponse>("/auth/me").then((r) => r.data),

  /** Revokes every access token for this user. Short timeout: sign-out must not hang. */
  logout: () =>
    apiClient
      .post<MessageResponse>("/auth/logout", undefined, { timeout: 8_000 })
      .then((r) => r.data),

  /**
   * Here a 401 means a wrong current password, so `skipAuth` keeps the API
   * client from ending the session; the token is attached explicitly instead.
   */
  changePassword: (dto: ChangePasswordDto) =>
    apiClient
      .post<ChangePasswordResponse>("/auth/password/change", dto, {
        skipAuth: true,
        headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
      })
      .then((r) => r.data),
}

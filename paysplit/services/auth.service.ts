import { apiClient } from "@/lib/api/client"
import { getAccessToken } from "@/lib/auth/session"
import type {
  AuthResponse,
  ChangePasswordDto,
  ChangePasswordResponse,
  CodeSentResponse,
  LoginDto,
  MeResponse,
  MessageResponse,
  ResetPasswordDto,
  SetPasswordDto,
  SignupDto,
  VerifyCodeDto,
  VerifyEmailResponse,
} from "@/types/api/auth"

// Public auth endpoints use `skipAuth`: a 401 there means a wrong code or
// password, not an expired session.
const publicCall = { skipAuth: true } as const

export const authService = {
  signup: (dto: SignupDto) =>
    apiClient
      .post<CodeSentResponse>("/auth/signup", dto, publicCall)
      .then((r) => r.data),

  verifyEmail: (dto: VerifyCodeDto) =>
    apiClient
      .post<VerifyEmailResponse>("/auth/email/verify", dto, publicCall)
      .then((r) => r.data),

  resendEmailCode: (email: string) =>
    apiClient
      .post<CodeSentResponse>("/auth/email/resend", { email }, publicCall)
      .then((r) => r.data),

  /** Completes signup with the short-lived setup token from verifyEmail. */
  setPassword: (setupToken: string, dto: SetPasswordDto) =>
    apiClient
      .post<AuthResponse>("/auth/password/set", dto, {
        skipAuth: true,
        headers: { Authorization: `Bearer ${setupToken}` },
      })
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

  forgotPassword: (email: string) =>
    apiClient
      .post<MessageResponse>("/auth/password/forgot", { email }, publicCall)
      .then((r) => r.data),

  verifyResetCode: (dto: VerifyCodeDto) =>
    apiClient
      .post<MessageResponse>("/auth/password/verify-code", dto, publicCall)
      .then((r) => r.data),

  resetPassword: (dto: ResetPasswordDto) =>
    apiClient
      .post<MessageResponse>("/auth/password/reset", dto, publicCall)
      .then((r) => r.data),
}

import axios, { type AxiosRequestConfig } from "axios"

import { toApiError } from "@/lib/api/errors"
import { expireSession, getAccessToken } from "@/lib/auth/session"

/**
 * The one HTTP client for the PaySplit backend. Services in /services use it;
 * nothing else should call fetch or create axios instances.
 *
 * NEXT_PUBLIC_API_BASE_URL is inlined at build time (Docker build arg /
 * Cloud Build `_API_BASE_URL`). Local dev: .env.local.
 */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/+$/, "")

declare module "axios" {
  interface AxiosRequestConfig {
    /** Don't attach the stored access token (public auth endpoints, setup token). */
    skipAuth?: boolean
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { Accept: "application/json" },
})

apiClient.interceptors.request.use((config) => {
  if (!API_BASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not set. Copy .env.example to .env.local."
    )
  }
  if (!config.skipAuth && !config.headers.Authorization) {
    const token = getAccessToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error)
    const config = (error?.config ?? {}) as AxiosRequestConfig
    // An authenticated call was rejected: the session is gone or expired.
    // (Auth endpoints use skipAuth, where 401 means wrong code/password.)
    if (
      apiError.status === 401 &&
      !config.skipAuth &&
      typeof window !== "undefined"
    ) {
      expireSession()
    }
    return Promise.reject(apiError)
  }
)

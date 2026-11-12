"use client"

/**
 * Access-token storage.
 * - "Remember for 30 days" → localStorage (survives restarts)
 * - otherwise → sessionStorage (cleared when the tab closes)
 * The short-lived signup `setupToken` is never stored here; it lives in
 * component state for the few minutes the signup flow needs it.
 */

const KEY = "paysplit.session"

type StoredSession = { token: string; expiresAt: number }

const listeners = new Set<() => void>()
let cached: string | null | undefined

function read(storage: Storage): StoredSession | null {
  try {
    const raw = storage.getItem(KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as StoredSession
    if (!session.token || session.expiresAt <= Date.now()) {
      storage.removeItem(KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  if (cached !== undefined) return cached
  cached =
    (read(window.sessionStorage) ?? read(window.localStorage))?.token ?? null
  return cached
}

export function setSession(
  token: string,
  expiresInSeconds: number,
  remember: boolean
) {
  const session: StoredSession = {
    token,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  }
  try {
    window.localStorage.removeItem(KEY)
    window.sessionStorage.removeItem(KEY)
    ;(remember ? window.localStorage : window.sessionStorage).setItem(
      KEY,
      JSON.stringify(session)
    )
  } catch {
    // Storage blocked (private mode): keep the token in memory for this tab.
  }
  cached = token
  listeners.forEach((listener) => listener())
}

/** Swaps the token, keeping it in whichever storage the session already uses. */
export function replaceAccessToken(token: string, expiresInSeconds: number) {
  let remember = false
  try {
    remember = window.localStorage.getItem(KEY) !== null
  } catch {
    // Storage blocked: setSession falls back to memory.
  }
  setSession(token, expiresInSeconds, remember)
}

export function clearSession() {
  try {
    window.localStorage.removeItem(KEY)
    window.sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  cached = null
  listeners.forEach((listener) => listener())
}

/** For useSyncExternalStore: re-render when the session changes (incl. other tabs). */
export function subscribeToSession(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      cached = undefined
      listener()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

/* ------------------------ Expired-session handling ------------------------ */

let onExpired: (() => void) | null = null

/** Registered by the app (components/auth/auth-gate.tsx) to redirect with the router. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onExpired = handler
}

/** Called by the API client when an authenticated request returns 401. */
export function expireSession() {
  clearSession()
  onExpired?.()
}

"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

import { useAccessToken } from "@/hooks/auth/use-auth"
import { setSessionExpiredHandler } from "@/lib/auth/session"

/**
 * Guards the signed-in area (app/(app)/layout.tsx):
 * - no stored token → open the login modal on the landing page
 * - an API call returns 401 → clear cached data and do the same, with a notice
 * Pages render their own skeletons while their queries load.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const token = useAccessToken()
  // Set when a 401 triggered the redirect, so the plain "signed out" redirect
  // below doesn't replace it (and drop the "session expired" notice).
  const expiredRef = React.useRef(false)

  React.useEffect(() => {
    setSessionExpiredHandler(() => {
      expiredRef.current = true
      queryClient.clear()
      router.replace("/?auth=login&expired=1")
    })
    return () => setSessionExpiredHandler(null)
  }, [queryClient, router])

  React.useEffect(() => {
    // `undefined` = not read yet (SSR/hydration); `null` = signed out.
    if (token === null && !expiredRef.current) router.replace("/?auth=login")
  }, [token, router, pathname])

  if (token === null) return null
  return <>{children}</>
}

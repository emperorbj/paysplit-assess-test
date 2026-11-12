"use client"

import * as React from "react"
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { Toaster } from "@/components/ui/sonner"
import { toApiError } from "@/lib/api/errors"

function makeQueryClient() {
  return new QueryClient({
    // Background/query failures: toast only the unexpected ones (network, 5xx).
    // Screens show their own inline error + Retry; 401s redirect to login.
    queryCache: new QueryCache({
      onError: (error) => {
        const apiError = toApiError(error)
        if (apiError.status === 0 || apiError.status >= 500) {
          toast.error(apiError.message, {
            id: `query-error-${apiError.status}`,
          })
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Retry once for network/server errors, never for 4xx.
        retry: (failureCount, error) => {
          const status = toApiError(error).status
          return failureCount < 1 && (status === 0 || status >= 500)
        },
      },
      mutations: { retry: false },
    },
  })
}

export function Providers({ children }: { children: React.ReactNode }) {
  // One client per browser session (useState keeps it stable across renders).
  const [queryClient] = React.useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {/* Before children: its listener must be ready before any child effect fires a toast. */}
      <Toaster />
      {children}
    </QueryClientProvider>
  )
}

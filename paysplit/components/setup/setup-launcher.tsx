"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { SetupWizard } from "@/components/setup/setup-wizard"

/**
 * Opens the salary-partition setup wizard on the dashboard when it's reached
 * via `/dashboard?setup=1` (e.g. straight after KYC).
 */
export function SetupLauncher({ initiallyOpen }: { initiallyOpen: boolean }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(initiallyOpen)

  const close = () => {
    setOpen(false)
    // Drop `?setup=1` so a refresh doesn't reopen the wizard.
    router.replace("/dashboard", { scroll: false })
  }

  return (
    <SetupWizard
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
      onComplete={() => {
        // Income, wallet and rule are saved as each step completes.
        // TODO: persist the step-3 recipient once beneficiaries are wired.
        close()
      }}
    />
  )
}

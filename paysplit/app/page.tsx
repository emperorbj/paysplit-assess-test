import type { AuthStep } from "@/components/auth/auth-dialog"
import { LandingPage } from "@/components/landing/landing-page"

const DEEP_LINKABLE_STEPS: AuthStep[] = ["login", "signup"]

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string | string[]; expired?: string }>
}) {
  const { auth, expired } = await searchParams
  const initialAuthStep =
    DEEP_LINKABLE_STEPS.find((step) => step === auth) ?? null

  return (
    <LandingPage
      initialAuthStep={initialAuthStep}
      sessionExpired={expired === "1"}
    />
  )
}

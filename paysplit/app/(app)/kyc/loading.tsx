import { KycSkeleton } from "@/components/kyc/kyc-skeleton"

export default function Loading() {
  return (
    <main className="pb-6 lg:flex lg:h-[calc(100svh-63px)] lg:flex-col lg:pb-4 short:pb-2">
      <div className="px-4 py-5 sm:px-9 lg:py-4 short:py-2.5">
        <h1 className="text-2xl text-ink">Complete KYC</h1>
        <div className="mt-2 h-5" />
      </div>
      <KycSkeleton />
    </main>
  )
}

import { Skeleton } from "@/components/ui/skeleton"

/** Mirrors KycFlow: steps panel on the left, step card on the right. */
export function KycSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading verification"
      className="mx-2 rounded-[32px] border border-line bg-white p-2 sm:mx-5 sm:p-[15px] lg:min-h-0 lg:flex-1 short:rounded-3xl short:p-2"
    >
      <div className="grid gap-4 lg:h-full lg:grid-cols-[minmax(0,492px)_minmax(0,1fr)] short:gap-2">
        {/* Steps panel */}
        <div className="flex flex-col items-center rounded-[20px] bg-linear-to-b from-[#E8F5FF] via-[#F3F9FF] to-white px-6 py-6">
          <Skeleton className="hidden size-[min(9rem,14svh)] rounded-2xl lg:block" />
          <div className="flex w-full justify-around gap-2 lg:mt-[min(3.5rem,5svh)] lg:flex-col lg:items-center lg:gap-[min(22px,2.5svh)]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="h-5 w-24 lg:h-6 lg:w-48" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-6 h-4 w-64 lg:mt-[min(58px,5svh)]" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>

        {/* Step card */}
        <div className="flex min-h-0 flex-col rounded-[20px] border border-line bg-[#F8F8F8]">
          <div className="flex h-[54px] items-center justify-between px-5 sm:px-7 short:h-11">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="mx-2 mb-2 flex flex-1 flex-col rounded-[20px] border border-line bg-white px-5 py-10 sm:px-12 lg:py-[min(4rem,5svh)] xl:px-[70px] short:py-5">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="mt-3 h-5 w-full max-w-md" />
            <div className="mt-8 space-y-6 lg:mt-[min(2.75rem,4svh)]">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-15 w-full rounded-[10px] short:h-12" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-15 w-full rounded-[10px] short:h-12" />
              </div>
            </div>
            <Skeleton className="mt-auto h-12 w-full rounded-[10px] pt-10" />
          </div>
        </div>
      </div>
    </div>
  )
}

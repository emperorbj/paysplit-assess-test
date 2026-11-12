import { Skeleton } from "@/components/ui/skeleton"

/** Mirrors the dashboard: dark hero, stats row, then chart/partition/activity/wallets grid. */
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="pb-6">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0B0B0B] md:h-[340px]">
        <div className="flex h-full flex-col justify-end gap-6 px-4 pt-14 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-9">
          <div>
            <Skeleton className="h-10 w-72 bg-white/10" />
            <Skeleton className="mt-3 h-5 w-56 bg-white/10" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-12 w-28 rounded-[10px] bg-white/10" />
            <Skeleton className="h-12 w-40 rounded-[10px] bg-white/10" />
          </div>
        </div>
      </section>

      {/* Stats row */}
      <div className="grid gap-4 px-4 pt-6 sm:px-9 sm:pt-9 xl:grid-cols-[minmax(0,1fr)_minmax(0,939px)] xl:items-center">
        <div>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-3 h-12 w-64" />
          <Skeleton className="mt-3 h-4 w-56" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex min-h-[160px] flex-col rounded-[20px] bg-linear-to-b from-brand-50 to-white/0 p-5"
            >
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-auto h-8 w-40" />
              <Skeleton className="mt-2 h-4 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="mx-2 mt-6 grid gap-4 rounded-[32px] border border-line bg-white p-2 sm:mx-5 sm:p-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="px-3 pt-4 pb-2 sm:px-5">
          <div className="flex items-start justify-between">
            <div>
              <Skeleton className="h-6 w-72" />
              <Skeleton className="mt-3 h-9 w-44" />
            </div>
            <Skeleton className="h-10 w-36 rounded-[10px]" />
          </div>
          <Skeleton className="mt-6 h-[300px] w-full rounded-xl" />
          <div className="mt-4 flex justify-between">
            {Array.from({ length: 9 }, (_, i) => (
              <Skeleton key={i} className="h-4 w-10" />
            ))}
          </div>
        </div>

        <PanelSkeleton>
          <Skeleton className="mx-auto my-6 size-[200px] rounded-full" />
          <div className="mt-auto grid grid-cols-2 gap-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        </PanelSkeleton>

        <PanelSkeleton>
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-line py-3 last:border-0"
            >
              <Skeleton className="size-4" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </PanelSkeleton>

        <PanelSkeleton>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1.5 h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </PanelSkeleton>
      </div>
    </div>
  )
}

function PanelSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-[20px] border border-line bg-[#F8F8F8]">
      <div className="flex min-h-[60px] items-center justify-between px-6 py-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="mx-2 mb-2 flex flex-1 flex-col rounded-[20px] border border-line bg-white p-5">
        {children}
      </div>
    </div>
  )
}

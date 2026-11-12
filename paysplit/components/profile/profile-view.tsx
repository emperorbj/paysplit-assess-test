"use client"

import { ProfileSettings } from "@/components/profile/profile-settings"
import { ProfileSidebar } from "@/components/profile/profile-sidebar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useKycCountries } from "@/hooks/kyc/use-kyc"
import { useProfile } from "@/hooks/users/use-profile"
import { errorMessage } from "@/lib/api/errors"

const CONTAINER =
  "mx-2 grid items-start gap-4 rounded-[32px] border border-line bg-white p-2 sm:mx-5 sm:p-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]"

export function ProfileView() {
  const me = useProfile()
  const countries = useKycCountries()

  // If the country list fails, the form still loads with the saved dial code.
  if (me.isPending || countries.isPending) return <ProfileSkeleton />

  if (me.isError) {
    return (
      <div
        role="alert"
        className="mx-5 rounded-[20px] border border-line bg-white px-6 py-16 text-center"
      >
        <p className="text-lg font-medium text-ink">
          We couldn’t load your profile
        </p>
        <p className="mt-1 text-sm text-[#667085]">{errorMessage(me.error)}</p>
        <Button
          size="lg"
          className="mt-5 h-10 px-4 text-sm"
          onClick={() => void me.refetch()}
        >
          Try again
        </Button>
      </div>
    )
  }

  const profile = me.data

  return (
    <div className={CONTAINER}>
      <ProfileSidebar profile={profile} />
      <ProfileSettings
        // Re-initialise the form when the saved profile changes.
        key={`${profile.user.updatedAt}-${profile.income?.updatedAt ?? ""}`}
        profile={profile}
        countries={countries.data ?? []}
      />
    </div>
  )
}

/** Mirrors the profile layout: sidebar cards on the left, settings sections on the right. */
export function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading profile" className={CONTAINER}>
      <div className="space-y-4">
        <div className="rounded-[20px] bg-linear-to-b from-brand-50 to-white p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="size-20 rounded-full" />
            <div>
              <Skeleton className="h-8 w-44" />
              <Skeleton className="mt-2 h-4 w-14" />
            </div>
          </div>
          <div className="mt-5 space-y-3 border-t border-line pt-5">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
          <Skeleton className="mt-5 h-11 w-full rounded-[10px]" />
        </div>
        {[180, 220].map((height) => (
          <div
            key={height}
            className="rounded-[20px] border border-line bg-[#F8F8F8] p-2"
          >
            <Skeleton className="m-4 h-6 w-36" />
            <Skeleton className="rounded-[20px] bg-white" style={{ height }} />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {[2, 2, 3].map((cols, i) => (
          <div
            key={i}
            className="rounded-[20px] border border-line bg-[#F8F8F8]"
          >
            <Skeleton className="mx-6 mt-4 mb-3 h-6 w-40" />
            <div className="mx-2 mb-2 rounded-[20px] border border-line bg-white p-4">
              <div
                className={
                  cols === 3
                    ? "grid gap-4 sm:grid-cols-3"
                    : "grid gap-x-5 gap-y-4 sm:grid-cols-2"
                }
              >
                {Array.from({ length: cols === 3 ? 3 : 4 }, (_, j) => (
                  <div key={j} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-15 w-full rounded-[10px] short:h-12" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

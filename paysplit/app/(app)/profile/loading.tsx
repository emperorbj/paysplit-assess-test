import { PageHeading } from "@/components/app-shell/page-heading"
import { ProfileSkeleton } from "@/components/profile/profile-view"

export default function Loading() {
  return (
    <main className="pb-6">
      <PageHeading
        title="Profile & Setting"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Profile & Setting" },
        ]}
      />
      <ProfileSkeleton />
    </main>
  )
}

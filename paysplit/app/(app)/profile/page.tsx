import type { Metadata } from "next"

import { PageHeading } from "@/components/app-shell/page-heading"
import { ProfileView } from "@/components/profile/profile-view"

export const metadata: Metadata = { title: "Profile & Setting — PaySplit" }

export default function ProfilePage() {
  return (
    <main className="pb-6">
      <PageHeading
        title="Profile & Setting"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Profile & Setting" },
        ]}
      />
      <ProfileView />
    </main>
  )
}

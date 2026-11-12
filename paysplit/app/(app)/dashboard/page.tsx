import type { Metadata } from "next"

import { DashboardView } from "@/components/dashboard/dashboard-view"

export const metadata: Metadata = { title: "Dashboard — PaySplit" }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>
}) {
  const { setup } = await searchParams
  return <DashboardView openSetup={setup === "1"} />
}

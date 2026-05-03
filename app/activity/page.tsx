// app/activity/page.tsx
// ─── SERVER COMPONENT ────────────────────────────────────────────────────────
// Fetches all data on the server before sending HTML to the browser.
// Zero client-side waterfall — ActivityClient receives real data as props.

import { auth } from "@/lib/auth"
import { getActivityData } from "@/lib/data/activity"
import ActivityClient from "./ActivityClient"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function ActivityPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  // We no longer await data here to ensure the UI renders instantly.
  // The client will fetch data via TanStack Query + Skeletons.
  return <ActivityClient initialData={null} />
}
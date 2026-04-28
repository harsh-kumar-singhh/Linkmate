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

  // Runs on the server — cached via unstable_cache in getActivityData.
  // First hit: DB queries fire. Subsequent hits within 60s: served from cache.
  const initialData = await getActivityData(session.user.id)

  return <ActivityClient initialData={initialData} />
}
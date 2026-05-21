// app/dashboard/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// FIX: SSR now prefetches getDashboardData and passes real initialData to
// the client component. This eliminates the loading skeleton on first render —
// data is available before hydration begins.
//
// getDashboardData hits unstable_cache, so this costs zero DB queries when
// the cache is warm. On cold start it runs the DB queries, but the result
// is then cached for 1 hour.
//
// React Query in DashboardClient uses this as initialData with
// initialDataUpdatedAt set to treat it as ~1 minute old, so it renders
// instantly and background-refetches after staleTime elapses.
// ─────────────────────────────────────────────────────────────────────────────

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getDashboardData } from "@/lib/data/dashboard"
import DashboardClient from "./DashboardClient"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  // ── 1. Auth check via NextAuth v5 `auth()` ────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  // ── 2. Prefetch dashboard data server-side ────────────────────────────────
  // Hits unstable_cache — near-zero cost when warm, full DB fetch on cold.
  // Passing this as initialData means the client renders with real data
  // immediately, no skeleton, no waterfall.
  const initialData = await getDashboardData(session.user.id)

  return (
    <DashboardClient
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }}
      initialData={initialData}
    />
  )
}
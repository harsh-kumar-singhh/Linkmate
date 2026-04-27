// app/dashboard/page.tsx
// ─── SERVER COMPONENT ────────────────────────────────────────────────────────
// NextAuth v5 — uses `auth()` instead of getServerSession(authOptions)

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

  // ── 2. Fetch all dashboard data on the server in parallel ─────────────────
  // By the time HTML reaches the browser, data is already embedded.
  const initialData = await getDashboardData(session.user.id)

  // ── 3. Pass pre-fetched data to the interactive client shell ──────────────
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
// app/api/dashboard/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// NextAuth v5 — uses `auth()` instead of getServerSession(authOptions)
//
// FIXES:
// 1. Removed dashboardCache (in-memory Map) — it does not work across
//    serverless instances. unstable_cache + revalidateTag is the single
//    source of truth for server-side caching.
// 2. Cache-Control changed from "no-store" to "private, max-age=0,
//    must-revalidate" — communicates "don't cache at HTTP layer, trust
//    React Query client-side" without the misleading no-store semantics.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getDashboardData } from "@/lib/data/dashboard"
import { revalidateTag } from "next/cache"

export const dynamic = "force-dynamic"

// ── GET — fetch dashboard data ────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    // Served from unstable_cache if within revalidation window — zero DB cost
    const data = await getDashboardData(session.user.id)

    const response = NextResponse.json({
      success: true,
      data,
      message: "Dashboard data loaded",
    })

    // FIX: "no-store" conflicted with the intent (React Query caches client-side,
    // unstable_cache caches server-side). This header now correctly says:
    // "browsers/CDNs: don't cache; React Query: you're in charge."
    response.headers.set(
      "Cache-Control",
      "private, max-age=0, must-revalidate"
    )

    return response
  } catch (error: any) {
    console.error("Dashboard API Error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load dashboard data",
        error: error.message,
      },
      { status: 500 }
    )
  }
}

// ── POST — explicit cache invalidation ───────────────────────────────────────
// Call revalidateTag(`dashboard:${userId}`) directly from server actions,
// or hit this endpoint from the client when you need to bust the cache.
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    // FIX: single cache layer — unstable_cache only.
    // dashboardCache.delete() removed (in-memory Map is process-local,
    // useless in serverless multi-instance environments).
    revalidateTag(`dashboard:${session.user.id}`)

    return NextResponse.json({ success: true, message: "Cache invalidated" })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
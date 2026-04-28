// app/api/activity/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Uses auth() (NextAuth v5) — no DB hit for auth, reads from JWT.
// GET  → returns cached activity data (React Query background revalidation)
// POST → busts the cache for this user (call from post create/update routes)
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getActivityData } from "@/lib/data/activity"
import { revalidateTag } from "next/cache"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Served from unstable_cache if within 60s window — zero DB cost
    const data = await getActivityData(session.user.id)

    const response = NextResponse.json(data)
    response.headers.set(
      "Cache-Control",
      "private, max-age=60, stale-while-revalidate=300"
    )
    return response
  } catch (error) {
    console.error("Activity API Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch activity metrics" },
      { status: 500 }
    )
  }
}

// ── POST — bust cache when post data changes ──────────────────────────────────
// Call this (or revalidateTag directly) from your post create/update/delete routes.
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    revalidateTag(`activity:${session.user.id}`)
    revalidateTag("activity")

    return NextResponse.json({ success: true, message: "Cache invalidated" })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
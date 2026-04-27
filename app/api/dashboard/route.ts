// app/api/dashboard/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// NextAuth v5 — uses `auth()` instead of getServerSession(authOptions)
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

    const data = await getDashboardData(session.user.id)

    const response = NextResponse.json({
      success: true,
      data,
      message: "Dashboard data loaded",
    })

    response.headers.set(
      "Cache-Control",
      "private, max-age=60, stale-while-revalidate=300"
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
// Call revalidateTag("dashboard") directly from post create/update routes,
// or hit this endpoint if you need to bust the cache from the client.
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    revalidateTag(`dashboard:${session.user.id}`)
    revalidateTag("dashboard")

    return NextResponse.json({ success: true, message: "Cache invalidated" })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
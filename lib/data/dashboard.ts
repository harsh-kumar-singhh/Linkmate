// lib/data/dashboard.ts
// ─────────────────────────────────────────────────────────────────────────────
// Centralized dashboard data fetcher.
// Used by BOTH the Server Component (page.tsx) and the API route (/api/dashboard).
//
// FIX: unstable_cache now receives fetchDashboardData as a direct function
// reference (not a closure) so Next.js deduplicates correctly across
// serverless invocations. The userId is passed as a call argument, not
// captured in a closure.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma"
import { subDays, startOfDay } from "date-fns"
import { unstable_cache } from "next/cache"

export interface DashboardPost {
  id: string
  content: string
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED"
  scheduledFor: string | null
  publishedAt: string | null
  notified: boolean
}

export interface DashboardStats {
  postingStreak: number
  totalPostsPublished: number
  postsQueued: number
  aiUsageThisWeek: number
  consistencyScore: number
  totalCount: number
}

export interface DashboardData {
  posts: DashboardPost[]
  stats: DashboardStats
}

// ── The actual data fetcher (not cached) ──────────────────────────────────────
// Receives userId as a plain argument — no closure capture.
async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const today = startOfDay(new Date())
  const thirtyDaysAgo = subDays(today, 30)
  const fifteenDaysAgo = subDays(today, 15)

  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  // All queries fire simultaneously — single DB round-trip window
  const [scheduledPosts, publishedPosts, draftPosts, counts, allPublishedDates, aiUsage] = await Promise.all([
    prisma.post.findMany({
      where: { userId, status: "SCHEDULED" },
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        content: true,
        status: true,
        scheduledFor: true,
        publishedAt: true,
        notified: true,
      },
    }),

    prisma.post.findMany({
      where: { userId, status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 7,
      select: {
        id: true,
        content: true,
        status: true,
        scheduledFor: true,
        publishedAt: true,
        notified: true,
      },
    }),

    prisma.post.findMany({
      where: { userId, status: "DRAFT" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        content: true,
        status: true,
        scheduledFor: true,
        publishedAt: true,
        notified: true,
      },
    }),

    prisma.post.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),

    prisma.post.findMany({
      where: {
        userId,
        status: "PUBLISHED",
      },
      select: { publishedAt: true },
      orderBy: { publishedAt: "desc" },
    }),

    // FIX: use aggregate (DB-side sum) instead of findMany + JS reduce
    prisma.aIUsage.aggregate({
      where: { userId, date: { gte: startOfWeek } },
      _sum: { count: true },
    }),
  ])

  // ── Process counts ──────────────────────────────────────────────────────
  const statusCounts: Record<string, number> = {
    PUBLISHED: 0,
    SCHEDULED: 0,
    DRAFT: 0,
    FAILED: 0,
    total: 0,
  }
  for (const row of counts) {
    statusCounts[row.status] = row._count._all
    statusCounts.total += row._count._all
  }

  // ── Streak calculation ──────────────────────────────────────────────────
  let streak = 0
  if (allPublishedDates.length > 0) {
    const uniqueDays = Array.from(
      new Set(
        allPublishedDates.map(p =>
          startOfDay(new Date(p.publishedAt!)).getTime()
        )
      )
    ).sort((a, b) => b - a)

    console.log("--- STREAK CALCULATION DEBUG ---")
    console.log(`User: ${userId}`)
    console.log(`Today (ms): ${today.getTime()} (${today.toISOString()})`)
    console.log("Unique Days (last 5 for log):", uniqueDays.slice(0, 5).map(d => new Date(d).toISOString()))

    const diffInDays =
      (today.getTime() - uniqueDays[0]) / (1000 * 60 * 60 * 24)
    
    console.log(`Diff from today to latest post in days: ${diffInDays}`)

    if (diffInDays <= 1) {
      streak = 1
      for (let i = 0; i < uniqueDays.length - 1; i++) {
        const dayDiff = Math.round(
          (uniqueDays[i] - uniqueDays[i + 1]) / (1000 * 60 * 60 * 24)
        )
        if (dayDiff === 1) {
          streak++
        } else {
          console.log(`Streak broken! Gap of ${dayDiff} days between ${new Date(uniqueDays[i]).toISOString()} and ${new Date(uniqueDays[i + 1]).toISOString()}`)
          break
        }
      }
    }
    console.log(`Final Calculated Streak: ${streak}`)
    console.log("--------------------------------")
  }

  // ── Consistency score ───────────────────────────────────────────────────
  const uniqueDaysLast15 = new Set(
    allPublishedDates
      .filter(p => p.publishedAt && new Date(p.publishedAt) >= fifteenDaysAgo)
      .map(p => startOfDay(new Date(p.publishedAt!)).getTime())
  ).size
  const consistencyScore = Math.round((uniqueDaysLast15 / 15) * 100)

  return {
    posts: [...scheduledPosts, ...publishedPosts, ...draftPosts] as DashboardPost[],
    stats: {
      postingStreak: streak,
      totalPostsPublished: statusCounts.PUBLISHED,
      postsQueued: statusCounts.SCHEDULED,
      aiUsageThisWeek: aiUsage._sum.count ?? 0,
      consistencyScore,
      totalCount: statusCounts.total,
    },
  }
}

// ── Cached version ────────────────────────────────────────────────────────────
// FIX: Pass fetchDashboardData as a direct function reference, not a closure.
// unstable_cache deduplicates by the key array ["dashboard", userId].
// Call it with (userId) so the argument flows through correctly.
export function getDashboardData(userId: string): Promise<DashboardData> {
  return unstable_cache(
    fetchDashboardData,
    ["dashboard", userId],
    {
      revalidate: 3600,
      tags: [`dashboard:${userId}`],
    }
  )(userId)
}

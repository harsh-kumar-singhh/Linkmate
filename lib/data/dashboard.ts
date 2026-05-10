// lib/data/dashboard.ts
// ─────────────────────────────────────────────────────────────────────────────
// Centralized dashboard data fetcher.
// Used by BOTH the Server Component (page.tsx) and the API route (/api/dashboard).
// unstable_cache persists across serverless invocations (unlike in-memory Map),
// is per-user, and auto-invalidates when you call revalidateTag("dashboard").
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

// ── The actual data fetcher (not cached yet) ──────────────────────────────────
async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const today = startOfDay(new Date())
  const thirtyDaysAgo = subDays(today, 30)
  const fifteenDaysAgo = subDays(today, 15)

  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  // All queries fire simultaneously — single DB round-trip window
  const [posts, counts, recentPublishedPosts, aiUsage] = await Promise.all([
    prisma.post.findMany({
      where: { userId },
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
        publishedAt: { gte: thirtyDaysAgo },
      },
      select: { publishedAt: true },
      orderBy: { publishedAt: "desc" },
    }),

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
  if (recentPublishedPosts.length > 0) {
    const uniqueDays = Array.from(
      new Set(
        recentPublishedPosts.map(p =>
          startOfDay(new Date(p.publishedAt!)).getTime()
        )
      )
    ).sort((a, b) => b - a)

    const diffInDays =
      (today.getTime() - uniqueDays[0]) / (1000 * 60 * 60 * 24)

    if (diffInDays <= 1) {
      streak = 1
      for (let i = 0; i < uniqueDays.length - 1; i++) {
        const dayDiff = Math.round(
          (uniqueDays[i] - uniqueDays[i + 1]) / (1000 * 60 * 60 * 24)
        )
        if (dayDiff === 1) streak++
        else break
      }
    }
  }

  // ── Consistency score ───────────────────────────────────────────────────
  const uniqueDaysLast15 = new Set(
    recentPublishedPosts
      .filter(p => p.publishedAt && new Date(p.publishedAt) >= fifteenDaysAgo)
      .map(p => startOfDay(new Date(p.publishedAt!)).getTime())
  ).size
  const consistencyScore = Math.round((uniqueDaysLast15 / 15) * 100)

  return {
    posts: posts as DashboardPost[],
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



export async function getDashboardData(userId: string): Promise<DashboardData> {
  return unstable_cache(
    async () => fetchDashboardData(userId),
    [`dashboard-${userId}`],
    {
      revalidate: 3600, // 1 hour cache, but we'll bust it with tags
      tags: ["dashboard", `dashboard:${userId}`],
    }
  )()
}
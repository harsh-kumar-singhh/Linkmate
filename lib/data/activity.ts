// lib/data/activity.ts
// ─────────────────────────────────────────────────────────────────────────────
// All DB queries run in parallel via Promise.all.
// Result is cached with unstable_cache — survives serverless cold starts.
//
// FIXES:
// 1. unstable_cache now uses direct function reference, not a closure.
// 2. aiUsage switched from findMany + JS reduce → aggregate (DB-side sum).
// 3. Cache key is ["activity", userId] — deterministic, per-user.
// ─────────────────────────────────────────────────────────────────────────────

import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { subDays } from "date-fns"

export interface ActivityStats {
  postingStreak: number
  totalPostsPublished: number
  postsQueued: number
  avgPostsPerWeek: string
  aiUsageThisWeek: number
  consistencyScore: number
  activeDaysLast15: number
}

export interface ActivityData {
  stats: ActivityStats
  chartData: {
    labels: string[]
    data: number[]
  }
}

// ── Raw fetcher (not cached) ──────────────────────────────────────────────────
// Receives userId as a plain argument — no closure capture.
async function fetchActivityData(userId: string): Promise<ActivityData> {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const thirtyDaysAgo = subDays(today, 30)
  const fifteenDaysAgo = subDays(today, 14)

  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  // ── All queries fire simultaneously — single DB round-trip window ──────────
  const [
    totalPostsPublished,
    scheduledPostsCount,
    recentPosts,
    aiUsage,
  ] = await Promise.all([
    // Lifetime published count
    prisma.post.count({
      where: { userId, status: "PUBLISHED" },
    }),

    // Scheduled queue count
    prisma.post.count({
      where: { userId, status: "SCHEDULED" },
    }),

    // Last 30 days published — used for streak, chart, consistency
    prisma.post.findMany({
      where: {
        userId,
        status: "PUBLISHED",
        publishedAt: { gte: thirtyDaysAgo },
      },
      select: { publishedAt: true },
      orderBy: { publishedAt: "desc" },
    }),

    // FIX: aggregate pushes the sum to the DB instead of loading all rows
    // into memory and reducing in JS (findMany was wrong here)
    prisma.aIUsage.aggregate({
      where: { userId, date: { gte: startOfWeek } },
      _sum: { count: true },
    }),
  ])

  // ── Consistency score (last 15 days) ───────────────────────────────────────
  const uniqueDaysWithPostsLast15 = new Set(
    recentPosts
      .filter(p => p.publishedAt && new Date(p.publishedAt) >= fifteenDaysAgo)
      .map(p => {
        const d = new Date(p.publishedAt!)
        d.setUTCHours(0, 0, 0, 0)
        return d.getTime()
      })
  ).size

  const consistencyScore = Math.round((uniqueDaysWithPostsLast15 / 15) * 100)

  // ── Posting streak ─────────────────────────────────────────────────────────
  let streak = 0
  if (recentPosts.length > 0) {
    const daysWithPosts = Array.from(
      new Set(
        recentPosts.map(p => {
          const d = new Date(p.publishedAt!)
          d.setUTCHours(0, 0, 0, 0)
          return d.getTime()
        })
      )
    ).sort((a, b) => b - a)

    const mostRecentPostDay = daysWithPosts[0]
    const diffFromToday =
      (today.getTime() - mostRecentPostDay) / (1000 * 60 * 60 * 24)

    if (diffFromToday <= 1) {
      streak = 1
      for (let i = 0; i < daysWithPosts.length - 1; i++) {
        const dayDiff = Math.round(
          (daysWithPosts[i] - daysWithPosts[i + 1]) / (1000 * 60 * 60 * 24)
        )
        if (dayDiff === 1) streak++
        else break
      }
    }
  }

  // ── Chart data: last 15 days ───────────────────────────────────────────────
  const labels: string[] = []
  const chartData: number[] = []

  for (let i = 14; i >= 0; i--) {
    const date = subDays(today, i)
    const dateStr = date.toISOString().split("T")[0]
    const count = recentPosts.filter(
      p => p.publishedAt?.toISOString().split("T")[0] === dateStr
    ).length
    labels.push(dateStr)
    chartData.push(count)
  }

  // ── Averages ───────────────────────────────────────────────────────────────
  const avgPostsPerWeek = ((recentPosts.length / 30) * 7).toFixed(1)

  // FIX: read from aggregate result, not reduce
  const aiUsageThisWeek = aiUsage._sum.count ?? 0

  return {
    stats: {
      postingStreak: streak,
      totalPostsPublished,
      postsQueued: scheduledPostsCount,
      avgPostsPerWeek,
      aiUsageThisWeek,
      consistencyScore,
      activeDaysLast15: uniqueDaysWithPostsLast15,
    },
    chartData: { labels, data: chartData },
  }
}

// ── Cached version ────────────────────────────────────────────────────────────
// FIX: Direct function reference (not a closure). Key is ["activity", userId].
// Call revalidateTag(`activity:${userId}`) from post create/update/delete routes.
export function getActivityData(userId: string): Promise<ActivityData> {
  return unstable_cache(
    fetchActivityData,
    ["activity", userId],
    {
      revalidate: 60,
      tags: [`activity:${userId}`],
    }
  )(userId)
}
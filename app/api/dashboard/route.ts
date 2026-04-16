import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { resolveUser } from "@/lib/auth/user";
import { prisma, withRetry } from "@/lib/prisma";
import { subDays } from "date-fns";

// Simple in-memory cache for dashboard data (15 seconds)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15 * 1000;

export async function GET(req: Request) {
  try {
    const user = await resolveUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const cacheKey = user.id;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, data: cached.data });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const thirtyDaysAgo = subDays(today, 30);
    const fifteenDaysAgo = subDays(today, 14);

    // Run all database queries in parallel
    const [
      posts,
      totalCount,
      totalPublished,
      totalScheduled,
      recentPublishedPosts,
      aiUsage
    ] = await Promise.all([
      // Only fetch 5 recent posts for the dashboard
      withRetry(() => prisma.post.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          content: true,
          status: true,
          scheduledFor: true,
          publishedAt: true,
          notified: true,
        }
      })),
      // Total count for pagination info if needed
      withRetry(() => prisma.post.count({ where: { userId: user.id } })),
      // Published count
      withRetry(() => prisma.post.count({ where: { userId: user.id, status: "PUBLISHED" } })),
      // Scheduled count
      withRetry(() => prisma.post.count({ where: { userId: user.id, status: "SCHEDULED" } })),
      // Recent published for streak and stats
      withRetry(() => prisma.post.findMany({
        where: {
          userId: user.id,
          status: "PUBLISHED",
          publishedAt: { gte: thirtyDaysAgo }
        },
        select: { publishedAt: true },
        orderBy: { publishedAt: "desc" }
      })),
      // AI usage
      withRetry(() => {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return prisma.aIUsage.findMany({
          where: { userId: user.id, date: { gte: startOfWeek } },
          select: { count: true }
        });
      })
    ]);

    // Calculate Streak
    let streak = 0;
    if (recentPublishedPosts.length > 0) {
      const daysWithPosts = Array.from(new Set(
        recentPublishedPosts.map(p => {
          const d = new Date(p.publishedAt!);
          d.setUTCHours(0, 0, 0, 0);
          return d.getTime();
        })
      )).sort((a, b) => b - a);

      const mostRecentPostDay = daysWithPosts[0];
      if ((today.getTime() - mostRecentPostDay) / (1000 * 60 * 60 * 24) <= 1) {
        streak = 1;
        for (let i = 0; i < daysWithPosts.length - 1; i++) {
          if (Math.round((daysWithPosts[i] - daysWithPosts[i+1]) / (1000 * 60 * 60 * 24)) === 1) {
            streak++;
          } else break;
        }
      }
    }

    // Calculate Consistency
    const uniqueDaysWithPostsLast15 = new Set(
      recentPublishedPosts
        .filter(p => p.publishedAt && new Date(p.publishedAt) >= fifteenDaysAgo)
        .map(p => {
          const d = new Date(p.publishedAt!);
          d.setUTCHours(0, 0, 0, 0);
          return d.getTime();
        })
    ).size;
    const consistencyScore = Math.round((uniqueDaysWithPostsLast15 / 15) * 100);

    const dashboardData = {
      posts,
      stats: {
        postingStreak: streak,
        totalPostsPublished: totalPublished,
        postsQueued: totalScheduled,
        aiUsageThisWeek: aiUsage.reduce((sum, u) => sum + u.count, 0),
        consistencyScore,
        totalCount
      }
    };

    // Update cache
    cache.set(cacheKey, { data: dashboardData, timestamp: Date.now() });

    return NextResponse.json({
      success: true,
      data: dashboardData,
      message: "Dashboard data loaded successfully"
    });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to load dashboard data",
      error: error.message
    }, { status: 500 });
  }
}

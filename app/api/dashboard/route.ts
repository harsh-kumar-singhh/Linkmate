import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { resolveUser } from "@/lib/auth/user";
import { prisma, withRetry } from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";

export async function GET(req: Request) {
  try {
    const user = await resolveUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const today = startOfDay(new Date());
    const thirtyDaysAgo = subDays(today, 30);
    const fifteenDaysAgo = subDays(today, 14);

    // Optimized consolidation: All dashboard data in one pass
    const [
      posts,
      counts,
      recentPublishedPosts,
      aiUsage
    ] = await Promise.all([
      // 1. Fetch exactly what's needed for the UI
      withRetry(() => prisma.post.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          content: true,
          status: true,
          scheduledFor: true,
          publishedAt: true,
          notified: true,
        }
      })),
      
      // 2. Consolidate counts using groupBy
      withRetry(() => prisma.post.groupBy({
        by: ['status'],
        where: { userId: user.id },
        _count: { _all: true }
      })),

      // 3. Optimized streak query - only need dates
      withRetry(() => prisma.post.findMany({
        where: {
          userId: user.id,
          status: "PUBLISHED",
          publishedAt: { gte: thirtyDaysAgo }
        },
        select: { publishedAt: true },
        orderBy: { publishedAt: "desc" }
      })),

      // 4. AI usage consolidation using aggregation
      withRetry(() => {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return prisma.aIUsage.aggregate({
          where: { userId: user.id, date: { gte: startOfWeek } },
          _sum: { count: true }
        });
      })
    ]);

    // Process counts efficiently
    const statusCounts: Record<string, number> = { PUBLISHED: 0, SCHEDULED: 0, DRAFT: 0, FAILED: 0, total: 0 };
    counts.forEach(curr => {
      statusCounts[curr.status] = curr._count._all;
      statusCounts.total += curr._count._all;
    });

    // Efficient Streak Calculation
    let streak = 0;
    if (recentPublishedPosts.length > 0) {
      const uniqueDays = Array.from(new Set(
        recentPublishedPosts.map(p => startOfDay(new Date(p.publishedAt!)).getTime())
      )).sort((a, b) => b - a);

      const mostRecentPostDay = uniqueDays[0];
      const diffInDays = (today.getTime() - mostRecentPostDay) / (1000 * 60 * 60 * 24);

      if (diffInDays <= 1) {
        streak = 1;
        for (let i = 0; i < uniqueDays.length - 1; i++) {
          const dayDiff = Math.round((uniqueDays[i] - uniqueDays[i+1]) / (1000 * 60 * 60 * 24));
          if (dayDiff === 1) {
            streak++;
          } else break;
        }
      }
    }

    // Consistency Score Calculation
    const uniqueDaysLast15 = new Set(
      recentPublishedPosts
        .filter(p => p.publishedAt && new Date(p.publishedAt) >= fifteenDaysAgo)
        .map(p => startOfDay(new Date(p.publishedAt!)).getTime())
    ).size;
    const consistencyScore = Math.round((uniqueDaysLast15 / 15) * 100);

    const dashboardData = {
      posts,
      stats: {
        postingStreak: streak,
        totalPostsPublished: statusCounts.PUBLISHED,
        postsQueued: statusCounts.SCHEDULED,
        aiUsageThisWeek: aiUsage._sum.count || 0,
        consistencyScore,
        totalCount: statusCounts.total
      }
    };

    const response = NextResponse.json({
      success: true,
      data: dashboardData,
      message: "Dashboard data loaded successfully"
    });

    // Add explicit cache headers for CDN/Browser (10s fresh, 60s stale)
    response.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=50');

    return response;
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to load dashboard data",
      error: error.message
    }, { status: 500 });
  }
}

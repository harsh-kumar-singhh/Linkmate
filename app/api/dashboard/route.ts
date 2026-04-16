import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { resolveUser } from "@/lib/auth/user";
import { prisma, withRetry } from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";
import { dashboardCache, inFlightRequests } from "@/lib/cache-server";

export async function GET(req: Request) {
  try {
    const user = await resolveUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    const cacheKey = `dashboard:${userId}`;

    // 1. Server-Side Memory Cache: Check if exists
    const cachedData = dashboardCache.get(cacheKey);
    if (cachedData) {
      const response = NextResponse.json({
        success: true,
        data: cachedData,
        message: "Dashboard data loaded from cache"
      });
      // 2. High-performance Cache-Control headers
      response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
      response.headers.set('X-Cache', 'HIT');
      return response;
    }

    // 6. Request-Level Deduplication: Prevent multiple concurrent DB hits
    const inFlight = inFlightRequests.get(userId);
    if (inFlight) {
      const data = await inFlight;
      return NextResponse.json({
        success: true,
        data,
        message: "Dashboard data resolved from in-flight request"
      });
    }

    // Create the promise for deduplication
    const fetchPromise = (async () => {
      const today = startOfDay(new Date());
      const thirtyDaysAgo = subDays(today, 30);
      const fifteenDaysAgo = subDays(today, 15);

      // 5. Parallel Execution & 4. Optimized Selection
      const [
        posts,
        counts,
        recentPublishedPosts,
        aiUsage
      ] = await Promise.all([
        // Fetch exactly what's needed for the UI - minimal fields
        withRetry(() => prisma.post.findMany({
          where: { userId },
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
        
        // Consolidate counts using groupBy
        withRetry(() => prisma.post.groupBy({
          by: ['status'],
          where: { userId },
          _count: { _all: true }
        })),

        // Optimized streak/consistency query - selective fields
        withRetry(() => prisma.post.findMany({
          where: {
            userId,
            status: "PUBLISHED",
            publishedAt: { gte: thirtyDaysAgo }
          },
          select: { publishedAt: true },
          orderBy: { publishedAt: "desc" }
        })),

        // AI usage this week
        withRetry(() => {
          const startOfWeek = new Date();
          startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          return prisma.aIUsage.aggregate({
            where: { userId, date: { gte: startOfWeek } },
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

      // Consistency Score (Last 15 days)
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

      // Store in cache before returning
      dashboardCache.set(cacheKey, dashboardData);
      return dashboardData;
    })();

    // Set as in-flight
    inFlightRequests.set(userId, fetchPromise);
    
    try {
      const data = await fetchPromise;
      const response = NextResponse.json({
        success: true,
        data,
        message: "Dashboard data loaded successfully"
      });
      response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
      response.headers.set('X-Cache', 'MISS');
      return response;
    } finally {
      // Clean up in-flight request
      inFlightRequests.delete(userId);
    }
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to load dashboard data",
      error: error.message
    }, { status: 500 });
  }
}


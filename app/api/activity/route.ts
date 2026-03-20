export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";
import { startOfDay, differenceInDays, subDays } from "date-fns";

export async function GET(req: Request) {
    try {
        const user = await resolveUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const thirtyDaysAgo = subDays(today, 30);

        // 1. Efficient Counts (No full post objects fetched)
        const totalPostsPublished = await prisma.post.count({
            where: { userId: user.id, status: "PUBLISHED" }
        });

        const scheduledPostsCount = await prisma.post.count({
            where: { userId: user.id, status: "SCHEDULED" }
        });

        // 2. Targeted Fetch: Only last 30 days for streak and charts
        const recentPosts = await prisma.post.findMany({
            where: {
                userId: user.id,
                status: "PUBLISHED",
                publishedAt: { gte: thirtyDaysAgo }
            },
            select: { publishedAt: true },
            orderBy: { publishedAt: "desc" }
        });

        // 3. Consistency Score (Last 15 days)
        const fifteenDaysAgo = subDays(today, 14);
        const uniqueDaysWithPostsLast15 = new Set(
            recentPosts
                .filter(p => p.publishedAt && new Date(p.publishedAt) >= fifteenDaysAgo)
                .map(p => {
                    const d = new Date(p.publishedAt!);
                    d.setUTCHours(0, 0, 0, 0);
                    return d.getTime();
                })
        ).size;
        const consistencyScore = Math.round((uniqueDaysWithPostsLast15 / 15) * 100);

        // 4. Posting Streak (using cached recentPosts)
        let streak = 0;
        if (recentPosts.length > 0) {
            const daysWithPosts = Array.from(new Set(
                recentPosts.map(p => {
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

        // 5. Chart Data (Last 15 Days)
        const labels: string[] = [];
        const data: number[] = [];
        for (let i = 14; i >= 0; i--) {
            const date = subDays(today, i);
            const dateStr = date.toISOString().split('T')[0];
            const count = recentPosts.filter(p => p.publishedAt?.toISOString().split('T')[0] === dateStr).length;
            labels.push(dateStr);
            data.push(count);
        }

        // 6. Avg Posts per Week
        const avgPostsPerWeek = (recentPosts.length / 30 * 7).toFixed(1);

        // 7. AI Usage This Week
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const aiUsage = await prisma.aIUsage.findMany({
            where: { userId: user.id, date: { gte: startOfWeek } },
            select: { count: true }
        });
        const aiUsageThisWeek = aiUsage.reduce((sum, u) => sum + u.count, 0);

        return NextResponse.json({
            stats: {
                postingStreak: streak,
                totalPostsPublished,
                postsQueued: scheduledPostsCount,
                avgPostsPerWeek,
                aiUsageThisWeek,
                consistencyScore,
                activeDaysLast15: uniqueDaysWithPostsLast15
            },
            chartData: { labels, data }
        });

    } catch (error) {
        console.error("Activity API Error:", error);
        return NextResponse.json({ error: "Failed to fetch activity metrics" }, { status: 500 });
    }
}

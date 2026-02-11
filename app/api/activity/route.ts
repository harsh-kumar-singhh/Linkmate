export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth/user";
import { getPrisma } from "@/lib/prisma";
import { startOfDay, differenceInDays, subDays } from "date-fns";

export async function GET(req: Request) {
    try {
        const user = await resolveUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const prisma = getPrisma();

        // 1. Fetch all published posts
        const allPublishedPosts = await prisma.post.findMany({
            where: {
                userId: user.id,
                status: "PUBLISHED",
            },
            orderBy: {
                publishedAt: "desc",
            },
        });

        // 2. Scheduled Posts Count
        const scheduledPostsCount = await prisma.post.count({
            where: {
                userId: user.id,
                status: "SCHEDULED",
            },
        });

        // 3. Consistency Score (Percentage of days in last 15 days with at least one post)
        // Normalize to UTC start of day to avoid timezone issues
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const fifteenDaysAgo = new Date(today);
        fifteenDaysAgo.setUTCDate(today.getUTCDate() - 14); // Include today (0 to 14 = 15 days)

        const recentPosts = allPublishedPosts.filter(p => {
            if (!p.publishedAt) return false;
            const postDate = new Date(p.publishedAt);
            postDate.setUTCHours(0, 0, 0, 0);
            return postDate >= fifteenDaysAgo;
        });

        const uniqueDaysWithPosts = new Set(
            recentPosts.map(p => {
                const d = new Date(p.publishedAt!);
                d.setUTCHours(0, 0, 0, 0);
                return d.getTime();
            })
        ).size;

        const consistencyScore = Math.round((uniqueDaysWithPosts / 15) * 100);

        // 4. Posting Streak Calculation
        let streak = 0;
        if (allPublishedPosts.length > 0) {
            const daysWithPosts = Array.from(new Set(
                allPublishedPosts
                    .filter(p => p.publishedAt)
                    .map(p => {
                        const d = new Date(p.publishedAt!);
                        d.setUTCHours(0, 0, 0, 0);
                        return d.getTime();
                    })
            )).sort((a, b) => b - a); // Descending

            const mostRecentPostDay = daysWithPosts[0];
            const todayTime = today.getTime();

            // Check if user has posted today or yesterday to continue streak
            const diffTime = Math.abs(todayTime - mostRecentPostDay);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 1) { // 0 (today) or 1 (yesterday)
                streak = 1;
                for (let i = 0; i < daysWithPosts.length - 1; i++) {
                    const current = daysWithPosts[i];
                    const next = daysWithPosts[i + 1];
                    const gap = (current - next) / (1000 * 60 * 60 * 24);
                    if (Math.round(gap) === 1) {
                        streak++;
                    } else {
                        break;
                    }
                }
            }
        }

        // 5. Line Chart Data (Last 15 Days)
        const chartData = [];
        for (let i = 14; i >= 0; i--) {
            const date = new Date(today);
            date.setUTCDate(today.getUTCDate() - i);
            
            // Format as YYYY-MM-DD for consistent frontend parsing
            const dateString = date.toISOString().split('T')[0];

            const count = allPublishedPosts.filter(p => {
                if (!p.publishedAt) return false;
                const pDate = new Date(p.publishedAt);
                // Compare using ISO date strings to avoid timezone mismatch
                return pDate.toISOString().split('T')[0] === dateString;
            }).length;

            chartData.push({
                date: dateString,
                label: i === 0 ? "Today" : (i === 14 ? "15d ago" : ""),
                count: count
            });
        }

        // 6. Average Posts Per Week (Last 30 Days)
        const thirtyDaysAgo = subDays(new Date(), 30);
        const postsInLast30Days = allPublishedPosts.filter(p =>
            p.publishedAt && new Date(p.publishedAt) >= thirtyDaysAgo
        ).length;
        const avgPostsPerWeek = (postsInLast30Days / 30 * 7).toFixed(1);

        // 7. AI Usage This Week (Coaching + Generation)
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        const aiUsage = await prisma.aIUsage.findMany({
            where: {
                userId: user.id,
                date: {
                    gte: startOfWeek
                }
            }
        });
        const aiUsageThisWeek = aiUsage.reduce((sum, u) => sum + u.count, 0);

        return NextResponse.json({
            stats: {
                postingStreak: streak,
                totalPostsPublished: allPublishedPosts.length,
                postsQueued: scheduledPostsCount,
                avgPostsPerWeek,
                aiUsageThisWeek,
                consistencyScore,
                activeDaysLast15: uniqueDaysWithPosts
            },
            chartData
        });

    } catch (error) {
        console.error("Activity API Error:", error);
        return NextResponse.json({ error: "Failed to fetch activity metrics" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth/user";
import { getPrisma } from "@/lib/prisma";
import { subDays, startOfDay, isSameDay, differenceInDays } from "date-fns";

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

        // 3. AI vs Manual Posts
        let aiPosts = 0;
        let manualPosts = 0;

        allPublishedPosts.forEach((post: any) => {
            if (post.source === 'AI') {
                aiPosts++;
            } else {
                manualPosts++;
            }
        });

        // 4. Posting Streak Calculation
        let streak = 0;
        if (allPublishedPosts.length > 0) {
            const daysWithPosts = Array.from(new Set(
                allPublishedPosts
                    .filter(p => p.publishedAt)
                    .map(p => startOfDay(new Date(p.publishedAt!)).getTime())
            )).sort((a, b) => b - a); // Descending

            const today = startOfDay(new Date());
            const mostRecentPostDay = new Date(daysWithPosts[0]);

            // Check if user has posted today or yesterday to continue streak
            const diff = differenceInDays(today, mostRecentPostDay);

            if (diff <= 1) {
                streak = 1;
                for (let i = 0; i < daysWithPosts.length - 1; i++) {
                    const current = new Date(daysWithPosts[i]);
                    const next = new Date(daysWithPosts[i + 1]);
                    if (differenceInDays(current, next) === 1) {
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
            const date = subDays(startOfDay(new Date()), i);
            const count = allPublishedPosts.filter(p =>
                p.publishedAt && isSameDay(new Date(p.publishedAt), date)
            ).length;

            chartData.push({
                date: date.toISOString(),
                label: i === 0 ? "Today" : i === 14 ? "15d ago" : "",
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
                aiPosts,
                manualPosts
            },
            chartData
        });

    } catch (error) {
        console.error("Activity API Error:", error);
        return NextResponse.json({ error: "Failed to fetch activity metrics" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const days = parseInt(searchParams.get("days") || "30");
        const startDate = subDays(new Date(), days);

        const prisma = getPrisma();

        // Fetch all published posts within the range
        const posts = await prisma.post.findMany({
            where: {
                userId: session.user.id,
                status: "PUBLISHED",
                publishedAt: {
                    gte: startDate,
                },
            },
            orderBy: {
                publishedAt: "desc",
            },
        }) as any[];

        if (posts.length === 0) {
            return NextResponse.json({
                stats: {
                    totalViews: 0,
                    totalLikes: 0,
                    totalComments: 0,
                    avgEngagement: "0%",
                    postCount: 0
                },
                bestPost: null,
                worstPost: null,
                chartData: []
            });
        }

        const totalViews = posts.reduce((sum, p) => sum + p.views, 0);
        const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
        const totalComments = posts.reduce((sum, p) => sum + p.comments, 0);
        const totalEngagement = totalLikes + totalComments;

        const avgEngagement = totalViews > 0
            ? ((totalEngagement / totalViews) * 100).toFixed(1) + "%"
            : "0%";

        // Identification logic for Best/Worst
        // Engagement Rate = (Likes + Comments) / Views
        const postsWithRate = posts.map(p => ({
            ...p,
            engagementRate: p.views > 0 ? (p.likes + p.comments) / p.views : 0
        }));

        const bestPost = postsWithRate.reduce((prev, current) =>
            (prev.engagementRate > current.engagementRate) ? prev : current
        );

        const worstPost = postsWithRate.reduce((prev, current) =>
            (prev.engagementRate < current.engagementRate) ? prev : current
        );

        // Simple chart data (recent 15 posts or days)
        const chartData = posts.slice(0, 15).reverse().map(p => ({
            date: p.publishedAt,
            views: p.views,
            engagement: p.likes + p.comments
        }));

        return NextResponse.json({
            stats: {
                totalViews: totalViews.toLocaleString(),
                totalLikes: totalLikes.toLocaleString(),
                totalComments: totalComments.toLocaleString(),
                avgEngagement,
                postCount: posts.length
            },
            bestPost: {
                content: bestPost.content,
                views: bestPost.views,
                likes: bestPost.likes,
                comments: bestPost.comments,
                engagementRate: (bestPost.engagementRate * 100).toFixed(1) + "%"
            },
            worstPost: {
                content: worstPost.content,
                views: worstPost.views,
                likes: worstPost.likes,
                comments: worstPost.comments,
                engagementRate: (worstPost.engagementRate * 100).toFixed(1) + "%"
            },
            chartData
        });

    } catch (error) {
        console.error("Stats API Error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}

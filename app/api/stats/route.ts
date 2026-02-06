export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth/user";
import { getPrisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export async function GET(req: Request) {
    try {
        const user = await resolveUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const days = parseInt(searchParams.get("days") || "30");
        const startDate = subDays(new Date(), days);

        const prisma = getPrisma();

        // 1. Fetch only local published posts
        const posts = await prisma.post.findMany({
            where: {
                userId: user.id,
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
                    totalViews: "0",
                    totalLikes: "0",
                    totalComments: "0",
                    avgEngagement: "0%",
                    postCount: 0
                },
                bestPost: null,
                worstPost: null,
                chartData: []
            });
        }

        const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
        const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
        const totalComments = posts.reduce((sum, p) => sum + (p.comments || 0), 0);
        const totalEngagement = totalLikes + totalComments;

        const avgEngagement = totalViews > 0
            ? ((totalEngagement / totalViews) * 100).toFixed(1) + "%"
            : "0%";

        // Identification logic for Best/Worst
        const postsWithRate = posts.map(p => ({
            ...p,
            engagementRate: (p.views || 0) > 0 ? ((p.likes || 0) + (p.comments || 0)) / p.views : 0
        }));

        const bestPost = postsWithRate.reduce((prev, current) =>
            (prev.engagementRate > current.engagementRate) ? prev : current
        );

        const worstPost = postsWithRate.reduce((prev, current) =>
            (prev.engagementRate < current.engagementRate) ? prev : current
        );

        // Simple chart data (recent 15 posts)
        const chartData = posts.slice(0, 15).reverse().map(p => ({
            date: p.publishedAt,
            views: p.views || 0,
            engagement: (p.likes || 0) + (p.comments || 0)
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
                views: bestPost.views || 0,
                likes: bestPost.likes || 0,
                comments: bestPost.comments || 0,
                engagementRate: (bestPost.engagementRate * 100).toFixed(1) + "%"
            },
            worstPost: {
                content: worstPost.content,
                views: worstPost.views || 0,
                likes: worstPost.likes || 0,
                comments: worstPost.comments || 0,
                engagementRate: (worstPost.engagementRate * 100).toFixed(1) + "%"
            },
            chartData
        });

    } catch (error) {
        console.error("Stats API Error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}

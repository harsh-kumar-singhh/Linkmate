export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { subDays } from "date-fns";
import { syncLinkedInPosts } from "@/lib/linkedin";

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

        // 1. Fetch local published posts
        const localPosts = await prisma.post.findMany({
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

        // 2. Fetch external LinkedIn posts
        const externalPosts = await syncLinkedInPosts(session.user.id);
        const filteredExternal = externalPosts.filter((p: any) => new Date(p.publishedAt) >= startDate);

        // 3. Merge and deduplicate (LinkMate posts will have linkedinPostId matching external post ID)
        const localLinkedinIds = new Set(localPosts.map((p: any) => p.linkedinPostId).filter(Boolean));
        const uniqueExternal = filteredExternal.filter((p: any) => !localLinkedinIds.has(p.id));

        const allPosts = [...localPosts, ...uniqueExternal].sort((a, b) =>
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );

        if (allPosts.length === 0) {
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

        const totalViews = allPosts.reduce((sum, p) => sum + (p.views || 0), 0);
        const totalLikes = allPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
        const totalComments = allPosts.reduce((sum, p) => sum + (p.comments || 0), 0);
        const totalEngagement = totalLikes + totalComments;

        const avgEngagement = totalViews > 0
            ? ((totalEngagement / totalViews) * 100).toFixed(1) + "%"
            : "0%";

        // Identification logic for Best/Worst
        const postsWithRate = allPosts.map(p => ({
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
        const chartData = allPosts.slice(0, 15).reverse().map(p => ({
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
                postCount: allPosts.length
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

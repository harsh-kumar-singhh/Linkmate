import { getPrisma } from "./prisma";

export async function getCoachContext(userId: string) {
    const prisma = getPrisma();

    try {
        // 1. Fetch only local posts
        const posts = await prisma.post.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 15,
            select: {
                content: true,
                status: true,
                publishedAt: true,
                scheduledFor: true,
                createdAt: true,
                id: true,
                views: true,
                likes: true,
                comments: true,
                linkedinPostId: true,
            }
        }) as any[];

        if (!posts || posts.length === 0) {
            return {
                recentPerformance: [],
                scheduledPosts: [],
                drafts: [],
                totalPublished: 0,
                message: "No posts found yet. Start by generating an idea!"
            };
        }

        const publishedPosts = posts.filter((p: any) => p.status === "PUBLISHED");
        const scheduled = posts.filter((p: any) => p.status === "SCHEDULED").map((p: any) => ({
            content: p.content.substring(0, 100) + "...",
            for: p.scheduledFor
        }));

        const drafts = posts.filter((p: any) => p.status === "DRAFT").map((p: any) => ({
            content: p.content.substring(0, 100) + "...",
            id: p.id
        }));

        const postsWithStats = publishedPosts.map((post: any) => {
            const views = post.views || 0;
            const likes = post.likes || 0;
            const comments = post.comments || 0;
            return {
                id: post.id,
                content: post.content.substring(0, 250) + "...",
                views,
                likes,
                comments,
                publishedAt: post.publishedAt,
                engagementRate: views > 0
                    ? (((likes + comments) / views) * 100).toFixed(1) + "%"
                    : "0%"
            };
        });

        return {
            recentPerformance: postsWithStats,
            scheduledPosts: scheduled,
            drafts: drafts,
            totalPublished: publishedPosts.length
        };
    } catch (error) {
        console.error("Coach Context Error:", error);
        return {
            recentPerformance: [],
            scheduledPosts: [],
            drafts: [],
            totalPublished: 0,
            error: "Failed to load activity context"
        };
    }
}

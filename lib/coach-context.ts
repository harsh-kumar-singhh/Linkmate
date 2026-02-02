import { getPrisma } from "./prisma";

export async function getCoachContext(userId: string) {
    const prisma = getPrisma();

    // Fetch recent posts with status and basic data
    const posts = await prisma.post.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
            content: true,
            status: true,
            publishedAt: true,
            scheduledFor: true,
            createdAt: true,
            id: true,
        }
    });

    // Calculate some basic stats if not already provided by an external API
    const publishedPosts = posts.filter(p => p.status === "PUBLISHED");

    // Use real engagement data from the database
    const postsWithStats = publishedPosts.map((post: any) => {
        return {
            id: post.id,
            content: post.content.substring(0, 250) + "...",
            views: post.views,
            likes: post.likes,
            comments: post.comments,
            publishedAt: post.publishedAt,
            engagementRate: post.views > 0 ? ((post.likes + post.comments) / post.views * 100).toFixed(1) + "%" : "0%"
        };
    });

    const scheduled = posts.filter(p => p.status === "SCHEDULED").map(p => ({
        content: p.content.substring(0, 100) + "...",
        for: p.scheduledFor
    }));

    const drafts = posts.filter(p => p.status === "DRAFT").map(p => ({
        content: p.content.substring(0, 100) + "...",
        id: p.id
    }));

    return {
        recentPerformance: postsWithStats,
        scheduledPosts: scheduled,
        drafts: drafts,
        totalPublished: publishedPosts.length
    };
}

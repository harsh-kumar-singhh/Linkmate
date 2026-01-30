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

    // We'll simulate some engagement data for the AI to analyze hooks/trends
    const postsWithStats = publishedPosts.map((post: any) => {
        const seed = post.id.charCodeAt(0) + post.id.charCodeAt(post.id.length - 1);
        const ageInDays = Math.max(1, (Date.now() - new Date(post.publishedAt || post.createdAt).getTime()) / (1000 * 60 * 60 * 24));

        const views = Math.floor((seed * 10) * Math.log10(ageInDays + 1));
        const likes = Math.floor(views * (0.05 + (seed % 10) / 100));
        const comments = Math.floor(likes * (0.1 + (seed % 5) / 100));

        return {
            content: post.content.substring(0, 200) + "...",
            views,
            likes,
            comments,
            publishedAt: post.publishedAt
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

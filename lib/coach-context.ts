import { getPrisma } from "./prisma";
import { syncLinkedInPosts } from "./linkedin";

export async function getCoachContext(userId: string) {
    const prisma = getPrisma();

    // 1. Fetch local posts
    const localPosts = await prisma.post.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20, // Fetch more to allow merging
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
        } as any
    });

    // 2. Fetch external LinkedIn posts
    const externalPosts = await syncLinkedInPosts(userId);

    // 3. Merge and deduplicate
    const localLinkedinIds = new Set(localPosts.map((p: any) => p.linkedinPostId).filter(Boolean));
    const uniqueExternal = externalPosts.filter((p: any) => !localLinkedinIds.has(p.id));

    // Combine all and sort by date
    const allRecent = [
        ...localPosts.filter((p: any) => p.status === "PUBLISHED" || p.status === "SCHEDULED" || p.status === "DRAFT"),
        ...uniqueExternal
    ].sort((a: any, b: any) => {
        const dateA = new Date(a.publishedAt || a.scheduledFor || a.createdAt).getTime();
        const dateB = new Date(b.publishedAt || b.scheduledFor || b.createdAt).getTime();
        return dateB - dateA;
    }).slice(0, 15);

    const publishedPosts = allRecent.filter((p: any) => p.status === "PUBLISHED" || p.isExternal);
    const scheduled = allRecent.filter((p: any) => p.status === "SCHEDULED").map((p: any) => ({
        content: p.content.substring(0, 100) + "...",
        for: p.scheduledFor
    }));

    const drafts = allRecent.filter((p: any) => p.status === "DRAFT").map((p: any) => ({
        content: p.content.substring(0, 100) + "...",
        id: p.id
    }));

    const postsWithStats = publishedPosts.map((post: any) => {
        return {
            id: post.id,
            content: post.content.substring(0, 250) + "...",
            views: post.views || 0,
            likes: post.likes || 0,
            comments: post.comments || 0,
            publishedAt: post.publishedAt,
            isExternal: !!post.isExternal,
            engagementRate: (post.views || 0) > 0
                ? (((post.likes || 0) + (post.comments || 0)) / post.views * 100).toFixed(1) + "%"
                : "0%"
        };
    });

    return {
        recentPerformance: postsWithStats,
        scheduledPosts: scheduled,
        drafts: drafts,
        totalPublished: publishedPosts.length
    };
}

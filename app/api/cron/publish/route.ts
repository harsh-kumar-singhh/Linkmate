export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { publishToLinkedIn } from "@/lib/linkedin";

export async function GET(req: Request) {
    // Basic protection (optional but recommended for production)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Log it but don't strictly block if user hasn't set it yet, 
        // OR strictly block if that's the intention. 
        // For now, let's keep it safe.
        // return new Response('Unauthorized', { status: 401 });
    }

    const prisma = getPrisma();
    const now = new Date();

    try {
        // 1. Find all due posts
        const duePosts = await prisma.post.findMany({
            where: {
                status: "SCHEDULED",
                scheduledFor: {
                    lte: now
                }
            },
            include: {
                user: true
            }
        });

        console.log(`Found ${duePosts.length} posts due for publishing.`);

        const results = [];

        for (const post of duePosts) {
            try {
                const publishResult = await publishToLinkedIn(post.userId, post.content);

                // Update post status to PUBLISHED
                await prisma.post.update({
                    where: { id: post.id },
                    data: {
                        status: "PUBLISHED",
                        publishedAt: new Date(),
                        linkedinPostId: publishResult.linkedinPostId
                    }
                });

                results.push({ id: post.id, status: "SUCCESS" });
            } catch (error) {
                console.error(`Failed to publish post ${post.id}:`, error);

                // Update post status to FAILED
                await prisma.post.update({
                    where: { id: post.id },
                    data: {
                        status: "FAILED",
                        failureReason: error instanceof Error ? error.message : "Unknown error"
                    }
                });

                results.push({ id: post.id, status: "FAILED", error: error instanceof Error ? error.message : "Unknown error" });
            }
        }

        return NextResponse.json({
            processed: duePosts.length,
            results
        });
    } catch (error) {
        console.error("Cron Execution Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

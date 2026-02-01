export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { publishToLinkedIn } from "@/lib/linkedin";

export async function POST(req: Request) {
    // Strictly enforce CRON_SECRET for security
    const authHeader = req.headers.get('authorization');
    if (!process.env.CRON_SECRET) {
        console.error("CRON_SECRET is not set in environment variables.");
        return NextResponse.json({ error: 'Security Configuration Missing' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.warn("Unauthorized cron attempt blocked.");
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prisma = getPrisma();
    const now = new Date();
    const nowUTC = now.toISOString();

    console.log(`[CRON] Execution started at (UTC): ${nowUTC}`);

    try {
        // 1. Find all due posts (status = SCHEDULED and scheduledFor <= now)
        const duePosts = await prisma.post.findMany({
            where: {
                status: "SCHEDULED",
                scheduledFor: {
                    lte: now
                }
            },
            include: {
                user: {
                    include: {
                        accounts: {
                            where: { provider: "linkedin" }
                        }
                    }
                }
            },
            orderBy: {
                scheduledFor: 'asc'
            }
        });

        console.log(`[CRON] Found ${duePosts.length} posts due for publishing.`);

        const results = [];

        for (const post of duePosts) {
            console.log(`[CRON] Processing post: ${post.id} (Scheduled for: ${post.scheduledFor?.toISOString()})`);

            try {
                // Idempotency & Connection check: Re-verify status and connection flag
                const user = await prisma.user.findUnique({
                    where: { id: post.userId },
                    select: { status: true, linkedinConnected: true }
                } as any); // Use any because prisma type might not be updated in IDE yet

                // Re-fetch post status
                const currentPost = await prisma.post.findUnique({
                    where: { id: post.id },
                    select: { status: true }
                });

                if (currentPost?.status !== "SCHEDULED") {
                    console.info(`[CRON] Post ${post.id} status changed to ${currentPost?.status}. Skipping.`);
                    continue;
                }

                if (!post.user.linkedinConnected) {
                    const errorMsg = "User has disabled LinkedIn connection flag (linkedinConnected=false)";
                    console.warn(`[CRON] Post ${post.id}: ${errorMsg}`);
                    await prisma.post.update({
                        where: { id: post.id },
                        data: {
                            status: "FAILED",
                            failureReason: errorMsg
                        }
                    });
                    results.push({ id: post.id, status: "FAILED", error: errorMsg });
                    continue;
                }

                // Check connection logic
                const account = post.user.accounts[0];
                if (!account?.access_token) {
                    const errorMsg = "User disconnected from LinkedIn (missing access_token)";
                    console.warn(`[CRON] Post ${post.id}: ${errorMsg}`);
                    await prisma.post.update({
                        where: { id: post.id },
                        data: {
                            status: "FAILED",
                            failureReason: errorMsg
                        }
                    });
                    results.push({ id: post.id, status: "FAILED", error: errorMsg });
                    continue;
                }

                console.log(`[CRON] Post ${post.id}: Attempting to publish to LinkedIn...`);
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

                console.log(`[CRON] Post ${post.id}: Successfully published. LinkedIn ID: ${publishResult.linkedinPostId}`);
                results.push({ id: post.id, status: "SUCCESS", linkedinPostId: publishResult.linkedinPostId });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                console.error(`[CRON] Post ${post.id}: Failed to publish:`, errorMessage);

                // Update post status to FAILED
                await prisma.post.update({
                    where: { id: post.id },
                    data: {
                        status: "FAILED",
                        failureReason: errorMessage
                    }
                });

                results.push({ id: post.id, status: "FAILED", error: errorMessage });
            }
        }

        const summary = {
            timestamp: nowUTC,
            totalFound: duePosts.length,
            processed: results.length,
            successCount: results.filter(r => r.status === "SUCCESS").length,
            failedCount: results.filter(r => r.status === "FAILED").length,
            details: results
        };

        console.log(`[CRON] Finished. Summary: ${JSON.stringify(summary)}`);

        return NextResponse.json(summary);
    } catch (error) {
        console.error("[CRON] Fatal Execution Error:", error);
        return NextResponse.json({ error: "Internal Server Error", timestamp: nowUTC }, { status: 500 });
    }
}

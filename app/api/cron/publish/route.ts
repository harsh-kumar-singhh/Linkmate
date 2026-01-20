export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { publishToLinkedIn } from "@/lib/linkedin";

export async function GET(req: Request) {
    // Strictly enforce CRON_SECRET for security
    const authHeader = req.headers.get('authorization');
    if (!process.env.CRON_SECRET) {
        console.error("CRON_SECRET is not set in environment variables.");
        return new Response('Internal Server Error: Security Configuration Missing', { status: 500 });
    }

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.warn("Unauthorized cron attempt blocked.");
        return new Response('Unauthorized', { status: 401 });
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
                user: {
                    include: {
                        accounts: {
                            where: { provider: "linkedin" }
                        }
                    }
                }
            }
        });

        console.log(`Found ${duePosts.length} posts due for publishing.`);

        const results = [];

        for (const post of duePosts) {
            try {
                // Idempotency check: Re-verify status hasn't changed since query
                const currentPost = await prisma.post.findUnique({
                    where: { id: post.id },
                    select: { status: true }
                });

                if (currentPost?.status !== "SCHEDULED") {
                    console.info(`Post ${post.id} already processed or cancelled. Skipping.`);
                    continue;
                }

                // Check connection logic
                const account = post.user.accounts[0];
                if (!account?.access_token) {
                    console.warn(`User ${post.userId} is not connected to LinkedIn. Marking post ${post.id} as FAILED.`);
                    await prisma.post.update({
                        where: { id: post.id },
                        data: {
                            status: "FAILED",
                            failureReason: "User disconnected from LinkedIn (missing access_token)"
                        }
                    });
                    results.push({ id: post.id, status: "FAILED", error: "User disconnected" });
                    continue;
                }

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
            processed: results.length,
            results
        });
    } catch (error) {
        console.error("Cron Execution Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

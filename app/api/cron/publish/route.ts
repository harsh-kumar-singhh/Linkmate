export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { publishToLinkedIn } from "@/lib/linkedin";

export async function POST(req: Request) {
    const now = new Date();
    const nowUTC = now.toISOString();

    // 1. Diagnostic Logging
    const authHeader = req.headers.get('authorization');
    const xCronSecret = req.headers.get('x-cron-secret');
    const method = req.method;

    console.log(`[CRON] ${method} request received at ${nowUTC}`);
    console.log(`[CRON] Auth Header: ${authHeader ? 'Present' : 'Missing'}, X-Cron-Secret: ${xCronSecret ? 'Present' : 'Missing'}`);

    try {
        // 2. Security Check: Support both header types
        const cronSecret = process.env.CRON_SECRET;

        const isAuthValid = authHeader === `Bearer ${cronSecret}`;
        const isXSecretValid = xCronSecret === cronSecret;

        if (!cronSecret) {
            console.error("[CRON] CRON_SECRET is not set in environment variables.");
            return NextResponse.json({ error: 'System Configuration Error' }, { status: 500 });
        }

        if (!isAuthValid && !isXSecretValid) {
            console.warn("[CRON] Unauthorized attempt blocked. Invalid or missing secret.");
            return NextResponse.json({ error: 'Unauthorized', timestamp: nowUTC }, { status: 401 });
        }

        const prisma = getPrisma();

        // 2. Find all due posts
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

        if (duePosts.length === 0) {
            console.log("[CRON] No scheduled posts are due at this time.");
            return NextResponse.json({ success: true, processed: 0, message: "No posts due", timestamp: nowUTC });
        }

        console.log(`[CRON] Found ${duePosts.length} posts due for publishing.`);

        const results = [];

        for (const post of duePosts) {
            console.log(`[CRON] Processing post: ${post.id}`);

            try {
                // Idempotency check: Re-fetch post status to ensure it hasn't been changed
                const currentPost = await prisma.post.findUnique({
                    where: { id: post.id },
                    select: { status: true }
                });

                if (currentPost?.status !== "SCHEDULED") {
                    console.info(`[CRON] Post ${post.id} status is ${currentPost?.status}. Skipping.`);
                    continue;
                }

                // Connection checks
                if (!post.user.linkedinConnected) {
                    throw new Error("LinkedIn connection flag is disabled for this user.");
                }

                const account = post.user.accounts[0];
                if (!account?.access_token) {
                    throw new Error("Missing LinkedIn access token (user disconnected).");
                }

                // Attempt publishing
                console.log(`[CRON] Post ${post.id}: Publishing... (Scheduled: ${post.scheduledFor?.toISOString()} vs Now: ${nowUTC})`);
                const publishResult = await publishToLinkedIn(post.userId, post.content);

                // Success
                await prisma.post.update({
                    where: { id: post.id },
                    data: {
                        status: "PUBLISHED",
                        publishedAt: new Date(),
                        linkedinPostId: publishResult.linkedinPostId,
                        notified: false, // Trigger UI toast for user
                        failureReason: null
                    }
                });

                console.log(`[CRON] Post ${post.id}: Published successfully. ID: ${publishResult.linkedinPostId}`);
                results.push({ id: post.id, status: "SUCCESS" });

            } catch (error: any) {
                const errorMessage = error instanceof Error ? error.message : "Internal publishing error";
                console.error(`[CRON] Post ${post.id} failed:`, errorMessage);

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
            success: true,
            timestamp: nowUTC,
            total: duePosts.length,
            processed: results.length,
            succeeded: results.filter(r => r.status === "SUCCESS").length,
            failed: results.filter(r => r.status === "FAILED").length,
            details: results
        };

        console.log(`[CRON] Summary: ${JSON.stringify(summary)}`);
        return NextResponse.json(summary);

    } catch (error: any) {
        console.error("[CRON] FATAL ERROR:", error);
        // We still return HTTP 200 (unless it's a critical auth failure) 
        // to prevent GitHub Actions from retrying and potentially causing duplicate posts
        return NextResponse.json({
            success: false,
            error: "Global Cron Failure",
            message: error.message || "Unknown error",
            timestamp: nowUTC
        }, { status: 200 });
    }
}

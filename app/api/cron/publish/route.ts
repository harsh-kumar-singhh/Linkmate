export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishToLinkedIn } from "@/lib/linkedin";
import { maintainAutopilotPipeline } from "@/lib/autopilot/maintenance";
import { triggerPostPublishedNotification, sendPushNotification } from "@/lib/notifications";

export async function POST(req: Request) {
    const now = new Date();
    const nowUTC = now.toISOString();

    // 1. Diagnostic Logging
    const authHeader = req.headers.get('authorization');
    const xCronSecret = req.headers.get('x-cron-secret');
    const method = req.method;

    console.log(`[CRON] ${method} request received at ${nowUTC}`);

    try {
        // 2. Security Check
        const cronSecret = process.env.CRON_SECRET;
        const isAuthValid = authHeader === `Bearer ${cronSecret}`;
        const isXSecretValid = xCronSecret === cronSecret;

        if (!cronSecret) {
            console.error("[CRON] CRON_SECRET is not set.");
            return NextResponse.json({ error: 'System Configuration Error' }, { status: 500 });
        }

        if (!isAuthValid && !isXSecretValid) {
            console.warn("[CRON] Unauthorized attempt blocked.");
            return NextResponse.json({ error: 'Unauthorized', timestamp: nowUTC }, { status: 401 });
        }

        const BATCH_SIZE = 10;

        // 3. Find due posts with batching and selective fetching
        const duePosts = await prisma.post.findMany({
            where: {
                status: "SCHEDULED",
                scheduledFor: {
                    lte: now
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        linkedinConnected: true,
                        accounts: {
                            where: { provider: "linkedin" },
                            select: { 
                                access_token: true,
                                providerAccountId: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                scheduledFor: 'asc'
            },
            take: BATCH_SIZE
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
                if (!post.user.linkedinConnected) {
                    throw new Error("LinkedIn connection flag is disabled for this user.");
                }

                const account = post.user.accounts[0];
                if (!account?.access_token) {
                    throw new Error("Missing LinkedIn access token.");
                }

                // Attempt publishing
                console.log(`[CRON] Post ${post.id}: Publishing...`);
                
                const publishResult = await publishToLinkedIn(
                    post.userId, 
                    post.content, 
                    post.imageUrl, 
                    (post as any).imageData,
                    { 
                        access_token: account.access_token, 
                        providerAccountId: account.providerAccountId 
                    }
                );

                // Success
                await prisma.post.update({
                    where: { id: post.id },
                    data: {
                        status: "PUBLISHED",
                        publishedAt: new Date(),
                        linkedinPostId: publishResult.linkedinPostId,
                        notified: true,
                        failureReason: null
                    }
                });

                // Trigger notification
                try {
                    await triggerPostPublishedNotification(post.userId, post.content, post.id);
                } catch (notifyError) {
                    console.error(`[CRON] Failed to notify user for post ${post.id}:`, notifyError);
                }

                console.log(`[CRON] Post ${post.id}: Published successfully.`);
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

                // Trigger failure notification
                try {
                    await sendPushNotification(post.userId, {
                        title: 'Publishing Failed ⚠️',
                        body: `We couldn't publish your post. Error: ${errorMessage.substring(0, 50)}...`,
                        url: `/posts/${post.id}`,
                        type: 'POST_FAILED',
                    });
                } catch (notifyError) {
                    console.error(`[CRON] Failed to notify user for post failure ${post.id}:`, notifyError);
                }

                results.push({ id: post.id, status: "FAILED", error: errorMessage });
            }
        }

        console.log("[CRON] Phase 1 (Publishing) completed. Starting Phase 2 (Maintenance)...");
        
        // 4. Trigger Autopilot Maintenance Pipeline
        try {
            await maintainAutopilotPipeline();
        } catch (maintenanceError) {
            console.error("[CRON] Phase 2 (Maintenance) failed:", maintenanceError);
        }

        const summary = {
            success: true,
            timestamp: nowUTC,
            total: duePosts.length,
            processed: results.length,
            succeeded: results.filter(r => r.status === "SUCCESS").length,
            failed: results.filter(r => r.status === "FAILED").length,
            maintenanceTriggered: true,
            details: results
        };

        return NextResponse.json(summary);

    } catch (error: any) {
        console.error("[CRON] FATAL ERROR:", error);
        return NextResponse.json({
            success: false,
            error: "Global Cron Failure",
            message: error.message || "Unknown error",
            timestamp: nowUTC
        }, { status: 200 });
    }
}

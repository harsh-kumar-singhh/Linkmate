export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { publishToLinkedIn } from "@/lib/linkedin";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        // Authenticate the request (Heartbeat comes from an active session)
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const prisma = getPrisma();
        const now = new Date();

        // Check for valid LinkedIn connection first to avoid unnecessary processing
        const linkedInAccount = await prisma.account.findFirst({
            where: {
                userId: session.user.id,
                provider: "linkedin",
                access_token: { not: null }
            }
        });

        if (!linkedInAccount) {
            return NextResponse.json({ processed: 0, status: "No valid LinkedIn connection" });
        }

        // 1. Find all due posts for the current user
        // We only process posts for the user triggering the heartbeat for simplicity and security
        const duePosts = await prisma.post.findMany({
            where: {
                userId: session.user.id,
                status: "SCHEDULED",
                scheduledFor: {
                    lte: now
                }
            }
        });

        if (duePosts.length === 0) {
            return NextResponse.json({ processed: 0, status: "No posts due" });
        }

        console.log(`[SCHEDULER] User ${session.user.id} triggered processing of ${duePosts.length} posts.`);

        const results = [];

        for (const post of duePosts) {
            try {
                // Idempotency check: Re-verify status
                const currentPost = await prisma.post.findUnique({
                    where: { id: post.id },
                    select: { status: true }
                });

                if (currentPost?.status !== "SCHEDULED") continue;

                const publishResult = await publishToLinkedIn(post.userId, post.content);

                // Update to PUBLISHED and set notified to false so the UI knows to show a toast
                await prisma.post.update({
                    where: { id: post.id },
                    data: {
                        status: "PUBLISHED",
                        publishedAt: new Date(),
                        linkedinPostId: publishResult.linkedinPostId,
                        notified: false
                    }
                });

                results.push({ id: post.id, status: "SUCCESS" });
            } catch (error) {
                console.error(`[SCHEDULER] Failed to publish post ${post.id}:`, error);

                // We keep it as SCHEDULED so it can be retried or handled manually
                // Optionally mark as FAILED if retry count exceeded
                results.push({ id: post.id, status: "FAILED", error: error instanceof Error ? error.message : "Unknown error" });
            }
        }

        return NextResponse.json({
            processed: results.length,
            results
        });
    } catch (error) {
        console.error("[SCHEDULER] Processing Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

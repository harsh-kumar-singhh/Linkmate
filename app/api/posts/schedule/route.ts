export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const prisma = getPrisma();
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { content, scheduledFor, postId } = await req.json();

        if (!content || !scheduledFor) {
            return NextResponse.json({ error: "Content and scheduled time are required" }, { status: 400 });
        }

        // Normalize to minute boundary (set seconds and milliseconds to 0)
        const scheduleDate = new Date(scheduledFor);
        scheduleDate.setSeconds(0, 0);

        console.log(`[SCHEDULE_POST] Incoming: ${scheduledFor}, Normalized UTC: ${scheduleDate.toISOString()}`);

        if (scheduleDate <= new Date()) {
            return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        let post;
        if (postId) {
            // Update existing post
            post = await prisma.post.update({
                where: { id: postId, userId: user.id },
                data: {
                    content,
                    scheduledFor: scheduleDate,
                    status: "SCHEDULED"
                }
            });
        } else {
            // Create new scheduled post
            post = await prisma.post.create({
                data: {
                    userId: user.id,
                    content,
                    scheduledFor: scheduleDate,
                    status: "SCHEDULED"
                }
            });
        }

        return NextResponse.json({ success: true, post });
    } catch (error) {
        console.error("Error scheduling post:", error);
        return NextResponse.json({ error: "Failed to schedule post" }, { status: 500 });
    }
}

"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

import { maintainAutopilotPipeline, reconcileAutopilotSchedule } from "@/lib/autopilot/maintenance"

// ---------------- SAVE SETTINGS ----------------
export async function saveAutopilotSettings(data: {
    topics: string[]
    frequency: string
    days: string[]
    time: string
    aboutYou?: string
    currentFocus?: string
    writingStyleId?: string
}) {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, plan: true }
    })

    const isPro = user?.plan?.toUpperCase() === "PRO"

    if (!isPro) {
        throw new Error("Pro plan required for Autopilot")
    }

    // ---------------- VALIDATION ----------------
    if (data.topics.length < 1) {
        throw new Error("Please select at least one topic")
    }

    if (data.days.length === 0) {
        throw new Error("Please select at least one posting day")
    }

    try {
        // ---------------- SAVE CONFIG ----------------
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                autopilotEnabled: true,
                autopilotTopics: data.topics,
                autopilotFrequency: data.frequency,
                autopilotDays: data.days,
                autopilotTime: data.time,
                autopilotAboutYou: data.aboutYou,
                autopilotCurrentFocus: data.currentFocus,
                autopilotWritingStyleId: data.writingStyleId,
            },
        })

        // ---------------- PIPELINE FLOW ----------------
        console.log(`[Autopilot] RECONCILE → ${session.user.id}`)
        await reconcileAutopilotSchedule(session.user.id, data.days)

        console.log(`[Autopilot] MAINTENANCE TRIGGER → ${session.user.id}`)
        await maintainAutopilotPipeline(session.user.id)

        console.log(`[Autopilot] SYNC COMPLETE`)

        revalidatePath("/calendar")

        return { success: true }

    } catch (error) {
        console.error("Failed to save autopilot settings:", error)
        throw new Error("Internal server error")
    }
}

// ---------------- TOGGLE AUTOPILOT ----------------
export async function toggleAutopilot(enabled: boolean) {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    try {
        const now = new Date()

        await prisma.$transaction([
            // Update user flag
            prisma.user.update({
                where: { id: session.user.id },
                data: { autopilotEnabled: enabled },
            }),

            // Update future posts
            prisma.post.updateMany({
                where: {
                    userId: session.user.id,
                    source: "autopilot",
                    scheduledFor: { gt: now }
                },
                data: {
                    status: enabled ? "SCHEDULED" : "PAUSED"
                }
            })
        ])

        // ---------------- RESUME FLOW ----------------
        if (enabled) {
            console.log(`[Autopilot] RESUME → Trigger maintenance`)

            await maintainAutopilotPipeline(session.user.id).catch(err => {
                console.error("Autopilot maintenance failed:", err)
            })
        }

        revalidatePath("/calendar")

        return { success: true }

    } catch (error) {
        console.error("Failed to toggle autopilot:", error)
        throw new Error("Internal server error")
    }
}
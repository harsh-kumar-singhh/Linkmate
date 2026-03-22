// autopilot.ts - NO CHANGES NEEDED
"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

import { maintainAutopilotPipeline, reconcileAutopilotSchedule } from "@/lib/autopilot/maintenance"

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

    if (data.topics.length < 1) {
        throw new Error("Please select at least one topic")
    }

    if (data.days.length === 0) {
        throw new Error("Please select at least one posting day")
    }

    const frequencyNum = parseInt(data.frequency);
    if (frequencyNum < 1 || frequencyNum > data.days.length) {
        throw new Error(`Frequency must be between 1 and ${data.days.length}`)
    }

    try {
        console.log(`[Autopilot-Settings] Saving for ${session.user.id}`);
        console.log(`  Days: ${data.days.join(', ')}`);
        console.log(`  Time: ${data.time}`);

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

        console.log(`[Autopilot-Settings] Reconciling...`);
        await reconcileAutopilotSchedule(session.user.id, data.days)

        console.log(`[Autopilot-Settings] Running maintenance...`);
        await maintainAutopilotPipeline(session.user.id)

        console.log(`[Autopilot-Settings] Done`);

        revalidatePath("/calendar")

        return { success: true }

    } catch (error) {
        console.error("[Autopilot-Settings] Error:", error)
        throw new Error("Failed to save autopilot settings")
    }
}

export async function toggleAutopilot(enabled: boolean) {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    try {
        const now = new Date()

        await prisma.$transaction([
            prisma.user.update({
                where: { id: session.user.id },
                data: { autopilotEnabled: enabled },
            }),
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

        if (enabled) {
            await maintainAutopilotPipeline(session.user.id).catch(err => {
                console.error("[Autopilot-Toggle] Maintenance failed:", err)
            })
        }

        revalidatePath("/calendar")

        return { success: true }

    } catch (error) {
        console.error("[Autopilot-Toggle] Error:", error)
        throw new Error("Failed to toggle autopilot")
    }
}
// autopilot.ts
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

    const frequencyNum = parseInt(data.frequency);
    if (frequencyNum < 1 || frequencyNum > data.days.length) {
        throw new Error(`Frequency must be between 1 and ${data.days.length} (number of selected days)`)
    }

    try {
        console.log(`[Autopilot-Settings] 💾 Saving config for user ${session.user.id}`)
        console.log(`[Autopilot-Settings] Topics: ${data.topics.join(', ')}`)
        console.log(`[Autopilot-Settings] Days: ${data.days.join(', ')}`)
        console.log(`[Autopilot-Settings] Time: ${data.time}`)
        console.log(`[Autopilot-Settings] Frequency: ${data.frequency}/week`)

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

        console.log(`[Autopilot-Settings] ✅ Config saved`)

        // ---------------- PIPELINE FLOW ----------------
        console.log(`[Autopilot-Settings] 🔄 Step 1: Reconciling existing posts`)
        await reconcileAutopilotSchedule(session.user.id, data.days)

        console.log(`[Autopilot-Settings] 🚀 Step 2: Triggering maintenance pipeline`)
        await maintainAutopilotPipeline(session.user.id)

        console.log(`[Autopilot-Settings] ✅ SYNC COMPLETE`)

        revalidatePath("/calendar")

        return { success: true }

    } catch (error) {
        console.error("[Autopilot-Settings] ❌ ERROR:", error)
        throw new Error("Failed to save autopilot settings")
    }
}

// ---------------- TOGGLE AUTOPILOT ----------------
export async function toggleAutopilot(enabled: boolean) {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    console.log(`[Autopilot-Toggle] ${enabled ? '▶️  ENABLING' : '⏸️  PAUSING'} for user ${session.user.id}`)

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

        console.log(`[Autopilot-Toggle] ✅ Status updated`)

        // ---------------- RESUME FLOW ----------------
        if (enabled) {
            console.log(`[Autopilot-Toggle] 🚀 Triggering maintenance to fill gaps`)

            await maintainAutopilotPipeline(session.user.id).catch(err => {
                console.error("[Autopilot-Toggle] ⚠️  Maintenance failed:", err)
            })
        }

        revalidatePath("/calendar")

        return { success: true }

    } catch (error) {
        console.error("[Autopilot-Toggle] ❌ ERROR:", error)
        throw new Error("Failed to toggle autopilot")
    }
}
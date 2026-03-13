"use server"

import { auth } from "@/lib/auth"
import { getPrisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

const prisma = getPrisma()

export async function saveAutopilotSettings(data: {
    topics: string[]
    frequency: string
    days: string[]
    time: string
}) {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    if (session.user.plan?.toUpperCase() !== "PRO") {
        throw new Error("Pro plan required for Autopilot")
    }

    // Validation
    if (data.topics.length < 3 || data.topics.length > 5) {
        throw new Error("Please select between 3 and 5 topics")
    }

    if (data.days.length === 0) {
        throw new Error("Please select at least one posting day")
    }

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                autopilotEnabled: true,
                autopilotTopics: data.topics,
                autopilotFrequency: data.frequency,
                autopilotDays: data.days,
                autopilotTime: data.time,
            },
        })

        revalidatePath("/calendar")
        return { success: true }
    } catch (error) {
        console.error("Failed to save autopilot settings:", error)
        throw new Error("Internal server error")
    }
}

export async function toggleAutopilot(enabled: boolean) {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Unauthorized")
    }

    try {
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                autopilotEnabled: enabled,
            },
        })

        revalidatePath("/calendar")
        return { success: true }
    } catch (error) {
        console.error("Failed to toggle autopilot:", error)
        throw new Error("Internal server error")
    }
}

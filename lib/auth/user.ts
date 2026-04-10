import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Session } from "next-auth"
import { cache } from "react"

/**
 * Resolves the authenticated user from the database with request-level caching.
 * Uses selective fetching to reduce database load.
 */
export const resolveUser = cache(async (providedSession?: Session | null) => {
    const session = providedSession || await auth()

    if (!session?.user?.id) {
        return null
    }

    // Selective fields needed for most operations
    const userSelect = {
        id: true,
        email: true,
        name: true,
        image: true,
        plan: true,
        theme: true,
        defaultTone: true,
        writingStyles: true,
        linkedinConnected: true,
        autopilotEnabled: true,
        autopilotTopics: true,
        autopilotFrequency: true,
        autopilotDays: true,
        autopilotTime: true,
        aboutYou: true,
        autopilotCurrentFocus: true,
        autopilotWritingStyleId: true,
        // Legacy fields for backward compatibility
        writingStyle: true,
        customStyles: true,
    }

    // 1. Primary lookup by ID
    let user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: userSelect
    })

    // 2. Secondary lookup by email if ID lookup failed
    if (!user && session.user.email) {
        user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: userSelect
        })
    }

    // 3. Auto-Healing: Create user if it doesn't exist
    if (!user) {
        console.warn(`[AUTH] Auto-healing missing user record for: ${session.user.id}`)

        try {
            user = await prisma.user.create({
                data: {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.name,
                    image: session.user.image,
                },
                select: userSelect
            })
        } catch (error) {
            console.error(`[AUTH] Failed to auto-heal user: ${error}`)
            return null
        }
    }

    return user
})

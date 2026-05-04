import { auth } from "@/lib/auth"
import { prisma, withRetry } from "@/lib/prisma"
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

    const dbUrl = process.env.DATABASE_URL || "";
    const host = dbUrl.split("@")[1]?.split(":")[0] || "unknown";
    console.log("DB DEBUG → Connected host:", host);
    console.log("DB DEBUG → DATABASE_URL:", process.env.DATABASE_URL);
    console.log("DB DEBUG → DIRECT_URL:", process.env.DIRECT_URL);
    console.log("DB DEBUG → Looking up user ID:", session.user.id);

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
        lastActiveAt: true,
        engagementSegment: true,
        // Legacy fields for backward compatibility
        writingStyle: true,
        customStyles: true,
    }

    // 1. Primary lookup by ID (with retry for serverless database connections)
    let user = await withRetry(() => prisma.user.findUnique({
        where: { id: session.user.id },
        select: userSelect
    }))

    console.log("DB DEBUG → Lookup result:", user ? `FOUND (${user.id})` : "NOT_FOUND");

    // 2. Secondary lookup by email if ID lookup failed
    if (!user && typeof session.user.email === "string") {
        const normalizedEmail = session.user.email.toLowerCase()
        user = await withRetry(() => prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: userSelect
        }))
    }


    // 3. Auto-Healing: Create user if it doesn't exist
    if (!user) {
        console.warn(`[AUTH] Auto-healing missing user record for: ${session.user.id}`)

        try {
            console.log("DB DEBUG → Creating user with ID:", session.user.id)
            user = await withRetry(() => prisma.user.upsert({
                where: { id: session.user.id },
                update: {},
                create: {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.name,
                    image: session.user.image,
                },
                select: userSelect
            }))
            console.log("DB DEBUG → Auto-heal complete for ID:", session.user.id)
        } catch (error) {
            console.error(`[AUTH] Failed to auto-heal user: ${error}`)
            return null
        }
    }

    // 4. Update last active time (background)
    if (user) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (!user.lastActiveAt || user.lastActiveAt < fiveMinutesAgo) {
            // Update in background to not block the request
            withRetry(() => prisma.user.update({
                where: { id: user.id },
                data: { lastActiveAt: new Date() }
            })).catch(console.error);
        }
    }

    return user
})

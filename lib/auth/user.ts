import { auth } from "@/lib/auth"
import { getPrisma } from "@/lib/prisma"
import { Session } from "next-auth"

/**
 * Resolves the authenticated user from the database.
 * Priority: 1. Session user ID, 2. Session user email.
 * If the user does not exist in the database, it recreates the record silently (Auto-Healing).
 */
export async function resolveUser(providedSession?: Session | null) {
    const session = providedSession || await auth()

    if (!session?.user?.id) {
        return null
    }

    const prisma = getPrisma()

    // 1. Primary lookup by ID (as it's the stable identifier in the session)
    let user = await prisma.user.findUnique({
        where: { id: session.user.id },
    })

    // 2. Secondary lookup by email if ID lookup failed
    if (!user && session.user.email) {
        user = await prisma.user.findUnique({
            where: { email: session.user.email },
        })
    }

    // 3. Auto-Healing: Create user if it doesn't exist but session is valid
    if (!user) {
        console.warn(`[AUTH] Auto-healing missing user record for: ${session.user.id} (${session.user.email || 'no-email'})`)

        try {
            user = await prisma.user.create({
                data: {
                    id: session.user.id, // Preserving ID from session
                    email: session.user.email,
                    name: session.user.name,
                    image: session.user.image,
                },
            })
        } catch (error) {
            console.error(`[AUTH] Failed to auto-heal user: ${error}`)
            return null
        }
    }

    return user
}

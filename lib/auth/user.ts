import { auth } from "@/lib/auth"
import { getPrisma } from "@/lib/prisma"

/**
 * Resolves the authenticated user from the database.
 * Priority: 1. Session user email, 2. Session user ID.
 * If the user does not exist in the database, it creates a new record.
 */
export async function resolveUser() {
    const session = await auth()
    if (!session?.user?.email) {
        return null
    }

    const prisma = getPrisma()

    // 1. Try resolving by email (stable identifier)
    let user = await prisma.user.findUnique({
        where: { email: session.user.email },
    })

    // 2. Fallback: Try resolving by session ID (if provided)
    if (!user && session.user.id) {
        user = await prisma.user.findUnique({
            where: { id: session.user.id },
        })
    }

    // 3. Last Resort: Create user if it doesn't exist
    // This handles cases where session exists but DB record was lost/deleted
    if (!user && session.user.email) {
        console.log(`[AUTH] Creating missing user record for: ${session.user.email}`)
        user = await prisma.user.create({
            data: {
                email: session.user.email,
                name: session.user.name,
                image: session.user.image,
            },
        })
    }

    return user
}

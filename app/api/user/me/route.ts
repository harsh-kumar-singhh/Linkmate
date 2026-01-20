export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
    const prisma = getPrisma();
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                accounts: {
                    where: { provider: "linkedin" },
                    select: {
                        id: true,
                        provider: true,
                        providerAccountId: true,
                        access_token: true, // Check for actual token existence
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (process.env.NODE_ENV === "development") {
            console.log(`[USER_ME] Fetching state for ${session.user.id}. Connected accounts: ${user.accounts.length}`);
        }

        // Strict check: Must have an account AND a non-null access token
        const hasValidConnection = user.accounts.some(
            (account) => account.provider === "linkedin" && account.access_token
        );

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                writingStyle: user.writingStyle,
                theme: user.theme,
                // Strictly database-backed connection status
                isConnected: hasValidConnection,
            }
        }, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            }
        });
    } catch (error) {
        console.error("Error fetching user data:", error);
        return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 });
    }
}

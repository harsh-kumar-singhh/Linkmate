import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { focus } = await req.json();

        // Update the user's autopilotCurrentFocus field
        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: { 
                autopilotCurrentFocus: focus 
            }
        });

        console.log(`[USER_FOCUS] Updated weekly focus for user ${session.user.id}`);

        return NextResponse.json({ 
            success: true, 
            focus: updatedUser.autopilotCurrentFocus 
        });
    } catch (error) {
        console.error("Error updating weekly focus:", error);
        return NextResponse.json({ error: "Failed to update weekly focus" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { maintainAutopilotPipeline, syncAutopilotWeeklyFocus } from "@/lib/autopilot/maintenance";
import { revalidatePath, revalidateTag } from "next/cache";

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

        console.log(`[USER_FOCUS] Updated weekly focus for user ${session.user.id}. Triggering selective sync...`);
        
        // SELECTIVE REGENERATION: Replace future posts that used the old focus
        const result = await syncAutopilotWeeklyFocus(session.user.id, focus);
        const posts = result.deletedPostIds.length
            ? await maintainAutopilotPipeline(session.user.id, true)
            : [];
        revalidatePath("/calendar");
        revalidateTag(`dashboard:${session.user.id}`);

        return NextResponse.json({ 
            success: true, 
            focus: updatedUser.autopilotCurrentFocus,
            posts,
            deletedPostIds: result.deletedPostIds,
        });
    } catch (error) {
        console.error("Error updating weekly focus:", error);
        return NextResponse.json({ error: "Failed to update weekly focus" }, { status: 500 });
    }
}

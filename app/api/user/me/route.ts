export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0


import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { resolveUser } from "@/lib/auth/user"
import { prisma } from "@/lib/prisma"

export async function GET() {
  headers() // Force dynamic rendering at request time

  try {
    const user = await resolveUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }


    const isConnected = (user as any).linkedinConnected === true

    // Data Bridge: Extract legacy styles if the new writingStyles is empty
    let finalWritingStyles = (user as any).writingStyles || [];
    if (finalWritingStyles.length === 0) {
      if ((user as any).writingStyle) {
        finalWritingStyles.push({ name: "Legacy (Main)", sample: (user as any).writingStyle });
      }
      if ((user as any).customStyles && Array.isArray((user as any).customStyles)) {
        (user as any).customStyles.forEach((s: string, i: number) => {
          if (s) finalWritingStyles.push({ name: `Legacy (Extra ${i + 1})`, sample: s });
        });
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        writingStyles: finalWritingStyles,
        theme: user.theme || "system",
        defaultTone: (user as any).defaultTone || "Professional",
        isConnected,
        autopilotEnabled: Boolean((user as any).autopilotEnabled),
        autopilotTopics: (user as any).autopilotTopics || [],
        autopilotFrequency: (user as any).autopilotFrequency || "",
        autopilotDays: (user as any).autopilotDays || [],
        autopilotTime: (user as any).autopilotTime || "",
        aboutYou: (user as any).aboutYou || "",
        autopilotCurrentFocus: (user as any).autopilotCurrentFocus || "",
        autopilotWritingStyleId: (user as any).autopilotWritingStyleId || "default",
        plan: (user.plan || "FREE").toUpperCase(),
      },
    }, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error: any) {
    console.error("USER_ME error:", error)
    const message = error.name === "PrismaClientInitializationError" 
      ? "Database temporarily unavailable - waking up servers" 
      : "Failed to fetch user data";
    return NextResponse.json({ success: false, message }, { status: 503 })
  }
}
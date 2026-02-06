export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0


import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { resolveUser } from "@/lib/auth/user"
import { getPrisma } from "@/lib/prisma"

export async function GET() {
  const prisma = getPrisma()
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
      },
    }, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (err) {
    console.error("USER_ME error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
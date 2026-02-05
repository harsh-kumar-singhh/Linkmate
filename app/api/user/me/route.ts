export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0


import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getPrisma } from "@/lib/prisma"

export async function GET() {
  const prisma = getPrisma()
  headers() // Force dynamic rendering at request time

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        writingStyles: true,
        writingStyle: true,
        customStyles: true,
        theme: true,
        defaultTone: true,
        linkedinConnected: true,
      } as any
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
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
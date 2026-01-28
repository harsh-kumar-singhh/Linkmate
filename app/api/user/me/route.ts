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
        writingStyle: true,
        theme: true,
        linkedinConnected: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const isConnected = user.linkedinConnected === true

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        writingStyle: user.writingStyle,
        theme: user.theme,
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
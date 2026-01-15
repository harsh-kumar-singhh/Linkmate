export const runtime = "nodejs";

import { NextResponse } from "next/server"
import { getPrisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  const prisma = getPrisma();
  try {
    const { name, email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user (Note: We'll store password in a separate table or use a different approach)
    // For now, we'll create the user and handle password separately
    // In production, you might want to use a separate Credentials model
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
      },
    })

    // Store password hash (in production, use a separate Credentials table)
    // For MVP, we'll handle this differently - storing in Account table with type "credentials"
    await prisma.account.create({
      data: {
        userId: user.id,
        type: "credentials",
        provider: "credentials",
        providerAccountId: user.id,
        access_token: hashedPassword, // Temporary storage - should use proper Credentials model
      },
    })

    return NextResponse.json(
      { message: "User created successfully", userId: user.id },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Signup error details:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    })
    return NextResponse.json(
      { error: `Failed to create account: ${error.message}` },
      { status: 500 }
    )
  }
}


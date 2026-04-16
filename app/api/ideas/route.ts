import { NextResponse } from 'next/server';
import { resolveUser } from '@/lib/auth/user';
import { prisma, withRetry } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await resolveUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized', message: 'Unauthorized' }, { status: 401 });
    }

    const ideas = await withRetry(() => prisma.idea.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
          id: true,
          content: true,
          createdAt: true
      }
    }));

    return NextResponse.json({
        success: true,
        data: ideas,
        message: "Ideas fetched successfully"
    });
  } catch (error: any) {
    console.error('Error fetching ideas:', error);
    const isDbError = error.name === "PrismaClientInitializationError";
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      message: isDbError ? "Database temporarily unavailable - waking up servers" : 'Failed to fetch ideas' 
    }, { status: isDbError ? 503 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await resolveUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized', message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: 'Content is required', message: 'Content is required' }, { status: 400 });
    }

    const idea = await withRetry(() => prisma.idea.create({
      data: {
        userId: user.id,
        content: content.trim(),
      },
    }));

    return NextResponse.json({
        success: true,
        data: idea,
        message: "Idea saved to vault"
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating idea:', error);
    const isDbError = error.name === "PrismaClientInitializationError";
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      message: isDbError ? "Database temporarily unavailable - waking up servers" : 'Failed to create idea' 
    }, { status: isDbError ? 503 : 500 });
  }
}

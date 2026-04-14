import { NextResponse } from 'next/server';
import { resolveUser } from '@/lib/auth/user';
import { prisma, withRetry } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await resolveUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ideas = await withRetry(() => prisma.idea.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    }));

    return NextResponse.json(ideas);
  } catch (error: any) {
    console.error('Error fetching ideas:', error);
    const isDbError = error.name === "PrismaClientInitializationError";
    return NextResponse.json({ 
      success: false, 
      message: isDbError ? "Database temporarily unavailable - waking up servers" : 'Failed to fetch ideas' 
    }, { status: isDbError ? 503 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await resolveUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const idea = await withRetry(() => prisma.idea.create({
      data: {
        userId: user.id,
        content: content.trim(),
      },
    }));

    return NextResponse.json(idea, { status: 201 });
  } catch (error: any) {
    console.error('Error creating idea:', error);
    const isDbError = error.name === "PrismaClientInitializationError";
    return NextResponse.json({ 
      success: false, 
      message: isDbError ? "Database temporarily unavailable - waking up servers" : 'Failed to create idea' 
    }, { status: isDbError ? 503 : 500 });
  }
}

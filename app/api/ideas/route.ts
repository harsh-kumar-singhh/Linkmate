import { NextResponse } from 'next/server';
import { resolveUser } from '@/lib/auth/user';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await resolveUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ideas = await prisma.idea.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(ideas);
  } catch (error) {
    console.error('Error fetching ideas:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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

    const idea = await prisma.idea.create({
      data: {
        userId: user.id,
        content: content.trim(),
      },
    });

    return NextResponse.json(idea, { status: 201 });
  } catch (error) {
    console.error('Error creating idea:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

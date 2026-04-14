import { NextResponse } from 'next/server';
import { resolveUser } from '@/lib/auth/user';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await resolveUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const ideaId = params.id;
    if (!ideaId) {
      return NextResponse.json({ success: false, error: 'Idea ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { used } = body;

    const idea = await prisma.idea.updateMany({
      where: {
        id: ideaId,
        userId: user.id,
      },
      data: {
        used: used,
      },
    });

    if (idea.count === 0) {
      return NextResponse.json({ success: false, error: 'Idea not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Idea updated" });
  } catch (error: any) {
    console.error('Error updating idea:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await resolveUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const ideaId = params.id;
    if (!ideaId) {
      return NextResponse.json({ success: false, error: 'Idea ID is required' }, { status: 400 });
    }

    const idea = await prisma.idea.deleteMany({
      where: {
        id: ideaId,
        userId: user.id,
      },
    });

    if (idea.count === 0) {
      return NextResponse.json({ success: false, error: 'Idea not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Idea deleted" });
  } catch (error: any) {
    console.error('Error deleting idea:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

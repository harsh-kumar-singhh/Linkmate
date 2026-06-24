import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { traceId, eventType, metadata } = body;

    if (!traceId || !eventType) {
      return NextResponse.json({ error: 'Missing traceId or eventType' }, { status: 400 });
    }

    // Record the trace event from the Service Worker
    await prisma.notificationTraceEvent.create({
      data: {
        traceId,
        eventType,
        metadata: metadata || {},
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Failed to record notification trace:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Get the last 100 unique traceIds by looking at the most recent events
    const recentEvents = await prisma.notificationTraceEvent.findMany({
      orderBy: { createdAt: 'desc' },
      select: { traceId: true },
      distinct: ['traceId'],
      take: 100,
    });

    const traceIds = recentEvents.map((e) => e.traceId);

    if (traceIds.length === 0) {
      return NextResponse.json({ traces: [] });
    }

    // 2. Fetch all events for these traceIds
    const allEvents = await prisma.notificationTraceEvent.findMany({
      where: { traceId: { in: traceIds } },
      orderBy: { createdAt: 'asc' }, // Ascending so we can build the timeline chronologically
    });

    // 3. Group and compute the view
    const tracesMap = new Map<string, any>();

    for (const traceId of traceIds) {
      tracesMap.set(traceId, {
        traceId,
        status: 'UNKNOWN',
        publishTimestamp: null,
        dispatchTimestamp: null,
        receiveTimestamp: null,
        displayTimestamp: null,
        clickTimestamp: null,
        events: [],
      });
    }

    for (const event of allEvents) {
      const trace = tracesMap.get(event.traceId);
      if (!trace) continue;

      trace.events.push({
        eventType: event.eventType,
        createdAt: event.createdAt,
        metadata: event.metadata,
      });

      // Update timestamps based on eventType
      if (event.eventType === 'TRIGGERED' || event.eventType === 'PAYLOAD_CREATED') {
        if (!trace.publishTimestamp) trace.publishTimestamp = event.createdAt;
      }
      if (event.eventType === 'DISPATCH_STARTED' || event.eventType === 'DISPATCH_SUCCESS' || event.eventType === 'DISPATCH_FAILURE') {
        if (!trace.dispatchTimestamp) trace.dispatchTimestamp = event.createdAt;
      }
      if (event.eventType === 'SW_RECEIVED') {
        if (!trace.receiveTimestamp) trace.receiveTimestamp = event.createdAt;
      }
      if (event.eventType === 'DISPLAY_SUCCESS' || event.eventType === 'DISPLAY_FAILURE') {
        if (!trace.displayTimestamp) trace.displayTimestamp = event.createdAt;
      }
      if (event.eventType === 'CLICKED') {
        if (!trace.clickTimestamp) trace.clickTimestamp = event.createdAt;
      }

      // Compute final status (latest meaningful event)
      trace.status = event.eventType;
    }

    // Return an array sorted by most recently active first
    const sortedTraces = Array.from(tracesMap.values()).sort((a, b) => {
      const tA = a.publishTimestamp || a.events[0]?.createdAt || 0;
      const tB = b.publishTimestamp || b.events[0]?.createdAt || 0;
      return new Date(tB).getTime() - new Date(tA).getTime();
    });

    return NextResponse.json({ traces: sortedTraces });
  } catch (error) {
    console.error('[API] Failed to fetch notification debug dashboard:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

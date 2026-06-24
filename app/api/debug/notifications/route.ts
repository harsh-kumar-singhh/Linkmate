import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    // ── 1. Pull last 100 distinct traceIds ─────────────────────────────────
    const recentEvents = await prisma.notificationTraceEvent.findMany({
      orderBy: { createdAt: 'desc' },
      select: { traceId: true },
      distinct: ['traceId'],
      take: 100,
    });

    const traceIds = recentEvents.map((e) => e.traceId);

    if (traceIds.length === 0) {
      return NextResponse.json({ traces: [], subscriptions: [] });
    }

    // ── 2. Pull all events for those traces ────────────────────────────────
    const allEvents = await prisma.notificationTraceEvent.findMany({
      where: { traceId: { in: traceIds } },
      orderBy: { createdAt: 'asc' },
    });

    // ── 3. Pull subscription metadata ─────────────────────────────────────
    const subscriptionFilter = userId ? { userId } : {};
    const subscriptions = await prisma.pushSubscription.findMany({
      where: subscriptionFilter,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        endpoint: true,
        browser: true,
        deviceType: true,
        isActive: true,
        createdAt: true,
        lastSeenAt: true,
        updatedAt: true,
      },
    });

    // ── 4. Group events by traceId and build per-device breakdown ─────────
    interface DeviceTimeline {
      subscriptionId: string;
      dispatchStarted: string | null;
      dispatchSuccess: string | null;
      dispatchFailure: string | null;
      swReceived: string | null;
      showNotificationStarted: string | null;
      showNotificationSuccess: string | null;
      displayFailure: string | null;
      clicked: string | null;
    }

    interface TraceView {
      traceId: string;
      status: string;
      publishTimestamp: string | null;
      deliverySummary: Record<string, any> | null;
      events: { eventType: string; createdAt: Date; metadata: any }[];
      byDevice: Record<string, DeviceTimeline>;
    }

    const tracesMap = new Map<string, TraceView>();

    for (const traceId of traceIds) {
      tracesMap.set(traceId, {
        traceId,
        status: 'UNKNOWN',
        publishTimestamp: null,
        deliverySummary: null,
        events: [],
        byDevice: {},
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

      trace.status = event.eventType;

      const meta = (event.metadata ?? {}) as Record<string, any>;
      const ts = event.createdAt.toISOString();

      if (event.eventType === 'TRIGGERED' || event.eventType === 'PAYLOAD_CREATED') {
        if (!trace.publishTimestamp) trace.publishTimestamp = ts;
      }

      if (event.eventType === 'DELIVERY_SUMMARY') {
        trace.deliverySummary = meta;
      }

      // Per-device breakdown — keyed on subscriptionId if present
      const subId: string | null = meta.subscription ?? meta.subscriptionId ?? null;
      if (subId) {
        if (!trace.byDevice[subId]) {
          trace.byDevice[subId] = {
            subscriptionId: subId,
            dispatchStarted: null,
            dispatchSuccess: null,
            dispatchFailure: null,
            swReceived: null,
            showNotificationStarted: null,
            showNotificationSuccess: null,
            displayFailure: null,
            clicked: null,
          };
        }
        const dev = trace.byDevice[subId];
        if (event.eventType === 'DISPATCH_STARTED' && !dev.dispatchStarted) dev.dispatchStarted = ts;
        if (event.eventType === 'DISPATCH_SUCCESS' && !dev.dispatchSuccess) dev.dispatchSuccess = ts;
        if ((event.eventType === 'DISPATCH_FAILURE' || event.eventType === 'DISPATCH_STALE_DEACTIVATED') && !dev.dispatchFailure) dev.dispatchFailure = ts;
        if (event.eventType === 'SW_RECEIVED' && !dev.swReceived) dev.swReceived = ts;
        if (event.eventType === 'SHOW_NOTIFICATION_STARTED' && !dev.showNotificationStarted) dev.showNotificationStarted = ts;
        if (event.eventType === 'SHOW_NOTIFICATION_SUCCESS' && !dev.showNotificationSuccess) dev.showNotificationSuccess = ts;
        if ((event.eventType === 'DISPLAY_FAILURE') && !dev.displayFailure) dev.displayFailure = ts;
        if ((event.eventType === 'NOTIFICATION_CLICKED') && !dev.clicked) dev.clicked = ts;
      }
    }

    // Sort by newest first
    const sortedTraces = Array.from(tracesMap.values()).sort((a, b) => {
      const tA = a.publishTimestamp ?? a.events[0]?.createdAt.toISOString() ?? '';
      const tB = b.publishTimestamp ?? b.events[0]?.createdAt.toISOString() ?? '';
      return tB.localeCompare(tA);
    });

    // ── 5. Enrich subscriptions with last push info ────────────────────────
    // Find, per subscription, the last trace events that mention it
    const subscriptionLastEvents: Record<string, {
      lastDispatched: string | null;
      lastReceived: string | null;
      lastDisplayed: string | null;
    }> = {};

    for (const event of allEvents) {
      const meta = (event.metadata ?? {}) as Record<string, any>;
      const subId: string | null = meta.subscription ?? meta.subscriptionId ?? null;
      if (!subId) continue;
      if (!subscriptionLastEvents[subId]) {
        subscriptionLastEvents[subId] = { lastDispatched: null, lastReceived: null, lastDisplayed: null };
      }
      const entry = subscriptionLastEvents[subId];
      const ts = event.createdAt.toISOString();
      if (event.eventType === 'DISPATCH_SUCCESS') entry.lastDispatched = ts;
      if (event.eventType === 'SW_RECEIVED') entry.lastReceived = ts;
      if (event.eventType === 'SHOW_NOTIFICATION_SUCCESS') entry.lastDisplayed = ts;
    }

    const enrichedSubscriptions = subscriptions.map((s) => ({
      ...s,
      lastDispatched: subscriptionLastEvents[s.id]?.lastDispatched ?? null,
      lastReceived: subscriptionLastEvents[s.id]?.lastReceived ?? null,
      lastDisplayed: subscriptionLastEvents[s.id]?.lastDisplayed ?? null,
      endpointPreview: s.endpoint.slice(0, 60) + '...',
    }));

    return NextResponse.json({
      traces: sortedTraces,
      subscriptions: enrichedSubscriptions,
    });
  } catch (error) {
    console.error('[API/debug/notifications] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

// ============================================================
// Tracing Helper
// ============================================================
export async function logNotificationTrace(traceId: string, eventType: string, metadata?: Record<string, any>) {
  try {
    const metaString = metadata ? Object.entries(metadata).map(([k, v]) => `${k}=${v}`).join(' | ') : '';
    console.log(`[TRACE_NOTIFICATION] ${eventType} | traceId=${traceId} ${metaString ? '| ' + metaString : ''}`);
    await prisma.notificationTraceEvent.create({
      data: {
        traceId,
        eventType,
        metadata: metadata ? metadata : undefined,
      }
    });
  } catch (error) {
    console.error('[TRACE_NOTIFICATION] Failed to save trace event to DB:', error);
  }
}

// ============================================================
// VAPID Configuration
// ============================================================
let vapidInitialized = false;

function initVapid() {
  if (vapidInitialized) return;

  const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const privKey = process.env.VAPID_PRIVATE_KEY;
  let email = process.env.VAPID_EMAIL || 'mailto:support@linkmate.com';

  // Auto-fix missing mailto: prefix
  if (email && !email.startsWith('mailto:') && !email.startsWith('https://')) {
    email = `mailto:${email}`;
  }

  if (pubKey && privKey) {
    webpush.setVapidDetails(email, pubKey, privKey);
    vapidInitialized = true;
  } else {
    // Explicit diagnostic logging to pinpoint exactly which key is missing
    console.error(
      `[NOTIFICATIONS] VAPID keys are missing in this environment runtime! ` +
      `NEXT_PUBLIC_VAPID_PUBLIC_KEY: ${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? '✅ PRESENT' : '❌ MISSING'} | ` +
      `VAPID_PRIVATE_KEY: ${process.env.VAPID_PRIVATE_KEY ? '✅ PRESENT' : '❌ MISSING'}`
    );
  }
}

// ============================================================
// Allowed Events
// ============================================================
const ALLOWED_NOTIFICATION_EVENTS = [
  'scheduled_post_published',
  'scheduled_post_failed',
  'pro_plan_limit_approaching',
  'pro_plan_limit_reached',
  'subscription_payment_failed',
  'subscription_renewed',
  'trial_or_plan_expiry_warning',
  'draft_saved',
] as const;

type AllowedNotificationEvent = typeof ALLOWED_NOTIFICATION_EVENTS[number];

// ============================================================
// Intelligence Layer
// ============================================================
async function shouldSendNotification(userId: string, type: string): Promise<boolean> {
  if (!ALLOWED_NOTIFICATION_EVENTS.includes(type as AllowedNotificationEvent)) {
    console.log(`[NOTIFICATIONS] Suppressed ${type} - not in allowed events list`);
    return false;
  }
  return true;
}

async function getUserSegment(userId: string): Promise<'NEW' | 'CASUAL' | 'POWER'> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: { posts: { where: { status: 'PUBLISHED' } } },
      },
    },
  });

  const publishedCount = user?._count.posts || 0;
  let segment: 'NEW' | 'CASUAL' | 'POWER' = 'NEW';
  if (publishedCount > 15) segment = 'POWER';
  else if (publishedCount > 3) segment = 'CASUAL';

  if (user?.engagementSegment !== segment) {
    await prisma.user.update({
      where: { id: userId },
      data: { engagementSegment: segment },
    }).catch(console.error);
  }

  return segment;
}

// ============================================================
// Core Push Sender
// ============================================================
export async function sendPushNotification(
  userId: string,
  payload: {
    title: string;
    body: string;
    url?: string;
    type: string;
    // Optional: pass a unique tag per post to prevent duplicates
    tag?: string;
    traceId?: string;
  },
  bypassIntelligence = false
) {
  const traceId = payload.traceId || `TRACE_NOTIFICATION_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  await logNotificationTrace(traceId, 'PAYLOAD_CREATED', { type: payload.type, userId });

  // Ensure VAPID keys are set
  initVapid();

  // Hard guard: never send unapproved types
  if (!ALLOWED_NOTIFICATION_EVENTS.includes(payload.type as AllowedNotificationEvent)) {
    console.warn(`[NOTIFICATIONS] Blocked unapproved type: ${payload.type}`);
    return;
  }

  if (!bypassIntelligence) {
    const shouldSend = await shouldSendNotification(userId, payload.type);
    if (!shouldSend) {
      await prisma.notification.create({
        data: {
          userId,
          title: payload.title,
          body: payload.body,
          link: payload.url,
          type: payload.type,
          metadata: { suppressedPush: true },
        },
      });
      return;
    }
  }

  const segment = await getUserSegment(userId);
  const timestamp = new Date().toISOString();

  // Only dispatch to active subscriptions
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId, isActive: true },
  });

  await logNotificationTrace(traceId, 'SUBSCRIPTIONS_FOUND', {
    count: subscriptions.length,
    userId,
    devices: subscriptions.map(s => `${s.id}(${s.deviceType ?? 'Unknown'}/${s.browser ?? 'Unknown'})`).join(', '),
  });

  if (subscriptions.length === 0) {
    console.warn(
      `[NOTIFICATIONS] No active push subscriptions for user ${userId}. ` +
      'Push will NOT be delivered. In-app record will still be created.'
    );
  }

  // Send to all registered active devices in parallel
  // Build per-device payload so subscriptionId + deviceType are embedded in each push.
  const pushResults = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      // Per-device payload — injecting subscriptionId so the SW can report it back
      const devicePayload = JSON.stringify({
        traceId,
        subscriptionId: sub.id,
        title: payload.title,
        body: payload.body,
        url: payload.url || '/dashboard',
        type: payload.type,
        icon: '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png',
        timestamp,
        tag: payload.tag || payload.type,
        data: {
          traceId,
          subscriptionId: sub.id,
          url: payload.url || '/dashboard',
          type: payload.type,
          tag: payload.tag || payload.type,
          timestamp,
        },
      });

      await logNotificationTrace(traceId, 'DISPATCH_STARTED', {
        subscription: sub.id,
        deviceType: sub.deviceType ?? 'Unknown',
        browser: sub.browser ?? 'Unknown',
      });

      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          devicePayload,
          { TTL: 86400, headers: { Urgency: 'high' } }
        );

        // Touch lastSeenAt so we know this subscription is reachable
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastSeenAt: new Date() },
        }).catch(() => {/* non-critical */});

        await logNotificationTrace(traceId, 'DISPATCH_SUCCESS', {
          subscription: sub.id,
          deviceType: sub.deviceType ?? 'Unknown',
          browser: sub.browser ?? 'Unknown',
          endpoint: sub.endpoint.slice(0, 50),
        });
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Soft-deactivate — preserves the row for audit trail
          await prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { isActive: false },
          }).catch(e => console.error('[NOTIFICATIONS] Failed to deactivate stale subscription:', e));

          await logNotificationTrace(traceId, 'DISPATCH_STALE_DEACTIVATED', {
            subscription: sub.id,
            deviceType: sub.deviceType ?? 'Unknown',
            statusCode: error.statusCode,
          });
        } else {
          await logNotificationTrace(traceId, 'DISPATCH_FAILURE', {
            subscription: sub.id,
            deviceType: sub.deviceType ?? 'Unknown',
            browser: sub.browser ?? 'Unknown',
            errorType: error.name || 'Unknown',
            message: error.message,
            statusCode: error.statusCode,
            stack: error.stack,
            endpoint: sub.endpoint.slice(0, 50),
          });
        }
        throw error;
      }
    })
  );

  const sent = pushResults.filter((r) => r.status === 'fulfilled').length;
  const failed = pushResults.filter((r) => r.status === 'rejected').length;

  await logNotificationTrace(traceId, 'DELIVERY_SUMMARY', {
    total: subscriptions.length,
    sent,
    failed,
    devices: subscriptions.map(s => s.deviceType ?? 'Unknown').join(', '),
  });

  console.log(`[NOTIFICATIONS] Delivery summary: ${sent} sent, ${failed} failed out of ${subscriptions.length} subscriptions`);

  // Always create in-app notification record regardless of push delivery outcome
  await prisma.notification.create({
    data: {
      userId,
      title: payload.title,
      body: payload.body,
      link: payload.url,
      type: payload.type,
      metadata: { segment, pushSent: sent, pushFailed: failed, traceId },
    },
  });
}

// ============================================================
// Trigger Helpers
// ============================================================
export async function triggerPostPublishedNotification(
  userId: string,
  postContent: string,
  postId: string
) {
  return sendPostPublishedNotification({ userId, postContent, postId });
}

export async function sendPostPublishedNotification({
  userId,
  postContent,
  postId,
}: {
  userId: string;
  postContent: string;
  postId: string;
}) {
  console.log(`[NOTIFICATIONS] Triggering publish notification | post=${postId} | user=${userId}`);
  const traceId = `TRACE_NOTIFICATION_post_${postId}_${Date.now()}`;
  await logNotificationTrace(traceId, 'TRIGGERED', { postId, userId });

  const snippet = postContent.length > 50 ? postContent.substring(0, 47) + '...' : postContent;
  const segment = await getUserSegment(userId);

  let title = 'Post Published! 🚀';
  let body = `Your post "${snippet}" is now live on LinkedIn.`;

  if (segment === 'NEW') {
    title = 'First Wins! 🎉';
    body = `Great job publishing: "${snippet}". Keep the momentum going!`;
  }

  await sendPushNotification(
    userId,
    {
      title,
      body,
      url: '/dashboard',
      type: 'scheduled_post_published',
      // Use postId as the tag so each post gets its own notification (no collapsing)
      tag: `post-published-${postId}`,
      traceId,
    },
    true // bypass intelligence — post publish is always high-value
  );
}

export async function triggerPostFailedNotification(
  userId: string,
  postContent: string,
  postId: string
) {
  const snippet = postContent.length > 50 ? postContent.substring(0, 47) + '...' : postContent;

  await sendPushNotification(
    userId,
    {
      title: 'Post Failed to Publish ⚠️',
      body: `"${snippet}" could not be published. Tap to review.`,
      url: `/dashboard`,
      type: 'scheduled_post_failed',
      tag: `post-failed-${postId}`,
    },
    true
  );
}

export async function triggerDraftSavedNotification(
  userId: string,
  postContent: string,
  postId: string
) {
  const snippet = postContent.length > 50 ? postContent.substring(0, 47) + '...' : postContent;

  await sendPushNotification(
    userId,
    {
      title: 'Draft Saved 📝',
      body: `Your draft "${snippet}" has been saved safely.`,
      url: `/dashboard`,
      type: 'draft_saved',
      tag: `draft-saved-${postId}`,
    },
    true
  );
}

export async function triggerUpgradePrompt(userId: string, feature: string) {
  await sendPushNotification(
    userId,
    {
      title: 'Limit Reached ✨',
      body: `Upgrade to Pro to continue using ${feature} without limits.`,
      url: '/upgrade',
      type: 'pro_plan_limit_reached',
    },
    true
  );
}

// ============================================================
// Deprecated stubs — kept to avoid import errors
// ============================================================
export async function triggerInactivityReminder(_userId: string) {
  return; // Intentionally removed
}

export async function triggerAICoachFollowUp(_userId: string, _message: string) {
  return; // Intentionally removed
}

// ============================================================
// Cleanup
// ============================================================
export async function cleanupOldNotifications() {
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  try {
    const deleted = await prisma.notification.deleteMany({
      where: { createdAt: { lt: twoDaysAgo } },
    });
    if (deleted.count > 0) {
      console.log(`[NOTIFICATIONS] Cleaned up ${deleted.count} old notifications.`);
    }
    return deleted.count;
  } catch (error) {
    console.error('[NOTIFICATIONS] Cleanup failed:', error);
    return 0;
  }
}

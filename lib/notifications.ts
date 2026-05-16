import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

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
  },
  bypassIntelligence = false
) {
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

  // ============================================================
  // BUG FIX #1 — Diagnostic: log subscription count.
  // If this logs 0, that's your root cause. No subscriptions = no push.
  // You need frontend code that calls navigator.serviceWorker + pushManager.subscribe
  // and POSTs the subscription to /api/push-subscription (see note below).
  // ============================================================
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  console.log(`[NOTIFICATIONS] Found ${subscriptions.length} push subscription(s) for user ${userId}`);

  if (subscriptions.length === 0) {
    console.warn(
      `[NOTIFICATIONS] No push subscriptions for user ${userId}. ` +
      'Push will NOT be delivered. In-app record will still be created. ' +
      'Check that the frontend is registering the service worker and storing subscriptions.'
    );
  }

  // Build the push payload — this is what sw.js receives as event.data.json()
  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/dashboard',
    type: payload.type,
    // Use a unique tag per notification to allow renotify while preventing true duplicates
    tag: payload.tag || payload.type,
  });

  // Send to all registered devices in parallel
  const pushResults = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          pushPayload
        );
        console.log(`[NOTIFICATIONS] Push sent to endpoint: ${sub.endpoint.slice(0, 50)}...`);
      } catch (error: any) {
        console.error(`[NOTIFICATIONS] webpush.sendNotification failed for sub ${sub.id}:`, {
          statusCode: error.statusCode,
          message: error.message,
          endpoint: sub.endpoint.slice(0, 50),
        });

        // 410 Gone or 404 = subscription is dead. Clean it up.
        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(console.error);
          console.log(`[NOTIFICATIONS] Deleted stale subscription ${sub.id}`);
        }

        // Re-throw so Promise.allSettled captures the rejection
        throw error;
      }
    })
  );

  // Log summary
  const sent = pushResults.filter((r) => r.status === 'fulfilled').length;
  const failed = pushResults.filter((r) => r.status === 'rejected').length;
  console.log(`[NOTIFICATIONS] Push delivery summary: ${sent} sent, ${failed} failed out of ${subscriptions.length} subscriptions`);

  // Always create in-app notification record, regardless of push delivery outcome
  await prisma.notification.create({
    data: {
      userId,
      title: payload.title,
      body: payload.body,
      link: payload.url,
      type: payload.type,
      metadata: { segment, pushSent: sent, pushFailed: failed },
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
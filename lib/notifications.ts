import webpush from 'web-push';
import { prisma } from '@/lib/prisma';


// Configure web-push with VAPID keys
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:support@linkmate.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Constants removed since all notifications are product-critical

const ALLOWED_NOTIFICATION_EVENTS = [
  'scheduled_post_published',
  'scheduled_post_failed',
  'pro_plan_limit_approaching',
  'pro_plan_limit_reached',
  'subscription_payment_failed',
  'subscription_renewed',
  'trial_or_plan_expiry_warning'
] as const;

// Cleaned up unused high priority types since all notifications are now critical

/**
 * INTELLIGENCE LAYER: Determine if we should send a notification based on behavior
 */
async function shouldSendNotification(userId: string, type: string): Promise<boolean> {
  // 0. STRICT FILTER: Only allow approved product events
  if (!ALLOWED_NOTIFICATION_EVENTS.includes(type as any)) {
    console.log(`[NOTIFICATIONS] Suppressed ${type} - Not in allowed events list`);
    return false;
  }

  // All allowed events are product-critical, so we always send them.
  // We removed AI Coach messages and non-critical noise to ensure a premium experience.
  return true;
}

/**
 * INTELLIGENCE LAYER: Determine user segment
 */
async function getUserSegment(userId: string): Promise<'NEW' | 'CASUAL' | 'POWER'> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: { posts: { where: { status: 'PUBLISHED' } } }
      }
    }
  });

  const publishedCount = user?._count.posts || 0;
  let segment: 'NEW' | 'CASUAL' | 'POWER' = 'NEW';

  if (publishedCount > 15) segment = 'POWER';
  else if (publishedCount > 3) segment = 'CASUAL';

  // Update segment if it changed
  if (user?.engagementSegment !== segment) {
    await prisma.user.update({
      where: { id: userId },
      data: { engagementSegment: segment }
    }).catch(console.error);
  }

  return segment;
}


export async function sendPushNotification(userId: string, payload: {
  title: string;
  body: string;
  url?: string;
  type: string;
}, bypassIntelligence = false) {
  
  // VALIDATION: Ensure only allowed events can EVER create records
  if (!ALLOWED_NOTIFICATION_EVENTS.includes(payload.type as any)) {
    return;
  }

  if (!bypassIntelligence) {
    const shouldSend = await shouldSendNotification(userId, payload.type);
    if (!shouldSend) {
      // Still create an in-app notification even if push is suppressed (silently)
      // BUT ONLY IF IT IS AN ALLOWED TYPE
      await prisma.notification.create({
        data: {
          userId,
          title: payload.title,
          body: payload.body,
          link: payload.url,
          type: payload.type,
          metadata: { suppressedPush: true }
        },
      });
      return;
    }
  }

  const segment = await getUserSegment(userId);

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const notifications = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload)
      );
    } catch (error: any) {
      console.error('Error sending push notification:', error);
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription has expired or is no longer valid
        await prisma.pushSubscription.delete({
          where: { id: sub.id },
        });
      }
    }
  });

  // Create in-app notification record
  await prisma.notification.create({
    data: {
      userId,
      title: payload.title,
      body: payload.body,
      link: payload.url,
      type: payload.type,
      metadata: { segment }
    },
  });

  await Promise.all(notifications);
}

export async function triggerPostPublishedNotification(userId: string, postContent: string, postId: string) {
  const snippet = postContent.length > 50 ? postContent.substring(0, 47) + '...' : postContent;
  const segment = await getUserSegment(userId);
  
  let title = 'Post Published! 🚀';
  let body = `Your post "${snippet}" is now live.`;

  if (segment === 'NEW') {
    title = 'First Wins! 🎉';
    body = `Great job publishing: "${snippet}".`;
  }

  await sendPushNotification(userId, {
    title,
    body,
    url: '/dashboard',
    type: 'scheduled_post_published',
  }, true); 
}

export async function triggerInactivityReminder(userId: string) {
  // REMOVED: Generic reminders are no longer sent
  return;
}

export async function triggerAICoachFollowUp(userId: string, message: string) {
  // REMOVED: AI Coach messages must never appear in notifications
  return;
}

export async function triggerUpgradePrompt(userId: string, feature: string) {
  await sendPushNotification(userId, {
    title: 'Limit Reached ✨',
    body: `Upgrade to Pro to continue using ${feature} without limits.`,
    url: '/upgrade',
    type: 'pro_plan_limit_reached',
  }, true); 
}

/**
 * Cleanup notifications older than 2 days
 */
export async function cleanupOldNotifications() {
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  try {
    const deleted = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: twoDaysAgo
        }
      }
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


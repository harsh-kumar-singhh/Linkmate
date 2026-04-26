import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { startOfDay } from 'date-fns';

// Configure web-push with VAPID keys
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:support@linkmate.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const MAX_NOTIFICATIONS_PER_DAY = 3;
const COOLDOWN_HOURS = 4;
const HIGH_PRIORITY_TYPES = ['POST_PUBLISHED', 'POST_FAILED', 'UPGRADE'];

/**
 * INTELLIGENCE LAYER: Determine if we should send a notification based on behavior
 */
async function shouldSendNotification(userId: string, type: string): Promise<boolean> {
  // Always send high priority notifications
  if (HIGH_PRIORITY_TYPES.includes(type)) return true;

  const today = startOfDay(new Date());

  // 1. Check daily limit
  const todayCount = await prisma.notification.count({
    where: {
      userId,
      createdAt: { gte: today },
    },
  });

  if (todayCount >= MAX_NOTIFICATIONS_PER_DAY) {
    console.log(`[NOTIFICATIONS] Suppressed ${type} for user ${userId} - Daily limit reached`);
    return false;
  }

  // 2. Check cooldown period
  const lastNotification = await prisma.notification.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (lastNotification) {
    const hoursSinceLast = (Date.now() - lastNotification.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLast < COOLDOWN_HOURS) {
      console.log(`[NOTIFICATIONS] Suppressed ${type} for user ${userId} - In cooldown (${hoursSinceLast.toFixed(1)}h)`);
      return false;
    }
  }

  // 3. Check if user is currently active (suppress push if active in last 15 mins)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastActiveAt: true },
  });

  if (user?.lastActiveAt) {
    const minsSinceActive = (Date.now() - user.lastActiveAt.getTime()) / (1000 * 60);
    if (minsSinceActive < 15 && type !== 'AI_COACH') { // AI coach is contextual, might want to show it
       console.log(`[NOTIFICATIONS] Suppressed ${type} for user ${userId} - User is active`);
       return false;
    }
  }

  // 4. Performance Tracking: Check for repeatedly ignored notification types
  const recentSameTypeNotifications = await prisma.notification.findMany({
    where: { userId, type },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  // If the last 3 notifications of this type were ignored (not clicked), suppress it to reduce spam
  if (recentSameTypeNotifications.length >= 3) {
    const allIgnored = recentSameTypeNotifications.every(n => !n.clicked);
    if (allIgnored) {
       console.log(`[NOTIFICATIONS] Suppressed ${type} for user ${userId} - Type frequently ignored`);
       // We skip sending push but it'll still generate in-app if bypassIntelligence is not set. Wait, this function returns false, so it will generate silently.
       return false;
    }
  }

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
  
  if (!bypassIntelligence) {
    const shouldSend = await shouldSendNotification(userId, payload.type);
    if (!shouldSend) {
      // Still create an in-app notification even if push is suppressed (silently)
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
  let body = `Your post "${snippet}" is now live. Let's see the engagement roll in!`;

  if (segment === 'NEW') {
    title = 'First Wins! 🎉';
    body = `Great job publishing: "${snippet}". Keep the momentum going!`;
  } else if (segment === 'POWER') {
    title = 'Another one live 🔥';
    body = `"${snippet}" is out there. Check your dashboard for early stats.`;
  }

  await sendPushNotification(userId, {
    title,
    body,
    url: '/dashboard',
    type: 'POST_PUBLISHED',
  }, true); // bypass intelligence for publishing
}

export async function triggerInactivityReminder(userId: string) {
  const segment = await getUserSegment(userId);
  
  let title = 'Time to show up! 👋';
  let body = "You haven't scheduled any posts recently. Let's draft something quick!";

  if (segment === 'POWER') {
    title = 'Your audience is waiting ⏳';
    body = "Your streak is slipping. Take 2 mins to queue up your next insightful post.";
  } else if (segment === 'NEW') {
    title = 'Need inspiration? 💡';
    body = "Building a habit takes time. Let the AI Coach suggest your next post idea!";
  }

  await sendPushNotification(userId, {
    title,
    body,
    url: '/dashboard',
    type: 'REMINDER',
  });
}

export async function triggerAICoachFollowUp(userId: string, message: string) {
  const segment = await getUserSegment(userId);
  let title = 'New Strategy Insight 🤖';

  if (segment === 'POWER') {
    title = 'Advanced Tactic Ready ⚡';
  } else if (segment === 'NEW') {
    title = 'Your AI Coach has a tip 💡';
  } else if (segment === 'CASUAL') {
    title = 'Quick Idea for You 🚀';
  }

  await sendPushNotification(userId, {
    title,
    body: message.length > 80 ? message.substring(0, 77) + '...' : message,
    url: '/dashboard', // Changed to dashboard where coach is
    type: 'AI_COACH',
  });
}

export async function triggerUpgradePrompt(userId: string, feature: string) {
  await sendPushNotification(userId, {
    title: 'Unlock Your Full Potential ✨',
    body: `You're crushing it! To keep using ${feature} without limits, consider upgrading to Pro.`,
    url: '/upgrade',
    type: 'UPGRADE',
  }, true); // bypass intelligence for limits
}

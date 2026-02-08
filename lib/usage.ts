
import { getPrisma } from "./prisma";

/**
 * Normalizes a date to the start of the UTC day (00:00:00.000Z)
 */
export function getUTCStartOfDay(date: Date = new Date()): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ));
}

const DAILY_QUOTA = 2;

/**
 * Checks if a user has exceeded their daily AI usage quota and increments it if they haven't.
 * @param userId The ID of the authenticated user
 * @returns Object indicating if the request is allowed and the current count
 */
export async function checkAndIncrementAIQuota(userId: string): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
}> {
  const prisma = getPrisma();
  const today = getUTCStartOfDay();

  try {
    // We use a transaction to ensure atomic increment for correctness
    const result = await prisma.$transaction(async (tx) => {
      // Find or create the usage record for today
      const usage = await tx.aIUsage.upsert({
        where: {
          userId_date: {
            userId: userId,
            date: today,
          },
        },
        create: {
          userId: userId,
          date: today,
          count: 0, // We'll increment below
        },
        update: {}, // No updates needed if it exists, we just want to fetch/create
      });

      if (usage.count >= DAILY_QUOTA) {
        return { allowed: false, currentCount: usage.count };
      }

      // Increment the count
      const updatedUsage = await tx.aIUsage.update({
        where: { id: usage.id },
        data: { count: { increment: 1 } },
      });

      // Log the attempt as required by the spec
      console.log(`[QUOTA] User: ${userId} | Date: ${today.toISOString()} | Count: ${updatedUsage.count} | Allowed: true`);

      return { allowed: true, currentCount: updatedUsage.count };
    });

    return { ...result, limit: DAILY_QUOTA };

  } catch (error) {
    console.error("[QUOTA] Error checking AI quota:", error);
    // Fail safe: if there's a DB error, we might want to block or allow.
    // Given it's a "must not depend on OpenRouter credit limits" and "production-safe" constraint,
    // we should probably block if the quota system itself fails, or allow if we want to prioritize UX.
    // The requirement says "Enforce a strict per-user AI usage limit".
    // I will return allowed: false if the DB fails to be safe about costs.
    return { allowed: false, currentCount: -1, limit: DAILY_QUOTA };
  }
}

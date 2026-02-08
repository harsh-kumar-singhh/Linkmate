import { getPrisma } from "./prisma";
import { AIUsageType } from "@prisma/client";

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
 * @param type The type of AI usage to check (Post Generation vs Coach)
 * @returns Object indicating if the request is allowed and the current count
 */
export async function checkAndIncrementAIQuota(userId: string, type: AIUsageType): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
}> {
  const prisma = getPrisma();
  const today = getUTCStartOfDay();

  try {
    // --- ROBUSTNESS: Verify user exists before touching AIUsage ---
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      console.warn(`[QUOTA] Attempted to check quota for non-existent user: ${userId}`);
      return { allowed: false, currentCount: -1, limit: DAILY_QUOTA };
    }

    // We use a transaction to ensure atomic increment for correctness
    const result = await prisma.$transaction(async (tx) => {
      // Find or create the usage record for today and this specific type
      const usage = await tx.aIUsage.upsert({
        where: {
          userId_date_type: {
            userId: userId,
            date: today,
            type: type,
          },
        },
        create: {
          userId: userId,
          date: today,
          type: type,
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
      console.log(`[QUOTA] [${type}] User: ${userId} | Date: ${today.toISOString()} | Count: ${updatedUsage.count} | Allowed: true`);

      return { allowed: true, currentCount: updatedUsage.count };
    });

    return { ...result, limit: DAILY_QUOTA };

  } catch (error) {
    console.error(`[QUOTA] Error checking AI quota for ${type}:`, error);
    // Fail safe to protect costs
    return { allowed: false, currentCount: -1, limit: DAILY_QUOTA };
  }
}

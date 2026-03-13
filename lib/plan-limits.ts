import { getPrisma } from "@/lib/prisma"
import { startOfDay } from "date-fns"

export const PLAN_LIMITS = {
  free: {
    aiPostsPerDay: 2,
    writingStyles: 1,
    scheduledPostsPerMonth: 10,
    autopilot: false,
  },
  pro: {
    aiPostsPerDay: Infinity,
    writingStyles: Infinity,
    scheduledPostsPerMonth: Infinity,
    autopilot: true,
  },
} as const

export type PlanType = "free" | "pro"

/**
 * Checks if the user has reached their daily AI post generation limit.
 */
export async function hasReachedDailyPostLimit(userId: string, plan: string = "free"): Promise<boolean> {
  const userPlan = (plan?.toUpperCase() === "PRO" ? "pro" : "free") as PlanType
  const limit = PLAN_LIMITS[userPlan].aiPostsPerDay

  if (limit === Infinity) return false

  const prisma = getPrisma()
  const today = startOfDay(new Date())

  const usage = await prisma.aIUsage.findUnique({
    where: {
      userId_date_type: {
        userId,
        date: today,
        type: "AI_POST_GENERATION",
      },
    },
  })

  return (usage?.count || 0) >= limit
}

/**
 * Checks if the user can add another writing style.
 */
export async function canAddWritingStyle(userId: string, plan: string = "free"): Promise<boolean> {
  const userPlan = (plan?.toUpperCase() === "PRO" ? "pro" : "free") as PlanType
  const limit = PLAN_LIMITS[userPlan].writingStyles

  if (limit === Infinity) return false

  const prisma = getPrisma()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { writingStyles: true },
  })

  const styles = (user?.writingStyles as any[]) || []
  return styles.length < limit
}

/**
 * Checks if the user can schedule another post this month.
 */
export async function canSchedulePost(userId: string, plan: string = "free"): Promise<boolean> {
  const userPlan = (plan?.toUpperCase() === "PRO" ? "pro" : "free") as PlanType
  const limit = PLAN_LIMITS[userPlan].scheduledPostsPerMonth

  if (limit === Infinity) return false

  const prisma = getPrisma()
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const count = await prisma.post.count({
    where: {
      userId,
      status: "SCHEDULED",
      scheduledFor: {
        gte: startOfMonth,
      },
    },
  })

  return count < limit
}

/**
 * Checks if the user has access to autopilot.
 */
export function hasAutopilotAccess(plan: string = "free"): boolean {
  const userPlan = (plan?.toUpperCase() === "PRO" ? "pro" : "free") as PlanType
  return PLAN_LIMITS[userPlan].autopilot
}

"use client"

// app/activity/ActivityClient.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Receives pre-fetched initialData from the Server Component.
// No loading spinners, no waterfall — content renders on first paint.
// React Query handles silent background revalidation after staleTime elapses.
// ─────────────────────────────────────────────────────────────────────────────

import { AnimatedCard } from "@/components/animated/AnimatedCard"
import {
  Zap,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  PenTool,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AICoach } from "@/components/ai/AICoach"
import { useQuery } from "@tanstack/react-query"
import type { ActivityData } from "@/lib/data/activity"

interface ActivityClientProps {
  initialData: ActivityData
}

export default function ActivityClient({ initialData }: ActivityClientProps) {
  // initialData pre-populates the cache — no loading state on first render.
  // React Query silently refetches in the background after 60s.
  const { data } = useQuery<ActivityData>({
    queryKey: ["activity"],
    queryFn: async () => {
      const res = await fetch("/api/activity")
      if (!res.ok) throw new Error("Failed to fetch activity")
      return res.json()
    },
    initialData,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })

  const stats = data?.stats

  const activityCards = [
    {
      title: "Total Posts Published",
      value: stats?.totalPostsPublished ?? 0,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      label: "Lifetime total via LinkMate",
    },
    {
      title: "Avg Posts Per Week",
      value: stats?.avgPostsPerWeek ?? "0.0",
      icon: TrendingUp,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      label: "Over the last 30 days",
    },
    {
      title: "AI Usage This Week",
      value: stats?.aiUsageThisWeek ?? 0,
      icon: Sparkles,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      label: "Drafts and coaching sessions",
    },
    {
      title: "Consistency Score",
      value: stats ? `${stats.consistencyScore}%` : "0%",
      icon: PenTool,
      color: "text-primary",
      bg: "bg-primary/10",
      label: `Posted on ${stats?.activeDaysLast15 ?? 0} of the last 15 days`,
    },
  ]

  const chartValues = data?.chartData?.data ?? []
  const chartLabels = data?.chartData?.labels ?? []
  const maxCount = Math.max(...chartValues, 1)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 md:px-0 space-y-10 pb-24">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Activity
        </h1>
        <p className="text-muted-foreground text-sm font-medium">
          Track your consistency and habits inside LinkMate
        </p>
      </div>

      {/* ── Metrics grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {activityCards.map((card, i) => (
          <AnimatedCard
            key={i}
            animation="fade-in-up"
            className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {card.title}
              </span>
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", card.bg)}>
                <card.icon className={cn("w-3.5 h-3.5", card.color)} />
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight truncate">
                {card.value}
              </h2>
              <p className="text-[10px] text-muted-foreground font-medium">
                {card.label}
              </p>
            </div>
          </AnimatedCard>
        ))}
      </div>

      {/* ── Bar chart ───────────────────────────────────────────────────────── */}
      <AnimatedCard
        animation="fade-in-up"
        className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight">
            Posts Published (Last 15 Days)
          </h3>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
            <Zap className="w-3 h-3" />
            {stats?.postingStreak ?? 0}{" "}
            {stats?.postingStreak === 1 ? "Day" : "Days"} Streak
          </div>
        </div>

        <div className="h-56 w-full flex items-end justify-between gap-1 md:gap-2 px-1">
          {chartValues.map((count, i) => {
            const pct = count === 0 ? 0 : (count / maxCount) * 100
            const barHeight = count > 0 ? Math.max(pct, 5) : 2

            return (
              <div
                key={i}
                className="flex-1 h-full flex flex-col items-center justify-end gap-2 group cursor-pointer relative"
              >
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] font-bold px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none border border-border">
                  {count === 1 ? "1 post" : `${count} posts`}
                  {chartLabels[i] && (
                    <span className="opacity-50 ml-1">
                      ({chartLabels[i].slice(5)})
                    </span>
                  )}
                </div>

                <div
                  className={cn(
                    "w-full max-w-[24px] rounded-t-sm transition-all duration-500 ease-out",
                    count > 0 ? "bg-primary" : "bg-muted/30"
                  )}
                  style={{ height: `${barHeight}%` }}
                />
              </div>
            )
          })}
        </div>
      </AnimatedCard>

      {/* ── Consistency tip ──────────────────────────────────────────────────── */}
      <AnimatedCard
        animation="fade-in-up"
        className="bg-primary/5 border border-primary/20 rounded-3xl p-6 md:p-8"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold">Why Consistency Matters</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The LinkedIn algorithm rewards creators who post regularly.
              Maintaining a streak not only builds your personal brand but also
              establishes a reliable habit that leads to long-term growth. Stick
              to it!
            </p>
          </div>
        </div>
      </AnimatedCard>

      <AICoach />
    </div>
  )
}
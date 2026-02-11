"use client"

import { useState, useEffect } from "react"
import { AnimatedCard } from "@/components/animated/AnimatedCard"
import {
    Zap,
    CheckCircle2,
    Calendar,
    Sparkles,
    Loader2,
    TrendingUp,
    PenTool
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AICoach } from "@/components/ai/AICoach"

export default function ActivityPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [statsData, setStatsData] = useState<any>(null)

    const fetchStats = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(`/api/activity`)
            const data = await response.json()
            setStatsData(data)
        } catch (error) {
            console.error("Failed to fetch activity stats", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchStats()
    }, [])

    const activityCards = [
        {
            title: "Total Posts Published",
            value: statsData?.stats?.totalPostsPublished || "0",
            icon: CheckCircle2,
            color: "text-emerald-500",
            label: "Lifetime total via LinkMate"
        },
        {
            title: "Average Posts Per Week",
            value: statsData?.stats?.avgPostsPerWeek || "0.0",
            icon: TrendingUp,
            color: "text-blue-500",
            label: "Over the last 30 days"
        },
        {
            title: "AI Usage This Week",
            value: statsData?.stats?.aiUsageThisWeek || "0",
            icon: Sparkles,
            color: "text-amber-500",
            label: "Drafts and coaching sessions"
        },
        {
            title: "Consistency Score",
            value: statsData ? `${statsData.stats.consistencyScore}%` : "0%",
            icon: PenTool,
            color: "text-primary",
            label: `You posted on ${statsData?.stats?.activeDaysLast15 || 0} of the last 15 days`
        }
    ]

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 md:px-0 space-y-10 pb-24">
            {/* Header Section */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Activity</h1>
                <p className="text-muted-foreground text-sm font-medium">Track your consistency and habits inside LinkMate</p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                </div>
            ) : (
                <>
                    {/* Activity Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {activityCards.map((card, i) => (
                            <AnimatedCard key={i} animation="fade-in-up" className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{card.title}</span>
                                    <card.icon className={cn("w-4 h-4", card.color)} />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold tracking-tight truncate">{card.value}</h2>
                                    <p className="text-[10px] text-muted-foreground font-medium">{card.label}</p>
                                </div>
                            </AnimatedCard>
                        ))}
                    </div>

                    {/* Posts Published Chart Section */}
                    <AnimatedCard animation="fade-in-up" className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold tracking-tight">Posts Published (Last 15 Days)</h3>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                                <Zap className="w-3 h-3" />
                                {statsData?.stats?.postingStreak} {statsData?.stats?.postingStreak === 1 ? 'Day' : 'Days'} Streak
                            </div>
                        </div>

                        <div className="h-48 w-full flex items-end justify-between gap-1 md:gap-2 px-1">
                            {statsData?.chartData?.data?.map((count: number, i: number) => {
                                const maxCount = Math.max(...(statsData.chartData.data || [1]), 1);
                                const h = (count / maxCount) * 100;

                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-default">
                                        <div className="relative w-full flex flex-col items-center h-full justify-end">
                                            {/* Tooltip */}
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                                                {count === 1 ? "1 post" : `${count} posts`}
                                                <span className="opacity-50 ml-1">({statsData.chartData.labels[i].slice(5)})</span>
                                            </div>
                                            {/* Bar */}
                                            <div
                                                className={cn(
                                                    "w-full transition-all rounded-t-lg",
                                                    count > 0 ? "bg-primary" : "bg-zinc-100 dark:bg-zinc-800"
                                                )}
                                                style={{ height: `${Math.max(h, 4)}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">
                            <span>15 days ago</span>
                            <span>Yesterday</span>
                            <span className="text-primary">Today</span>
                        </div>
                    </AnimatedCard>

                    {/* Consistency Tip */}
                    <AnimatedCard animation="fade-in-up" className="bg-primary/5 border border-primary/20 rounded-3xl p-6 md:p-8">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                <Zap className="w-6 h-6 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold">Why Consistency Matters</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    The LinkedIn algorithm rewards creators who post regularly. Maintaining a streak not only builds your personal brand but also establishes a reliable habit that leads to long-term growth. Stick to it!
                                </p>
                            </div>
                        </div>
                    </AnimatedCard>
                </>
            )}

            <AICoach />
        </div>
    )
}

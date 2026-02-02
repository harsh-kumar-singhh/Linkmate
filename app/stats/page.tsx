"use client"

import { useState, useEffect } from "react"
import { AnimatedCard } from "@/components/animated/AnimatedCard"
import {
    Eye,
    Heart,
    MessageCircle,
    TrendingUp,
    Download,
    ChevronDown,
    Plus,
    Calendar,
    BarChart3,
    Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AICoach } from "@/components/ai/AICoach"

export default function StatsPage() {
    const [dateRange, setDateRange] = useState("Last 30 days")
    const [isLoading, setIsLoading] = useState(true)
    const [statsData, setStatsData] = useState<any>(null)
    const [isSelecting, setIsSelecting] = useState(false)

    const fetchStats = async (range: string) => {
        setIsLoading(true)
        const days = range === "Last 7 days" ? 7 : range === "Last 14 days" ? 14 : range === "Last 90 days" ? 90 : 30
        try {
            const response = await fetch(`/api/stats?days=${days}`)
            const data = await response.json()
            setStatsData(data)
        } catch (error) {
            console.error("Failed to fetch stats", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchStats(dateRange)
    }, [dateRange])

    const ranges = ["Last 7 days", "Last 14 days", "Last 30 days", "Last 90 days"]

    const statCards = [
        { title: "Total Views", value: statsData?.stats?.totalViews || "0", icon: Eye, color: "text-blue-500", label: "From all your posts" },
        { title: "Total Likes", value: statsData?.stats?.totalLikes || "0", icon: Heart, color: "text-red-500", label: "Total engagement" },
        { title: "Comments", value: statsData?.stats?.totalComments || "0", icon: MessageCircle, color: "text-green-500", label: "Total interactions" },
        { title: "Avg Engagement", value: statsData?.stats?.avgEngagement || "0%", icon: TrendingUp, color: "text-orange-500", label: "Engagement rate" }
    ]

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 md:px-0 space-y-8 pb-24">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics</h1>
                    <p className="text-muted-foreground text-sm font-medium">Track your LinkedIn performance</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group flex-1 md:flex-none">
                        <Button
                            variant="outline"
                            className="w-full md:w-auto h-10 px-4 rounded-xl border-border/80 gap-2 font-bold text-sm"
                            onClick={() => setIsSelecting(!isSelecting)}
                        >
                            {dateRange}
                            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isSelecting && "rotate-180")} />
                        </Button>

                        {isSelecting && (
                            <div className="absolute top-full mt-2 left-0 w-full md:w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                {ranges.map((range) => (
                                    <button
                                        key={range}
                                        className={cn(
                                            "w-full px-4 py-2.5 text-sm font-medium text-left hover:bg-secondary/50 transition-colors",
                                            dateRange === range ? "text-primary bg-primary/5" : "text-muted-foreground"
                                        )}
                                        onClick={() => {
                                            setDateRange(range)
                                            setIsSelecting(false)
                                        }}
                                    >
                                        {range}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                </div>
            ) : (
                <>
                    {/* Summary Cards Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {statCards.map((stat, i) => (
                            <AnimatedCard key={i} animation="fade-in-up" className="bg-card border border-border/60 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.title}</span>
                                    <stat.icon className={cn("w-4 h-4", stat.color)} />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-bold tracking-tight">{stat.value}</h2>
                                    <p className="text-[10px] text-muted-foreground font-medium">{stat.label}</p>
                                </div>
                            </AnimatedCard>
                        ))}
                    </div>

                    {/* Engagement Chart Section */}
                    {statsData?.chartData?.length > 0 && (
                        <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold tracking-tight">Post Views (Last 15 Posts)</h3>
                                <BarChart3 className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="h-48 w-full flex items-end justify-between gap-2 md:gap-4 px-2">
                                {statsData.chartData.map((d: any, i: number) => {
                                    const maxViews = Math.max(...statsData.chartData.map((x: any) => x.views), 1);
                                    const h = (d.views / maxViews) * 100;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                            <div
                                                className="w-full bg-primary/20 hover:bg-primary/40 transition-colors rounded-t-lg relative group cursor-pointer"
                                                style={{ height: `${Math.max(h, 5)}%` }}
                                            >
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                    {d.views} views
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">
                                <span>Earlier Posts</span>
                                <span>Recent Posts</span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Best Performing Post */}
                        <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold tracking-tight">Best Performing Post</h3>
                            </div>

                            {statsData?.bestPost ? (
                                <div className="p-5 rounded-2xl bg-secondary/10 border border-border/40 space-y-4">
                                    <p className="text-sm font-medium text-foreground line-clamp-3 leading-relaxed">
                                        &quot;{statsData.bestPost.content}&quot;
                                    </p>
                                    <div className="flex items-center justify-between pt-2 border-t border-border/20">
                                        <div className="flex gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Views</span>
                                                <span className="text-sm font-bold">{statsData.bestPost.views}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Likes</span>
                                                <span className="text-sm font-bold">{statsData.bestPost.likes}</span>
                                            </div>
                                        </div>
                                        <div className="bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold font-mono">
                                            {statsData.bestPost.engagementRate} Eng.
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground italic bg-secondary/5 rounded-2xl border border-dashed border-border">
                                    No published posts in this range
                                </div>
                            )}
                        </div>

                        {/* Worst Performing Post */}
                        <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                                    <TrendingUp className="w-5 h-5 rotate-180" />
                                </div>
                                <h3 className="text-xl font-bold tracking-tight text-red-500/80">Worst Performing Post</h3>
                            </div>

                            {statsData?.worstPost ? (
                                <div className="p-5 rounded-2xl bg-secondary/10 border border-border/40 space-y-4 opacity-80 transition-opacity hover:opacity-100">
                                    <p className="text-sm font-medium text-foreground line-clamp-3 leading-relaxed">
                                        &quot;{statsData.worstPost.content}&quot;
                                    </p>
                                    <div className="flex items-center justify-between pt-2 border-t border-border/20">
                                        <div className="flex gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Views</span>
                                                <span className="text-sm font-bold">{statsData.worstPost.views}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Likes</span>
                                                <span className="text-sm font-bold">{statsData.worstPost.likes}</span>
                                            </div>
                                        </div>
                                        <div className="bg-red-500/10 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold font-mono">
                                            {statsData.worstPost.engagementRate} Eng.
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground italic bg-secondary/5 rounded-2xl border border-dashed border-border">
                                    No published posts in this range
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            <AICoach />
        </div>
    )
}

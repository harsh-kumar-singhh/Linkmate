"use client"

import { useState } from "react"
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
    BarChart3
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function StatsPage() {
    const [dateRange, setDateRange] = useState("Last 30 days")

    const stats = [
        { title: "Total Views", value: "0", icon: Eye, color: "text-blue-500", label: "From all your posts" },
        { title: "Total Likes", value: "0", icon: Heart, color: "text-red-500", label: "Total engagement" },
        { title: "Comments", value: "0", icon: MessageCircle, color: "text-green-500", label: "Total interactions" },
        { title: "Avg Engagement", value: "0.0%", icon: TrendingUp, color: "text-orange-500", label: "Engagement rate" }
    ]

    const bestTimes = [
        { day: "Monday", time: "9:00 AM", level: "High", color: "text-blue-600 bg-blue-50" },
        { day: "Wednesday", time: "11:00 AM", level: "Very High", color: "text-emerald-600 bg-emerald-50" },
        { day: "Friday", time: "2:00 PM", level: "Medium", color: "text-amber-600 bg-amber-50" }
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
                        <Button variant="outline" className="w-full md:w-auto h-10 px-4 rounded-xl border-border/80 gap-2 font-bold text-sm">
                            {dateRange}
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </Button>
                    </div>
                    <Button variant="outline" className="flex-1 md:flex-none h-10 px-4 rounded-xl border-border/80 gap-2 font-bold text-sm">
                        <Download className="w-4 h-4" />
                        Download Report
                    </Button>
                </div>
            </div>

            {/* Summary Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
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
            <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold tracking-tight">Engagement Over Time</h3>
                    <BarChart3 className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="h-48 w-full flex items-end justify-between gap-2 md:gap-4 px-2">
                    {[35, 65, 45, 85, 55, 95, 75, 60, 40, 50, 90, 70, 80, 100, 75].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                            <div
                                className="w-full bg-primary/20 hover:bg-primary/40 transition-colors rounded-t-lg relative group cursor-pointer"
                                style={{ height: `${h}%` }}
                            >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {h} pts
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">
                    <span>Week 1</span>
                    <span>Week 2</span>
                    <span>Week 3</span>
                    <span>Week 4</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Top Performing Posts - Empty State */}
                <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <h3 className="text-xl font-bold tracking-tight">Top Performing Posts</h3>
                    </div>
                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                        <div className="w-12 h-12 bg-secondary/50 rounded-full flex items-center justify-center text-muted-foreground">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <p className="text-sm text-muted-foreground max-w-[200px] font-medium leading-relaxed">
                            No posts yet. Create your first post to see analytics!
                        </p>
                    </div>
                </div>

                {/* Best Times to Post Section */}
                <div className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                    <h3 className="text-xl font-bold tracking-tight">Best Times to Post</h3>
                    <div className="space-y-3">
                        {bestTimes.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/10 border border-border/40 hover:bg-secondary/20 transition-colors cursor-default">
                                <div className="space-y-0.5">
                                    <h4 className="font-bold text-sm font-inter">{item.day}</h4>
                                    <p className="text-xs text-muted-foreground font-medium">{item.time}</p>
                                </div>
                                <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider", item.color)}>
                                    {item.level}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="bg-blue-50/80 dark:bg-blue-900/10 rounded-2xl p-4 border border-blue-100/50 dark:border-blue-900/20">
                        <p className="text-[12px] text-blue-700/80 dark:text-blue-400 font-medium leading-relaxed">
                            <span className="font-bold">Tip:</span> Your audience is most active on Wednesday mornings. Schedule important posts during this time for maximum reach.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

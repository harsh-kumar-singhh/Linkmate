"use client"

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { AnimatedCard } from "@/components/animated/AnimatedCard"
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Lock, Sparkles, Zap, Edit2, Pause, Play, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { UpgradeModal } from "@/components/calendar/UpgradeModal"
import { AutopilotSetupWizard } from "@/components/calendar/AutopilotSetupWizard"
import { toggleAutopilot } from "@/lib/actions/autopilot"

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function CalendarPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const userPlan = session?.user?.plan || "free"
    
    const [viewDate, setViewDate] = useState(new Date())
    const [posts, setPosts] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [schedulingMode, setSchedulingMode] = useState<"manual" | "autopilot">("manual")
    
    // Autopilot State
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
    const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false)
    const [isToggling, setIsToggling] = useState(false)
    const [autopilotData, setAutopilotData] = useState<{
        enabled: boolean;
        topics: string[];
        frequency: string;
        days: string[];
        time: string;
    } | null>(null)

    const currentYear = viewDate.getFullYear()
    const currentMonth = viewDate.getMonth()

    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

    const DATES = Array.from({ length: 42 }, (_, i) => {
        const day = i - firstDay + 1
        if (day < 1 || day > daysInMonth) return null
        return day
    })

    useEffect(() => {
        fetchPosts()
        fetchAutopilotSettings()
    }, [])

    const fetchPosts = async () => {
        try {
            const response = await fetch("/api/posts")
            if (response.ok) {
                const data = await response.json()
                setPosts(data.posts || [])
            }
        } catch (error) {
            console.error("Error fetching posts:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchAutopilotSettings = async () => {
        try {
            const response = await fetch("/api/user/me")
            if (response.ok) {
                const data = await response.json()
                if (data.user) {
                    setAutopilotData({
                        enabled: data.user.autopilotEnabled,
                        topics: data.user.autopilotTopics,
                        frequency: data.user.autopilotFrequency,
                        days: data.user.autopilotDays,
                        time: data.user.autopilotTime
                    })
                    if (data.user.autopilotEnabled) {
                        setSchedulingMode("autopilot")
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching autopilot settings:", error)
        }
    }

    const handleToggleAutopilot = async () => {
        if (!autopilotData) return;
        setIsToggling(true);
        try {
            await toggleAutopilot(!autopilotData.enabled);
            setAutopilotData(prev => prev ? { ...prev, enabled: !prev.enabled } : null);
        } catch (error) {
            alert("Failed to toggle autopilot");
        } finally {
            setIsToggling(false);
        }
    }

    const nextMonth = () => setViewDate(new Date(currentYear, currentMonth + 1, 1))
    const prevMonth = () => setViewDate(new Date(currentYear, currentMonth - 1, 1))

    return (

        <div className="max-w-7xl mx-auto h-full flex flex-col py-6 md:py-8 gap-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-4 md:px-0">
                <div className="space-y-1">
                    <h1 className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">Schedule</h1>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Content Pipeline</h2>
                </div>

                {/* Scheduling Mode Toggle */}
                <div className="flex bg-secondary/40 p-1 rounded-xl items-center font-medium self-center md:self-end">
                    <button
                        onClick={() => setSchedulingMode("manual")}
                        className={cn(
                            "py-1.5 px-4 rounded-lg text-xs transition-all flex items-center gap-2",
                            schedulingMode === "manual" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Manual
                    </button>
                    <button
                        onClick={() => {
                            const isFree = userPlan?.toUpperCase() !== "PRO";
                            if (isFree) {
                                setIsUpgradeModalOpen(true)
                            } else {
                                if (!autopilotData?.topics || autopilotData.topics.length === 0) {
                                    setIsSetupWizardOpen(true)
                                } else {
                                    setSchedulingMode("autopilot")
                                }
                            }
                        }}
                        className={cn(
                            "py-1.5 px-4 rounded-lg text-xs transition-all flex items-center gap-2",
                            schedulingMode === "autopilot" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Autopilot
                        {userPlan?.toUpperCase() !== "PRO" && <Lock className="w-3 h-3" />}
                    </button>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 md:gap-8">
                    <div className="flex items-center gap-1 md:gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-secondary" onClick={prevMonth}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm md:text-base font-bold tracking-tight text-foreground w-32 md:w-36 text-center">
                            {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-secondary" onClick={nextMonth}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                    <Link href="/posts/new">
                        <Button size="sm" className="h-10 px-4 rounded-xl shadow-sm gap-2">
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Schedule Post</span>
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Autopilot Status Bar (Pro only) */}
            {userPlan?.toUpperCase() === "PRO" && schedulingMode === "autopilot" && autopilotData?.topics && autopilotData.topics.length > 0 && (
                <div className="mx-2 md:mx-0 bg-blue-600/5 border border-blue-600/20 rounded-[24px] p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-500">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-3 rounded-2xl",
                            autopilotData.enabled ? "bg-emerald-500/10" : "bg-amber-500/10"
                        )}>
                            {autopilotData.enabled ? (
                                <Zap className="w-6 h-6 text-emerald-600" />
                            ) : (
                                <Pause className="w-6 h-6 text-amber-600" />
                            )}
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg">Autopilot is {autopilotData.enabled ? "Active" : "Paused"}</h3>
                                {autopilotData.enabled && (
                                    <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold rounded-full flex items-center gap-1 uppercase tracking-wider">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Optimal
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {autopilotData.frequency} posts/week • {autopilotData.days.length} days active • Posting at {autopilotData.time}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            className="flex-1 md:flex-none h-11 rounded-xl gap-2 font-bold px-5"
                            onClick={() => setIsSetupWizardOpen(true)}
                        >
                            <Edit2 className="w-4 h-4" />
                            Edit Settings
                        </Button>
                        <Button 
                            variant={autopilotData.enabled ? "outline" : "primary"}
                            size="sm" 
                            className={cn(
                                "flex-1 md:flex-none h-11 rounded-xl gap-2 font-bold px-5",
                                autopilotData.enabled ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/5" : "bg-emerald-600 hover:bg-emerald-500 text-white"
                            )}
                            onClick={handleToggleAutopilot}
                            disabled={isToggling}
                        >
                            {autopilotData.enabled ? (
                                <>
                                    <Pause className="w-4 h-4" />
                                    Pause
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4" />
                                    Resume
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex-1 bg-card rounded-[24px] md:rounded-[32px] border border-border overflow-hidden shadow-sm transition-all duration-500 mx-2 md:mx-0">
                <div className="grid grid-cols-7 border-b border-border bg-secondary/5">
                    {DAYS.map((day) => (
                        <div key={day} className="py-3 md:py-4 text-center text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 border-l border-t border-border/30">
                    {DATES.map((date, i) => {
                        const cellDate = date ? new Date(currentYear, currentMonth, date) : null
                        const datePosts = cellDate ? posts.filter(p => {
                            if (!p.scheduledFor && !p.createdAt) return false
                            const d = new Date(p.scheduledFor || p.createdAt)
                            return d.toDateString() === cellDate.toDateString()
                        }) : []

                        const isToday = cellDate && new Date().toDateString() === cellDate.toDateString()

                        if (i >= 35 && !date && i % 7 === 0) return null

                        return (
                            <div
                                key={i}
                                className={cn(
                                    "min-h-[70px] md:min-h-[100px] border-r border-b border-border/30 p-2 md:p-3 transition-all hover:bg-secondary/5 relative group",
                                    !date && "bg-secondary/[0.02] opacity-30"
                                )}
                            >
                                {date && (
                                    <>
                                        <div className="flex justify-between items-start">
                                            <span className={cn(
                                                "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-lg transition-all",
                                                isToday
                                                    ? "bg-primary text-primary-foreground shadow-sm font-bold"
                                                    : "text-muted-foreground group-hover:text-foreground"
                                            )}>
                                                {date}
                                            </span>
                                            <Link href={`/posts/new?date=${cellDate?.toISOString()}`}>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 rounded-md hover:bg-primary/10 hover:text-primary transition-all p-0">
                                                    <Plus className="w-3 h-3" />
                                                </Button>
                                            </Link>
                                        </div>

                                        <div className="mt-1 space-y-1">
                                            {datePosts.slice(0, 3).map((post) => (
                                                <Link key={post.id} href={`/posts/new?id=${post.id}`}>
                                                    <div className={cn(
                                                        "px-1.5 py-0.5 rounded-md text-[9px] font-bold truncate transition-all flex items-center gap-1.5 cursor-pointer",
                                                        post.status === "PUBLISHED"
                                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                                            : post.status === "SCHEDULED"
                                                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                                                                : "bg-secondary text-muted-foreground dark:bg-slate-800"
                                                    )}>
                                                        <div className={cn("w-1 h-1 rounded-full shrink-0",
                                                            post.status === "PUBLISHED" ? "bg-emerald-500" :
                                                                post.status === "SCHEDULED" ? "bg-blue-500" : "bg-muted-foreground"
                                                        )} />
                                                        <span className="truncate">{post.content}</span>
                                                    </div>
                                                </Link>
                                            ))}
                                            {datePosts.length > 3 && (
                                                <div className="text-[9px] font-bold text-muted-foreground pl-1.5">
                                                    + {datePosts.length - 3} more
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
            <AutopilotSetupWizard 
                isOpen={isSetupWizardOpen} 
                onClose={() => {
                    setIsSetupWizardOpen(false);
                    fetchAutopilotSettings(); // Refresh
                }} 
                initialData={autopilotData ? {
                    topics: autopilotData.topics,
                    frequency: autopilotData.frequency,
                    days: autopilotData.days,
                    time: autopilotData.time
                } : undefined}
            />
        </div>
    )
}

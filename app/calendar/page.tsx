"use client"

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
    ChevronLeft, 
    ChevronRight, 
    Plus, 
    Zap, 
    Pause, 
    Play, 
    CheckCircle2, 
    Edit2, 
    Lock,
    Sparkles,
    CalendarPlus,
    FileText,
    X
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { UpgradeModal } from "@/components/calendar/UpgradeModal"
import { AutopilotSetupWizard } from "@/components/calendar/AutopilotSetupWizard"
import { toggleAutopilot } from "@/lib/actions/autopilot"
import { useUser } from "@/context/UserContext"
import { WeeklyFocusCard } from "@/components/autopilot/WeeklyFocusCard"
import { DayPostsModal } from "@/components/calendar/DayPostsModal"

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// Quick Action Popup Component
function QuickActionPopup({
    date,
    onClose,
    cellRect
}: {
    date: Date;
    onClose: () => void;
    cellRect: DOMRect | null;
}) {
    const isoDate = date.toISOString()
    return (
        <div
            className="fixed z-50 animate-in fade-in zoom-in-95 duration-150"
            style={{
                top: cellRect ? cellRect.top + window.scrollY + 8 : "50%",
                left: cellRect ? Math.min(cellRect.left, window.innerWidth - 200) : "50%",
                transform: cellRect ? undefined : "translate(-50%, -50%)"
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="bg-popover border border-border rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/60 p-1.5 min-w-[180px]">
                <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 mb-1">
                    {format(date, "MMMM d")}
                </div>
                <Link href={`/posts/new?date=${isoDate}`}  onClick={onClose}>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-blue-500/10 hover:text-blue-400 transition-colors">
                        <CalendarPlus className="w-4 h-4 text-blue-400" />
                        Schedule Post
                    </button>
                </Link>
                <Link href={`/posts/new?date=${isoDate}&draft=true`}  onClick={onClose}>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-blue-500/10 hover:text-blue-400 transition-colors">
                        <FileText className="w-4 h-4 text-blue-300" />
                        Quick Draft
                    </button>
                </Link>
                <button
                    onClick={onClose}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-colors"
                >
                    <X className="w-4 h-4" />
                    Dismiss
                </button>
            </div>
        </div>
    )
}

// Status dot for a post
function StatusDot({ status }: { status: string }) {
    if (status === "SCHEDULED") {
        return (
            <span className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-60 animate-ping" />
                <span className="relative w-1.5 h-1.5 bg-blue-400 rounded-full" />
            </span>
        )
    }
    if (status === "PUBLISHED") {
        return <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0" />
    }
    return <span className="w-1.5 h-1.5 bg-slate-400 rounded-full shrink-0" />
}

export default function CalendarPage() {
    const { user, isPro, refreshUser } = useUser()
    const router = useRouter()
    
    const [viewDate, setViewDate] = useState(new Date())
    const [posts, setPosts] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [schedulingMode, setSchedulingMode] = useState<"manual" | "autopilot">("manual")
    
    // UI State
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
    const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false)
    const [isToggling, setIsToggling] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedCellRect, setSelectedCellRect] = useState<DOMRect | null>(null)
    const [monthDirection, setMonthDirection] = useState<"left" | "right" | null>(null)
    const [isTransitioning, setIsTransitioning] = useState(false)
    const [isDayModalOpen, setIsDayModalOpen] = useState(false)
    const [activeDatePosts, setActiveDatePosts] = useState<any[]>([])

    const currentYear = viewDate.getFullYear()
    const currentMonth = viewDate.getMonth()

    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

    const DATES = Array.from({ length: 42 }, (_, i) => {
        const day = i - firstDay + 1
        if (day < 1 || day > daysInMonth) return null
        return day
    })

    const { data: postsData, isLoading: isPostsLoading } = useQuery({
        queryKey: ["posts"],
        queryFn: async () => {
            const response = await fetch("/api/posts")
            if (!response.ok) throw new Error("Failed to fetch posts")
            const result = await response.json()
            return result.data?.posts || result.posts || []
        },
        staleTime: 10_000, // 10s freshness to allow server cache bust to propagate
    })

    // Close popup when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setSelectedDate(null)
        if (selectedDate) {
            document.addEventListener("click", handleClickOutside)
            return () => document.removeEventListener("click", handleClickOutside)
        }
    }, [selectedDate])

    useEffect(() => {
        if (postsData) {
            setPosts(postsData)
            setIsLoading(false)
        }
    }, [postsData])

    useEffect(() => {
        if (user?.autopilotEnabled) {
            setSchedulingMode("autopilot")
        }
    }, [user])

    const handleToggleAutopilot = async () => {
        if (!user) return;
        setIsToggling(true);
        try {
            await toggleAutopilot(!user.autopilotEnabled);
            await refreshUser();
        } catch (error) {
            alert("Failed to toggle autopilot");
        } finally {
            setIsToggling(false);
        }
    }

    const changeMonth = (direction: "left" | "right") => {
        if (isTransitioning) return
        setMonthDirection(direction)
        setIsTransitioning(true)
        setTimeout(() => {
            if (direction === "right") {
                setViewDate(new Date(currentYear, currentMonth + 1, 1))
            } else {
                setViewDate(new Date(currentYear, currentMonth - 1, 1))
            }
            setIsTransitioning(false)
            setMonthDirection(null)
        }, 250)
    }

    const nextMonth = () => changeMonth("right")
    const prevMonth = () => changeMonth("left")

    const handleCellClick = (e: React.MouseEvent<HTMLDivElement>, cellDate: Date, dayPosts: any[]) => {
        e.stopPropagation()
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
        
        // If there are posts, open the view modal
        if (dayPosts.length > 0) {
            setSelectedDate(cellDate)
            setActiveDatePosts(dayPosts)
            setIsDayModalOpen(true)
        } else {
            // Otherwise open quick action popup for creation
            setSelectedCellRect(rect)
            setSelectedDate(prev =>
                prev?.toDateString() === cellDate.toDateString() ? null : cellDate
            )
        }
    }

    const openQuickAction = (e: React.MouseEvent, cellDate: Date) => {
        e.stopPropagation()
        const rect = (e.currentTarget.parentElement?.parentElement as HTMLDivElement).getBoundingClientRect()
        setSelectedCellRect(rect)
        setSelectedDate(cellDate)
        setIsDayModalOpen(false) // Close day modal if open
    }

    return (
        <>
            <style jsx global>{`
                @keyframes pulse-ring {
                    0% { transform: scale(0.9); opacity: 0.8; }
                    70% { transform: scale(1.4); opacity: 0; }
                    100% { transform: scale(1.4); opacity: 0; }
                }
                @keyframes today-glow {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.4), 0 0 12px rgba(59,130,246,0.2); }
                    50% { box-shadow: 0 0 0 4px rgba(59,130,246,0.1), 0 0 20px rgba(59,130,246,0.35); }
                }
                .today-cell {
                    animation: today-glow 2.8s ease-in-out infinite;
                }
                .calendar-grid-enter-left {
                    animation: slideFromLeft 0.28s cubic-bezier(0.4,0,0.2,1) forwards;
                }
                .calendar-grid-enter-right {
                    animation: slideFromRight 0.28s cubic-bezier(0.4,0,0.2,1) forwards;
                }
                @keyframes slideFromLeft {
                    from { opacity: 0; transform: translateX(-24px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes slideFromRight {
                    from { opacity: 0; transform: translateX(24px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .day-cell {
                    transition: background 0.18s, transform 0.18s, box-shadow 0.18s;
                    will-change: transform;
                }
                .day-cell:hover {
                    transform: translateY(-2px) scale(1.01);
                    z-index: 2;
                }
                .day-cell:active {
                    transform: translateY(0px) scale(0.99);
                    transition-duration: 0.08s;
                }
                .post-chip {
                    transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
                }
                .post-chip:hover {
                    transform: translateX(2px);
                }
                .schedule-btn-glow {
                    box-shadow: 0 0 0 0 rgba(59,130,246,0.5);
                    transition: box-shadow 0.3s;
                }
                .schedule-btn-glow:hover {
                    box-shadow: 0 0 20px rgba(59,130,246,0.4), 0 0 40px rgba(59,130,246,0.15);
                }
                .toggle-pill {
                    transition: background 0.2s;
                }
                .toggle-indicator {
                    transition: transform 0.22s cubic-bezier(0.4,0,0.2,1), background 0.2s;
                }
            `}</style>

            <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col py-6 md:py-8 gap-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-4 md:px-0">
                    <div className="space-y-1">
                        <h1 className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">Schedule</h1>
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Content Pipeline</h2>
                    </div>

                    {/* Scheduling Mode Toggle — pill with sliding indicator */}
                    <div className="relative flex bg-secondary/40 p-1 rounded-xl items-center font-medium self-center md:self-end toggle-pill">
                        {/* Sliding background */}
                        <div
                            className="toggle-indicator absolute top-1 bottom-1 rounded-lg bg-background shadow-sm"
                            style={{
                                width: "calc(50% - 4px)",
                                transform: schedulingMode === "autopilot" ? "translateX(calc(100% + 4px))" : "translateX(0)",
                                left: 4
                            }}
                        />
                        <button
                            onClick={() => setSchedulingMode("manual")}
                            className={cn(
                                "relative py-1.5 px-4 rounded-lg text-xs transition-colors flex items-center gap-2 z-10",
                                schedulingMode === "manual" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Manual
                        </button>
                        <button
                            onClick={() => {
                                if (!isPro) {
                                    setIsUpgradeModalOpen(true)
                                } else {
                                    if (!user?.autopilotTopics || user.autopilotTopics.length === 0) {
                                        setIsSetupWizardOpen(true)
                                    } else {
                                        setSchedulingMode("autopilot")
                                    }
                                }
                            }}
                            className={cn(
                                "relative py-1.5 px-4 rounded-lg text-xs transition-colors flex items-center gap-2 z-10",
                                schedulingMode === "autopilot" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Autopilot
                            {!isPro && <Lock className="w-3 h-3" />}
                        </button>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 md:gap-8">
                        <div className="flex items-center gap-1 md:gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-secondary"
                                onClick={prevMonth}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span
                                key={`${currentYear}-${currentMonth}`}
                                className={cn(
                                    "text-sm md:text-base font-bold tracking-tight text-foreground w-32 md:w-36 text-center",
                                    !isTransitioning && monthDirection === "right" && "calendar-grid-enter-right",
                                    !isTransitioning && monthDirection === "left" && "calendar-grid-enter-left"
                                )}
                            >
                                {format(viewDate, 'MMMM yyyy')}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-secondary"
                                onClick={nextMonth}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                        <Link href="/posts/new" >
                            <Button
                                size="sm"
                                className="h-10 px-4 rounded-xl shadow-sm gap-2 schedule-btn-glow"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Schedule Post</span>
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Autopilot Status Bar (Pro only) */}
                {isPro && schedulingMode === "autopilot" && user?.autopilotTopics && user.autopilotTopics.length > 0 && (
                    <div className="space-y-6">
                        <div className="mx-2 md:mx-0 bg-blue-600/5 border border-blue-600/20 rounded-[24px] p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-500">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "p-3 rounded-2xl",
                                    user.autopilotEnabled ? "bg-emerald-500/10" : "bg-amber-500/10"
                                )}>
                                    {user.autopilotEnabled ? (
                                        <Zap className="w-6 h-6 text-emerald-600" />
                                    ) : (
                                        <Pause className="w-6 h-6 text-amber-600" />
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg">Autopilot is {user.autopilotEnabled ? "Active" : "Paused"}</h3>
                                        {user.autopilotEnabled && (
                                            <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold rounded-full flex items-center gap-1 uppercase tracking-wider">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Optimal
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">
                                            {user.autopilotFrequency} posts/week • {user.autopilotDays.length} days active • Posting at {(() => {
                                                if (!user.autopilotTime) return "10:00 AM";
                                                const localDate = new Date(`1970-01-01T${user.autopilotTime}:00`);
                                                return format(localDate, 'hh:mm a');
                                            })()}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {user.autopilotTopics?.map((topic: string) => (
                                                <span key={topic} className="px-2 py-0.5 bg-blue-600/5 border border-blue-600/10 text-blue-600/70 text-[10px] font-bold rounded-md">
                                                    {topic}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
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
                                    variant={user.autopilotEnabled ? "outline" : "primary"}
                                    size="sm"
                                    className={cn(
                                        "flex-1 md:flex-none h-11 rounded-xl gap-2 font-bold px-5",
                                        user.autopilotEnabled ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/5" : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                    )}
                                    onClick={handleToggleAutopilot}
                                    disabled={isToggling}
                                >
                                    {user.autopilotEnabled ? (
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

                        {/* Weekly Focus Context */}
                        <div className="mx-2 md:mx-0">
                            <WeeklyFocusCard
                                initialFocus={user?.autopilotCurrentFocus || ""}
                                onUpdate={() => refreshUser()}
                            />
                        </div>
                    </div>
                )}

                {/* Calendar Grid */}
                <div
                    className="flex-1 rounded-[24px] md:rounded-[32px] border border-border overflow-hidden transition-all duration-500 mx-2 md:mx-0 bg-card shadow-premium dark:shadow-2xl dark:shadow-black/50"
                >
                    {/* Day labels header */}
                    <div className="grid grid-cols-7 border-b border-border bg-secondary/20 dark:bg-white/[0.02]">
                        {DAYS.map((day) => (
                            <div key={day} className="py-3 md:py-4 text-center text-[9px] md:text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Date cells */}
                    <div
                        key={`${currentYear}-${currentMonth}`}
                        className={cn(
                            "grid grid-cols-7",
                            monthDirection === "right" && "calendar-grid-enter-right",
                            monthDirection === "left" && "calendar-grid-enter-left"
                        )}
                    >
                        {DATES.map((date, i) => {
                            const cellDate = date ? new Date(currentYear, currentMonth, date) : null
                            const datePosts = cellDate ? posts.filter(p => {
                                if (!p.scheduledFor && !p.createdAt) return false
                                const d = new Date(p.scheduledFor || p.createdAt)
                                return d.toDateString() === cellDate.toDateString()
                            }) : []

                            const isToday = cellDate && new Date().toDateString() === cellDate.toDateString()
                            const isSelected = selectedDate && cellDate && selectedDate.toDateString() === cellDate.toDateString()
                            const hasContent = datePosts.length > 0
                            const isPastDay = cellDate && cellDate < new Date() && !isToday

                            return (
                                <div
                                    key={i}
                                    onClick={date && cellDate ? (e) => handleCellClick(e, cellDate, datePosts) : undefined}
                                    className={cn(
                                        "day-cell min-h-[80px] md:min-h-[120px] border-r border-b border-border p-2 md:p-3 relative group cursor-pointer",
                                        (i + 1) % 7 === 0 && "border-r-0",
                                        isToday && "bg-primary/[0.04] dark:bg-blue-500/[0.06]",
                                        !date && "opacity-30 pointer-events-none",
                                        isSelected && "ring-2 ring-primary/40 dark:ring-blue-500/50 ring-inset",
                                        !isToday && !isSelected && hasContent && "bg-primary/[0.01] dark:bg-white/[0.01]",
                                        !isToday && !isSelected && !hasContent && "bg-transparent",
                                        isPastDay && !hasContent && "opacity-60"
                                    )}
                                >
                                    {date && (
                                        <>
                                            {/* Date number */}
                                            <div className="flex justify-between items-start mb-1.5">
                                                <span
                                                    className={cn(
                                                        "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-lg transition-all",
                                                        isToday
                                                            ? "bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/30"
                                                            : isSelected
                                                                ? "bg-blue-500/20 text-blue-400 font-bold"
                                                                : "text-muted-foreground/70 group-hover:text-foreground"
                                                    )}
                                                >
                                                    {date}
                                                </span>

                                                {/* Add post hint on hover */}
                                                <div 
                                                    onClick={(e) => openQuickAction(e, cellDate!)}
                                                    className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1 text-[9px] font-bold text-primary/70 hover:text-primary"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    <span className="hidden md:inline">Add</span>
                                                </div>
                                            </div>

                                            {/* Post previews */}
                                            <div className="space-y-1">
                                                {datePosts.slice(0, 2).map((post) => (
                                                    <Link key={post.id} href={`/posts/new?id=${post.id}`}  onClick={(e) => e.stopPropagation()}>
                                                        <div className={cn(
                                                            "post-chip px-1.5 py-1 rounded-md text-[9px] font-bold truncate flex items-center gap-1.5 cursor-pointer",
                                                            post.status === "PUBLISHED"
                                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                                                                : post.status === "SCHEDULED"
                                                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                                                                    : "bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20"
                                                        )}>
                                                            <StatusDot status={post.status} />
                                                            <span className="truncate flex-1">{post.content?.slice(0, 30) || "Post"}</span>
                                                            {post.source === "autopilot" && (
                                                                <Sparkles className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                                            )}
                                                        </div>
                                                    </Link>
                                                ))}
                                                {datePosts.length > 2 && (
                                                    <div 
                                                        className="text-[9px] font-bold text-blue-400/60 pl-1 hover:text-blue-500 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCellClick(e as any, cellDate!, datePosts);
                                                        }}
                                                    >
                                                        +{datePosts.length - 2} more
                                                    </div>
                                                )}

                                                {/* Empty state hint */}
                                                {datePosts.length === 0 && !isPastDay && (
                                                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 mt-1">
                                                        <p className="text-[8px] md:text-[9px] text-muted-foreground/40 leading-tight px-0.5">
                                                            Plan something ✨
                                                        </p>
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

                {/* Quick Action Popup */}
                {selectedDate && (
                    <QuickActionPopup
                        date={selectedDate}
                        onClose={() => setSelectedDate(null)}
                        cellRect={selectedCellRect}
                    />
                )}

                <DayPostsModal 
                    isOpen={isDayModalOpen} 
                    onClose={() => setIsDayModalOpen(false)} 
                    date={selectedDate} 
                    posts={activeDatePosts} 
                />

                <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
                <AutopilotSetupWizard
                    isOpen={isSetupWizardOpen}
                    onClose={() => {
                        setIsSetupWizardOpen(false);
                        refreshUser();
                    }}
                    initialData={user ? {
                        topics: user.autopilotTopics,
                        frequency: user.autopilotFrequency,
                        days: user.autopilotDays,
                        time: user.autopilotTime,
                        currentFocus: user.autopilotCurrentFocus,
                        writingStyleId: user.autopilotWritingStyleId,
                        writingStyles: user.writingStyles
                    } : undefined}
                />
            </div>
        </>
    )
}

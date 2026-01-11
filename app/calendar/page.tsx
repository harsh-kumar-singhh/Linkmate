"use client"

import { useEffect, useState } from "react"
import { AnimatedCard } from "@/components/animated/AnimatedCard"
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function CalendarPage() {
    const [viewDate, setViewDate] = useState(new Date())
    const [posts, setPosts] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

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

    const nextMonth = () => setViewDate(new Date(currentYear, currentMonth + 1, 1))
    const prevMonth = () => setViewDate(new Date(currentYear, currentMonth - 1, 1))

    return (

        <div className="max-w-7xl mx-auto h-full flex flex-col py-8 gap-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-[12px] font-bold tracking-[0.2em] text-muted-foreground uppercase">Schedule</h1>
                    <h2 className="text-4xl font-bold tracking-tight text-foreground">Content Pipeline</h2>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-secondary" onClick={prevMonth}>
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <span className="text-lg font-bold tracking-tight text-foreground w-48 text-center">
                            {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-secondary" onClick={nextMonth}>
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>
                    <Link href="/posts/new">
                        <Button size="lg" className="h-14 px-8 rounded-2xl shadow-premium">
                            <Plus className="w-5 h-5 mr-3" />
                            <span>Schedule Post</span>
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="flex-1 bg-card rounded-[40px] border border-border overflow-hidden shadow-premium transition-all duration-500">
                <div className="grid grid-cols-7 border-b border-border">
                    {DAYS.map((day) => (
                        <div key={day} className="py-6 text-center text-[11px] font-bold text-muted-foreground uppercase tracking-widest bg-secondary/20">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 flex-1">
                    {DATES.map((date, i) => {
                        const cellDate = date ? new Date(currentYear, currentMonth, date) : null
                        const datePosts = cellDate ? posts.filter(p => {
                            if (!p.scheduledFor && !p.createdAt) return false
                            const d = new Date(p.scheduledFor || p.createdAt)
                            return d.getDate() === cellDate.getDate() &&
                                d.getMonth() === cellDate.getMonth() &&
                                d.getFullYear() === cellDate.getFullYear()
                        }) : []

                        const isToday = cellDate && new Date().toDateString() === cellDate.toDateString()

                        if (i >= 35 && !date && i % 7 === 0) return null

                        return (
                            <div
                                key={i}
                                className={cn(
                                    "min-h-[160px] border-b border-r border-border/50 p-6 transition-all hover:bg-secondary/10 relative group",
                                    !date && "bg-secondary/5 opacity-50"
                                )}
                            >
                                {date && (
                                    <>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className={cn(
                                                "text-[15px] font-bold w-9 h-9 flex items-center justify-center rounded-xl transition-all",
                                                isToday
                                                    ? "bg-site-bg text-blue-600 ring-2 ring-blue-600 shadow-xl shadow-blue-600/20"
                                                    : "text-site-fg opacity-50 group-hover:opacity-100"
                                            )}>
                                                {date}
                                            </span>
                                            <Link href={`/posts/new?date=${cellDate?.toISOString()}`}>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 opacity-0 group-hover:opacity-100 rounded-xl hover:bg-primary/5 hover:text-primary transition-all">
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                        </div>

                                        <div className="space-y-2">
                                            {datePosts.map((post) => (
                                                <Link key={post.id} href={`/posts/new?id=${post.id}`}>
                                                    <div className="w-full">
                                                        <AnimatedCard
                                                            initial={{ opacity: 0, scale: 0.98 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                                                            className={cn(
                                                                "group/item relative p-3 rounded-xl border border-transparent shadow-sm cursor-pointer transition-all duration-300",
                                                                post.status === "PUBLISHED"
                                                                    ? "bg-emerald-50 text-emerald-700 hover:border-emerald-200"
                                                                    : post.status === "SCHEDULED"
                                                                        ? "bg-blue-100 text-blue-600 hover:bg-blue-100/80 hover:border-blue-600/20"
                                                                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:border-border"
                                                            )}
                                                        >
                                                            <div className="text-[12px] font-bold truncate leading-tight mb-1">
                                                                {post.content}
                                                            </div>
                                                            <div className="flex items-center gap-2 opacity-50">
                                                                <div className={cn("w-1.5 h-1.5 rounded-full",
                                                                    post.status === "PUBLISHED" ? "bg-emerald-400" :
                                                                        post.status === "SCHEDULED" ? "bg-blue-600" : "bg-muted-foreground"
                                                                )} />
                                                                <span className="text-[10px] font-bold uppercase tracking-widest">{post.status}</span>
                                                            </div>
                                                        </AnimatedCard>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div >

    )
}

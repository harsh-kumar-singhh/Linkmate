"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Sparkles,
    X,
    MessageSquare,
    ArrowRight,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    Loader2,
    Send,
    Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useCallback } from "react"

interface Insight {
    type: "trend" | "warning" | "success"
    text: string
}

interface Suggestion {
    title: string
    hook: string
    why: string
}

interface CoachResponse {
    message: string
    insights?: Insight[]
    suggestions?: Suggestion[]
    quickActions?: string[]
}

export function AICoach({ draftContent }: { draftContent?: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [response, setResponse] = useState<CoachResponse | null>(null)
    const [chatHistory, setChatHistory] = useState<{ role: "user" | "coach", content: string | CoachResponse }[]>([])
    const [inputValue, setInputValue] = useState("")
    const pathname = usePathname()
    const scrollRef = useRef<HTMLDivElement>(null)

    const fetchAdvice = useCallback(async (query?: string) => {
        setIsLoading(true)
        if (query) {
            setChatHistory(prev => [...prev, { role: "user", content: query }])
        }

        try {
            const res = await fetch("/api/coach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    page: pathname,
                    draftContent,
                    userQuery: query
                })
            })

            if (res.ok) {
                const data = await res.json()
                setResponse(data)
                setChatHistory(prev => [...prev, { role: "coach", content: data }])
            }
        } catch (err) {
            console.error("Coach fetch error:", err)
        } finally {
            setIsLoading(false)
        }
    }, [pathname, draftContent])

    // Initial fetch when opened
    useEffect(() => {
        if (isOpen && chatHistory.length === 0) {
            fetchAdvice()
        }
    }, [isOpen, chatHistory.length, fetchAdvice])

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [chatHistory])

    const handleSend = () => {
        if (!inputValue.trim()) return
        fetchAdvice(inputValue)
        setInputValue("")
    }

    return (
        <>
            {/* Floating Button */}
            {(motion.div as any).initial && (
                <motion.div
                    {...({
                        initial: { scale: 0, opacity: 0 },
                        animate: { scale: 1, opacity: 1 },
                        className: "fixed bottom-24 right-6 z-40"
                    } as any)}
                >
                    <Button
                        onClick={() => setIsOpen(true)}
                        className="h-14 px-6 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 border border-zinc-700/50 shadow-2xl hover:scale-105 active:scale-95 transition-all group flex items-center gap-2"
                    >
                        <div className="relative">
                            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-ping opacity-75" />
                        </div>
                        <span className="font-bold tracking-tight">AI Coach</span>
                    </Button>
                </motion.div>
            )}

            {/* Side Panel / Modal */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            {...({
                                initial: { opacity: 0 },
                                animate: { opacity: 1 },
                                exit: { opacity: 0 },
                                onClick: () => setIsOpen(false),
                                className: "fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
                            } as any)}
                        />

                        {/* Panel */}
                        <motion.div
                            {...({
                                initial: { x: "100%" },
                                animate: { x: 0 },
                                exit: { x: "100%" },
                                transition: { type: "spring", damping: 25, stiffness: 200 },
                                className: "fixed top-0 right-0 h-full w-full md:w-[450px] bg-white dark:bg-zinc-950 z-[60] shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800"
                            } as any)}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold tracking-tight">AI Content Coach</h2>
                                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">Personal Strategist</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50">
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Chat Content */}
                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                                {chatHistory.map((item, i) => (
                                    <div key={i} className={cn(
                                        "flex flex-col gap-2",
                                        item.role === "user" ? "items-end" : "items-start"
                                    )}>
                                        {item.role === "user" ? (
                                            <div className="bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 px-4 py-3 rounded-2xl rounded-tr-sm text-sm font-medium max-w-[85%] shadow-sm">
                                                {item.content as string}
                                            </div>
                                        ) : (
                                            <div className="space-y-4 max-w-[95%]">
                                                <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-2xl rounded-tl-sm text-sm leading-relaxed text-foreground/90 border border-zinc-200/50 dark:border-zinc-800/50">
                                                    {(item.content as CoachResponse).message}
                                                </div>

                                                {/* Insights */}
                                                {(item.content as CoachResponse).insights && (
                                                    <div className="grid gap-3">
                                                        {(item.content as CoachResponse).insights?.map((insight, idx) => (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: idx * 0.1 }}
                                                                key={idx}
                                                                className={cn(
                                                                    "p-4 rounded-2xl border flex items-start gap-3",
                                                                    insight.type === "trend" ? "bg-blue-50/30 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30 text-blue-700 dark:text-blue-400" :
                                                                        insight.type === "warning" ? "bg-amber-50/30 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30 text-amber-700 dark:text-amber-400" :
                                                                            "bg-emerald-50/30 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                                                )}
                                                            >
                                                                {insight.type === "trend" ? <TrendingUp className="w-4 h-4 shrink-0 mt-0.5" /> :
                                                                    insight.type === "warning" ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> :
                                                                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                                                                <p className="text-[13px] font-semibold">{insight.text}</p>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Suggestions */}
                                                {(item.content as CoachResponse).suggestions && (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 px-1">
                                                            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Suggested Post Ideas</span>
                                                        </div>
                                                        {(item.content as CoachResponse).suggestions?.map((suggestion, idx) => (
                                                            <Card key={idx} className="rounded-2xl border-border/50 overflow-hidden hover:border-primary/20 transition-all">
                                                                <CardContent className="p-4 space-y-3">
                                                                    <div className="flex justify-between items-start">
                                                                        <h4 className="text-sm font-bold leading-tight">{suggestion.title}</h4>
                                                                    </div>
                                                                    <div className="bg-zinc-50 dark:bg-zinc-900/80 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                                                        <p className="text-[12px] italic text-muted-foreground">&quot;{suggestion.hook}&quot;</p>
                                                                    </div>
                                                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                                        <span className="font-bold text-foreground">Why:</span> {suggestion.why}
                                                                    </p>
                                                                    <Button size="sm" className="w-full rounded-xl gap-2 text-[11px] font-bold" onClick={() => {
                                                                        window.location.href = `/posts/new?context=${encodeURIComponent(suggestion.title)}`
                                                                    }}>
                                                                        Use This Idea <ChevronRight className="w-3 h-3" />
                                                                    </Button>
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex items-center gap-2 text-muted-foreground italic text-xs animate-pulse">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Coach is thinking...
                                    </div>
                                )}
                            </div>

                            {/* Input & Quick Actions */}
                            <div className="p-6 border-t border-zinc-100 dark:border-zinc-900 space-y-4">
                                {response?.quickActions && !isLoading && (
                                    <div className="flex flex-wrap gap-2">
                                        {response.quickActions.map((action, i) => (
                                            <button
                                                key={i}
                                                onClick={() => fetchAdvice(action)}
                                                className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors"
                                            >
                                                {action}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="Ask your coach anything..."
                                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 h-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 group-hover:border-primary/20 transition-all font-medium pr-12"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!inputValue.trim() || isLoading}
                                        className="absolute right-2 top-2 h-8 w-8 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 flex items-center justify-center hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}

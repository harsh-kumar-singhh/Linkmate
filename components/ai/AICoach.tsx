"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
    Sparkles,
    X,
    ArrowRight,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Send,
    Plus,
    Lightbulb,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

// ─── Framer Motion v12 type-safety shim ────────────────────────────────────
const MotionDiv = motion.div as any

// ─── Types ──────────────────────────────────────────────────────────────────
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
    reply: string
    structuredReply?: {
        insight: string
        strategy: string
        action: string
    }
    insights?: Insight[]
    suggestions?: Suggestion[]
    quickActions?: string[]
}

type ChatRole = "user" | "coach"

interface ChatMessage {
    role: ChatRole
    content: string | CoachResponse
    isStreaming?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripMarkdown(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, (m) => m.replace(/```[a-z]*/g, "").trim())
        .replace(/`/g, "")
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/#{1,6}\s/g, "")
        .replace(/__/g, "")
        .replace(/_/g, " ")
        .replace(/\r\n/g, "\n")
}

function extractPartialReply(raw: string): string {
    const complete = raw.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/)
    if (complete) return complete[1].replace(/\\n/g, "\n").replace(/\\"/g, '"')
    const partial = raw.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)$/)
    if (partial) return partial[1].replace(/\\n/g, "\n").replace(/\\"/g, '"')
    return ""
}

function parseFullResponse(raw: string): CoachResponse | null {
    const first = raw.indexOf("{")
    const last = raw.lastIndexOf("}")
    if (first === -1 || last === -1) return null
    try {
        return JSON.parse(raw.slice(first, last + 1)) as CoachResponse
    } catch {
        return null
    }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const InsightCard = memo(function InsightCard({
    insight,
    delay,
}: {
    insight: Insight
    delay: number
}) {
    const styles = {
        trend: { wrap: "bg-blue-500/5 border-blue-500/15 text-blue-400", icon: "bg-blue-500/15 text-blue-400" },
        warning: { wrap: "bg-amber-500/5 border-amber-500/15 text-amber-400", icon: "bg-amber-500/15 text-amber-400" },
        success: { wrap: "bg-emerald-500/5 border-emerald-500/15 text-emerald-400", icon: "bg-emerald-500/15 text-emerald-400" },
    }
    const s = styles[insight.type]
    const Icon =
        insight.type === "trend" ? TrendingUp
        : insight.type === "warning" ? AlertCircle
        : CheckCircle2

    return (
        <MotionDiv
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={cn("flex items-start gap-3 p-3 rounded-xl border", s.wrap)}
        >
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", s.icon)}>
                <Icon className="w-3.5 h-3.5" />
            </div>
            <p className="text-[12.5px] font-medium leading-relaxed">{insight.text}</p>
        </MotionDiv>
    )
})

// ── Compact suggestion card — full width, short height ───────────────────────
const SuggestionCard = memo(function SuggestionCard({
    suggestion,
    delay,
    index,
}: {
    suggestion: Suggestion
    delay: number
    index: number
}) {
    // Three distinct accent palettes — no more "all amber everything"
    const accents = [
        {
            border: "border-amber-500/25 dark:border-amber-500/20",
            dot: "bg-amber-500",
            tag: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            btn: "bg-amber-500 hover:bg-amber-400 text-black",
            glow: "from-amber-500/10 to-transparent",
        },
        {
            border: "border-blue-500/25 dark:border-blue-500/20",
            dot: "bg-blue-500",
            tag: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
            btn: "bg-blue-500 hover:bg-blue-400 text-white",
            glow: "from-blue-500/10 to-transparent",
        },
        {
            border: "border-emerald-500/25 dark:border-emerald-500/20",
            dot: "bg-emerald-500",
            tag: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            btn: "bg-emerald-500 hover:bg-emerald-400 text-white",
            glow: "from-emerald-500/10 to-transparent",
        },
    ]
    const a = accents[index % 3]

    return (
        <MotionDiv
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            whileTap={{ scale: 0.985 }}
        >
            {/* Card */}
            <div
                className={cn(
                    "relative rounded-2xl border bg-white dark:bg-zinc-900/70 overflow-hidden",
                    a.border
                )}
            >
                {/* Subtle gradient wash top-left */}
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-30 dark:opacity-40 pointer-events-none", a.glow)} />

                <div className="relative p-3.5">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-start gap-2">
                            <div className={cn("w-2 h-2 rounded-full mt-[5px] shrink-0", a.dot)} />
                            <h4 className="text-[13px] font-bold text-zinc-900 dark:text-white leading-snug">
                                {suggestion.title}
                            </h4>
                        </div>
                        {/* Use button — top-right, small */}
                        <button
                            onClick={() => {
                                window.location.href = `/posts/new?context=${encodeURIComponent(suggestion.title)}`
                            }}
                            className={cn(
                                "shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all",
                                a.btn
                            )}
                        >
                            Use <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                    </div>

                    {/* Hook quote */}
                    <p className="text-[12px] italic text-zinc-500 dark:text-zinc-400 leading-relaxed pl-4 mb-2">
                        &quot;{suggestion.hook}&quot;
                    </p>

                    {/* Strategy — tight, muted */}
                    <div className="pl-4 flex items-start gap-1.5">
                        <span className={cn("text-[9.5px] font-black uppercase tracking-widest shrink-0 mt-0.5 px-1.5 py-0.5 rounded-md", a.tag)}>
                            Why
                        </span>
                        <p className="text-[11.5px] text-zinc-500 dark:text-zinc-500 leading-snug">
                            {suggestion.why}
                        </p>
                    </div>
                </div>
            </div>
        </MotionDiv>
    )
})

// ── Coach message body ────────────────────────────────────────────────────────
const CoachMessageBody = memo(function CoachMessageBody({
    content,
    isStreaming,
}: {
    content: CoachResponse
    isStreaming?: boolean
}) {
    const cleaned = stripMarkdown(content.reply || "")
    const paragraphs = cleaned.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)

    return (
        <div className="relative w-full">
            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-2xl rounded-tl-sm text-[13.5px] leading-relaxed text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/6 shadow-sm">
                <div className="space-y-3">
                    {paragraphs.map((p, idx) => {
                        if (/^[-•]/.test(p)) {
                            const items = p.split("\n").map((b) => b.replace(/^[-•]\s*/, "").trim()).filter(Boolean)
                            return (
                                <ul key={idx} className="space-y-1.5">
                                    {items.map((item, bIdx) => (
                                        <li key={bIdx} className="flex gap-2 text-zinc-600 dark:text-zinc-300">
                                            <span className="text-amber-500 shrink-0">•</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            )
                        }
                        const sectionMatch = p.match(/^([A-Z][A-Za-z\s]{2,20}):\s*(.*)/)
                        if (sectionMatch) {
                            return (
                                <div key={idx} className="space-y-0.5">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                        {sectionMatch[1]}
                                    </div>
                                    <p className="text-zinc-900 dark:text-zinc-100">{sectionMatch[2]}</p>
                                </div>
                            )
                        }
                        return <p key={idx}>{p}</p>
                    })}

                    {content.structuredReply && (
                        <div className="pt-3 mt-3 border-t border-zinc-200 dark:border-white/10 space-y-2.5">
                            {[
                                { label: "Insight", color: "text-amber-500", text: content.structuredReply.insight, bold: false },
                                { label: "Strategy", color: "text-blue-500", text: content.structuredReply.strategy, bold: false },
                                { label: "Action", color: "text-emerald-500", text: content.structuredReply.action, bold: true },
                            ].map(({ label, color, text, bold }) => (
                                <div key={label} className="flex gap-2">
                                    <span className={cn("text-[10px] font-black uppercase tracking-wider shrink-0 mt-0.5", color)}>
                                        {label}
                                    </span>
                                    <p className={cn("text-[13px] text-zinc-700 dark:text-zinc-300", bold && "font-semibold text-zinc-900 dark:text-white")}>
                                        {text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {isStreaming && (
                    <div className="flex gap-1 mt-3 items-center">
                        {[0, 100, 200].map((d) => (
                            <div
                                key={d}
                                className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-pulse"
                                style={{ animationDelay: `${d}ms` }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
})

// ── Single row ────────────────────────────────────────────────────────────────
const ChatRow = memo(function ChatRow({ item }: { item: ChatMessage }) {
    if (item.role === "user") {
        return (
            <div className="flex justify-end">
                <MotionDiv
                    initial={{ opacity: 0, x: 12, scale: 0.97 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    className="bg-zinc-900 dark:bg-zinc-700 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-[13.5px] font-medium max-w-[80%] shadow-sm"
                >
                    {item.content as string}
                </MotionDiv>
            </div>
        )
    }

    const coachContent = item.content as CoachResponse

    return (
        <div className="flex flex-col items-start gap-3 w-full">
            <MotionDiv
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="w-full"
            >
                <CoachMessageBody content={coachContent} isStreaming={item.isStreaming} />
            </MotionDiv>

            {/* Insights */}
            {!item.isStreaming && coachContent.insights && coachContent.insights.length > 0 && (
                <div className="flex flex-col gap-2 w-full">
                    {coachContent.insights.map((insight, idx) => (
                        <InsightCard key={idx} insight={insight} delay={0.06 + idx * 0.05} />
                    ))}
                </div>
            )}

            {/* Suggestions */}
            {!item.isStreaming && coachContent.suggestions && coachContent.suggestions.length > 0 && (
                <div className="w-full space-y-2">
                    <div className="flex items-center gap-1.5">
                        <Lightbulb className="w-3 h-3 text-amber-500" />
                        <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                            Suggested Ideas
                        </span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                        {coachContent.suggestions.map((s, idx) => (
                            <SuggestionCard key={idx} suggestion={s} delay={0.15 + idx * 0.06} index={idx} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
})

// ─── Starter prompts ──────────────────────────────────────────────────────────
const STARTER_PROMPTS = [
    "What should I post next?",
    "Analyze my content",
    "How do I grow faster?",
    "Give me 3 post ideas",
    "What am I doing wrong?",
]

// ─── Main Component ───────────────────────────────────────────────────────────
export function AICoach({ draftContent }: { draftContent?: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isResetting, setIsResetting] = useState(false)
    const [isLimitReached, setIsLimitReached] = useState(false)
    const [inputValue, setInputValue] = useState("")
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])

    const abortControllerRef = useRef<AbortController | null>(null)
    const resetPromiseRef = useRef<Promise<void> | null>(null)

    const lastCoachMsg = [...chatHistory].reverse().find((m) => m.role === "coach")
    const quickActions =
        !isLoading && !isLimitReached
            ? lastCoachMsg
                ? (lastCoachMsg.content as CoachResponse).quickActions ?? []
                : STARTER_PROMPTS
            : []

    const pathname = usePathname()
    const scrollRef = useRef<HTMLDivElement>(null)
    const streamAccRef = useRef("")

    const scrollToBottom = useCallback((force = false) => {
        const el = scrollRef.current
        if (!el) return
        const nearBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 140
        if (force || nearBottom) el.scrollTop = el.scrollHeight
    }, [])

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("/api/coach")
                if (!res.ok) return
                const data = await res.json()
                if (data.success) {
                    setSessionId(data.sessionId ?? null)
                    if (Array.isArray(data.messages) && data.messages.length > 0)
                        setChatHistory(data.messages)
                }
            } catch {}
        }
        load()
    }, [])

    useEffect(() => { setMounted(true); return () => setMounted(false) }, [])

    useEffect(() => {
        const h = () => setIsOpen(true)
        window.addEventListener("open-ai-coach", h)
        return () => window.removeEventListener("open-ai-coach", h)
    }, [])

    useEffect(() => {
        if (isOpen && chatHistory.length === 0 && !isLoading) fetchAdvice()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    useEffect(() => { scrollToBottom() }, [chatHistory, scrollToBottom])

    // ── Core fetch / stream ───────────────────────────────────────────────────
    const fetchAdvice = useCallback(
        async (query?: string) => {
            if (isLimitReached || isLoading || isResetting) return

            // Abort previous request if any
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
            abortControllerRef.current = new AbortController()

            const displayQuery = query ?? "Provide a strategic update based on my recent activity."

            setChatHistory((prev) => [
                ...prev,
                { role: "user", content: displayQuery },
                { role: "coach", content: { reply: "" } as CoachResponse, isStreaming: true },
            ])

            setIsLoading(true)
            streamAccRef.current = ""

            let debounceTimer: ReturnType<typeof setTimeout> | null = null
            let pendingReply = ""

            const flush = () => {
                const snap = pendingReply
                setChatHistory((prev) => {
                    const next = [...prev]
                    const li = next.length - 1
                    if (next[li]?.role === "coach") {
                        next[li] = {
                            ...next[li],
                            content: { ...(next[li].content as CoachResponse), reply: snap },
                            isStreaming: true,
                        }
                    }
                    return next
                })
                scrollToBottom()
            }

            try {
                const res = await fetch("/api/coach", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ page: pathname, draftContent, userQuery: query, sessionId }),
                    signal: abortControllerRef.current.signal,
                })

                if (res.status === 429) {
                    const data = await res.json()
                    setIsLimitReached(true)
                    setChatHistory((prev) => {
                        const next = [...prev]
                        next[next.length - 1] = {
                            role: "coach",
                            content: { reply: data.message ?? "Daily limit reached. Upgrade to Pro!" },
                            isStreaming: false,
                        }
                        return next
                    })
                    return
                }

                if (!res.ok) throw new Error(`HTTP ${res.status}`)

                const reader = res.body?.getReader()
                const decoder = new TextDecoder()
                if (!reader) throw new Error("No readable stream")
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    streamAccRef.current += decoder.decode(value, { stream: true })
                    const partial = extractPartialReply(streamAccRef.current)
                    if (partial) {
                        pendingReply = partial
                        if (debounceTimer) clearTimeout(debounceTimer)
                        debounceTimer = setTimeout(flush, 50)
                    }
                }

                if (debounceTimer) { clearTimeout(debounceTimer); flush() }

                const parsed = parseFullResponse(streamAccRef.current)
                if (parsed) {
                    const firstBrace = streamAccRef.current.indexOf("{")
                    const intro = firstBrace > 0
                        ? streamAccRef.current.slice(0, firstBrace).trim().replace(/```[a-z]*/g, "").trim()
                        : ""
                    const finalResponse: CoachResponse = {
                        ...parsed,
                        reply: intro ? `${intro}\n\n${parsed.reply}` : parsed.reply,
                        insights: parsed.insights ?? [],
                        suggestions: parsed.suggestions ?? [],
                        quickActions: parsed.quickActions ?? [],
                    }
                    setChatHistory((prev) => {
                        const next = [...prev]
                        next[next.length - 1] = { role: "coach", content: finalResponse, isStreaming: false }
                        return next
                    })
                } else {
                    setChatHistory((prev) => {
                        const next = [...prev]
                        next[next.length - 1] = {
                            role: "coach",
                            content: { reply: pendingReply || streamAccRef.current },
                            isStreaming: false,
                        }
                        return next
                    })
                }
            } catch (err: any) {
                if (err.name === "AbortError") return
                setChatHistory((prev) => {
                    const next = [...prev]
                    next[next.length - 1] = {
                        role: "coach",
                        content: { reply: "Something went wrong. Try again in a moment." },
                        isStreaming: false,
                    }
                    return next
                })
            } finally {
                setIsLoading(false)
                abortControllerRef.current = null
                scrollToBottom(true)
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [pathname, draftContent, sessionId, isLimitReached, isLoading]
    )

    const startNewChat = useCallback(async () => {
        if (isResetting || resetPromiseRef.current) return

        // 1. Instant UI Feedback (Optimistic)
        setIsResetting(true)
        setChatHistory([])
        setSessionId(null)
        setIsLimitReached(false)
        streamAccRef.current = ""

        // Abort any in-flight advice request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }

        const performReset = async () => {
            try {
                await fetch("/api/coach", { method: "DELETE" })
            } catch (err) {
                console.error("Failed to reset chat:", err)
            } finally {
                setIsResetting(false)
                resetPromiseRef.current = null
                // Small delay to ensure state has settled before fetching fresh advice
                setTimeout(() => fetchAdvice(), 50)
            }
        }

        resetPromiseRef.current = performReset()
    }, [fetchAdvice, isResetting])

    const handleSend = useCallback(() => {
        const q = inputValue.trim()
        if (!q || isLoading || isLimitReached) return
        setInputValue("")
        fetchAdvice(q)
    }, [inputValue, isLoading, isLimitReached, fetchAdvice])

    // ── Panel ─────────────────────────────────────────────────────────────────
    const renderPanel = () => (
        <AnimatePresence>
            {isOpen && (
                <>
                    <MotionDiv
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[9998]"
                    />
                    <MotionDiv
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 28, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 h-[100dvh] w-full md:w-[480px] z-[9999] flex flex-col border-l border-zinc-200 dark:border-white/5 overflow-hidden shadow-2xl"
                    >
                        {/* Backgrounds */}
                        <div className="absolute inset-0 bg-white dark:bg-zinc-950 pointer-events-none" />
                        <div className="absolute inset-0 opacity-[0.025] pointer-events-none [background-image:url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />

                        {/* ── Header ──────────────────────────────────────────────────── */}
                        <div className="relative shrink-0 h-16 px-4 flex items-center justify-between z-10 border-b border-zinc-100 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-white/5 border border-zinc-800 dark:border-white/10 flex items-center justify-center shadow-md shrink-0">
                                    <Sparkles className="w-4.5 h-4.5 text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-[15px] font-bold tracking-tight text-zinc-900 dark:text-white leading-none mb-1">
                                        AI Coach
                                    </h2>
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse block" />
                                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                                            Active
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={startNewChat}
                                    disabled={isLoading || isResetting}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40",
                                        isResetting 
                                            ? "text-amber-700 bg-amber-100 border-amber-300 animate-pulse"
                                            : "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/15"
                                    )}
                                >
                                    {isResetting ? (
                                        <>
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-3 h-3" />
                                            New
                                        </>
                                    )}
                                </button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsOpen(false)}
                                    className="w-8 h-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* ── Messages ────────────────────────────────────────────────── */}
                        <div
                            ref={scrollRef}
                            className="relative flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3.5 scrollbar-hide"
                        >
                            {/* Skeleton */}
                            {chatHistory.length === 0 && isLoading && (
                                <div className="space-y-4 animate-pulse">
                                    {[72, 110, 56].map((h, i) => (
                                        <div key={i} className="flex flex-col gap-2">
                                            {i === 0 && <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-md" />}
                                            <div className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-2xl" style={{ height: h }} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {chatHistory.map((item, i) => (
                                <ChatRow key={i} item={item} />
                            ))}

                            {isLoading &&
                                chatHistory.length > 0 &&
                                !(chatHistory[chatHistory.length - 1] as ChatMessage).isStreaming && (
                                    <div className="flex items-center gap-2 text-zinc-400 text-xs animate-pulse pl-1">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Coach is thinking…
                                    </div>
                                )}
                        </div>

                        {/* ── Input bar ───────────────────────────────────────────────── */}
                        <div className="relative shrink-0 z-20 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-white/5 px-4 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] space-y-2.5">

                            {/* Quick prompt pills — horizontal scroll, compact */}
                            {quickActions.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-0.5">
                                    {quickActions.map((action, i) => (
                                        <button
                                            key={i}
                                            onClick={() => fetchAdvice(action)}
                                            disabled={isLoading || isResetting}
                                            className="shrink-0 text-[11.5px] font-medium px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-white/8 transition-all whitespace-nowrap disabled:opacity-40"
                                        >
                                            {action}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Text field */}
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    disabled={isLimitReached || isResetting}
                                    placeholder={
                                        isLimitReached
                                            ? "Daily limit reached — upgrade to Pro"
                                            : "Ask your coach anything…"
                                    }
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault()
                                            handleSend()
                                        }
                                    }}
                                    className={cn(
                                        "w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl px-4 h-12 text-[13.5px] focus:outline-none focus:border-zinc-400 dark:focus:border-white/20 transition-all font-medium pr-12 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-white",
                                        isLimitReached && "opacity-50 cursor-not-allowed"
                                    )}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!inputValue.trim() || isLoading || isLimitReached || isResetting}
                                    className="absolute right-1.5 h-9 w-9 rounded-xl bg-zinc-900 dark:bg-amber-500 text-white dark:text-black flex items-center justify-center hover:bg-zinc-700 dark:hover:bg-amber-400 transition-colors disabled:opacity-20 shadow-sm"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </MotionDiv>
                </>
            )}
        </AnimatePresence>
    )

    return (
        <>
            <MotionDiv
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="fixed bottom-24 right-5 z-40"
            >
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-12 px-5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border border-zinc-700/30 shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                    <div className="relative">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
                    </div>
                    <span className="text-[13px] font-bold tracking-tight">AI Coach</span>
                </Button>
            </MotionDiv>

            {mounted && createPortal(renderPanel(), document.body)}
        </>
    )
}
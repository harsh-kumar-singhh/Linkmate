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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
    /** user messages are plain strings; coach messages are CoachResponse */
    content: string | CoachResponse
    isStreaming?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip **, ##, __, ` `` ` and similar markdown tokens */
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

/**
 * Incrementally extracts the value of the "reply" key from a partially
 * received JSON string without throwing.
 */
function extractPartialReply(raw: string): string {
    // Complete match — JSON is fully formed
    const complete = raw.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/)
    if (complete) {
        return complete[1].replace(/\\n/g, "\n").replace(/\\"/g, '"')
    }
    // Partial match — JSON is still streaming
    const partial = raw.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)$/)
    if (partial) {
        return partial[1].replace(/\\n/g, "\n").replace(/\\"/g, '"')
    }
    return ""
}

/** Extract the JSON object portion and parse it, ignoring surrounding noise */
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

// ─── Sub-components (memoised to avoid re-render cascades) ──────────────────

const InsightCard = memo(function InsightCard({
    insight,
    delay,
}: {
    insight: Insight
    delay: number
}) {
    const colors = {
        trend: {
            wrap: "bg-blue-500/5 border-blue-500/20 text-blue-400",
            icon: "bg-blue-500/20",
        },
        warning: {
            wrap: "bg-amber-500/5 border-amber-500/20 text-amber-400",
            icon: "bg-amber-500/20",
        },
        success: {
            wrap: "bg-emerald-500/5 border-emerald-500/20 text-emerald-400",
            icon: "bg-emerald-500/20",
        },
    }
    const c = colors[insight.type]
    const Icon =
        insight.type === "trend"
            ? TrendingUp
            : insight.type === "warning"
            ? AlertCircle
            : CheckCircle2

    return (
        <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={cn(
                "p-4 rounded-2xl border flex items-start gap-4 transition-transform duration-200 hover:scale-[1.02]",
                c.wrap
            )}
        >
            <div
                className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg",
                    c.icon
                )}
            >
                <Icon className="w-4 h-4" />
            </div>
            <p className="text-[13px] font-semibold leading-relaxed py-1">
                {insight.text}
            </p>
        </MotionDiv>
    )
})

const SuggestionCard = memo(function SuggestionCard({
    suggestion,
    delay,
}: {
    suggestion: Suggestion
    delay: number
}) {
    return (
        <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            whileHover={{ y: -4 }}
            className="relative group"
        >
            <div className="absolute -inset-[1px] bg-gradient-to-r from-amber-500/30 via-primary/20 to-zinc-800/50 rounded-[2rem] blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity" />
            <Card className="relative rounded-[2rem] border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/40 backdrop-blur-xl overflow-hidden shadow-lg dark:shadow-2xl transition-all duration-300 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-900/60">
                <CardContent className="p-6 space-y-4">
                    <h4 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight leading-tight">
                        {suggestion.title}
                    </h4>
                    <div className="relative p-4 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 shadow-sm">
                        <p className="text-[13px] italic text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                            &quot;{suggestion.hook}&quot;
                        </p>
                        <Sparkles className="absolute top-2 right-2 w-3 h-3 text-amber-500 opacity-20 group-hover:opacity-40 transition-opacity" />
                    </div>
                    <p className="text-[12px] text-zinc-500 leading-relaxed font-medium">
                        <span className="text-amber-600 dark:text-amber-500/80 uppercase text-[9px] font-black tracking-widest mr-1.5">
                            Strategy:
                        </span>
                        {suggestion.why}
                    </p>
                    <MotionDiv whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                            size="sm"
                            className="w-full rounded-2xl py-6 gap-3 text-xs font-black uppercase tracking-widest bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-amber-600 dark:to-amber-500 hover:from-black hover:to-zinc-900 dark:hover:from-amber-500 dark:hover:to-amber-400 text-white dark:text-black shadow-lg border-0 transition-all duration-300"
                            onClick={() => {
                                window.location.href = `/posts/new?context=${encodeURIComponent(
                                    suggestion.title
                                )}`
                            }}
                        >
                            Use This Concept <ArrowRight className="w-4 h-4" />
                        </Button>
                    </MotionDiv>
                </CardContent>
            </Card>
        </MotionDiv>
    )
})

/** Renders a single coach message body (reply text + structured sections) */
const CoachMessageBody = memo(function CoachMessageBody({
    content,
    isStreaming,
}: {
    content: CoachResponse
    isStreaming?: boolean
}) {
    const cleaned = stripMarkdown(content.reply || "")

    const paragraphs = cleaned
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean)

    return (
        <div className="relative group w-full">
            {/* Ambient glow on hover */}
            <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/10 via-primary/5 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <div className="relative bg-zinc-50 dark:bg-zinc-900/50 backdrop-blur-md p-5 rounded-3xl rounded-tl-sm text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/5 shadow-xl dark:shadow-2xl">
                <div className="space-y-4">
                    {paragraphs.map((p, idx) => {
                        // Bullet list paragraph
                        if (/^[-•]/.test(p)) {
                            const items = p
                                .split("\n")
                                .map((b) => b.replace(/^[-•]\s*/, "").trim())
                                .filter(Boolean)
                            return (
                                <ul key={idx} className="space-y-2">
                                    {items.map((item, bIdx) => (
                                        <li
                                            key={bIdx}
                                            className="flex gap-2 text-zinc-600 dark:text-zinc-300"
                                        >
                                            <span className="text-amber-500 shrink-0">•</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            )
                        }

                        // Section header: "Label: content"
                        const sectionMatch = p.match(/^([A-Z][A-Za-z\s]{2,20}):\s*(.*)/)
                        if (sectionMatch) {
                            return (
                                <div key={idx} className="space-y-1">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                                        {sectionMatch[1]}
                                    </div>
                                    <p className="text-zinc-900 dark:text-zinc-100">
                                        {sectionMatch[2]}
                                    </p>
                                </div>
                            )
                        }

                        return (
                            <p key={idx} className="text-zinc-800 dark:text-zinc-200">
                                {p}
                            </p>
                        )
                    })}

                    {/* Structured reply sections */}
                    {content.structuredReply && (
                        <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-white/10 space-y-4">
                            {[
                                {
                                    label: "The Insight",
                                    color: "text-amber-600 dark:text-amber-500/80",
                                    text: content.structuredReply.insight,
                                    bold: false,
                                },
                                {
                                    label: "The Strategy",
                                    color: "text-blue-600 dark:text-blue-500/80",
                                    text: content.structuredReply.strategy,
                                    bold: false,
                                },
                                {
                                    label: "The Action",
                                    color: "text-emerald-600 dark:text-emerald-500/80",
                                    text: content.structuredReply.action,
                                    bold: true,
                                },
                            ].map(({ label, color, text, bold }) => (
                                <div key={label} className="space-y-1">
                                    <div
                                        className={cn(
                                            "text-[10px] font-black uppercase tracking-tighter",
                                            color
                                        )}
                                    >
                                        {label}
                                    </div>
                                    <p
                                        className={cn(
                                            "text-zinc-900 dark:text-zinc-100",
                                            bold && "font-bold"
                                        )}
                                    >
                                        {text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Streaming cursor */}
                {isStreaming && (
                    <div className="flex gap-1.5 mt-4 items-center">
                        {[0, 75, 150].map((delay) => (
                            <div
                                key={delay}
                                className="w-1.5 h-1.5 rounded-full bg-amber-500/60 animate-pulse"
                                style={{ animationDelay: `${delay}ms` }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
})

/** A single row in the chat history */
const ChatRow = memo(function ChatRow({ item }: { item: ChatMessage }) {
    const isUser = item.role === "user"

    if (isUser) {
        return (
            <div className="flex justify-end">
                <MotionDiv
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-5 py-3.5 rounded-2xl rounded-tr-sm text-sm font-medium max-w-[85%] shadow-xl border border-zinc-200 dark:border-white/5"
                >
                    {item.content as string}
                </MotionDiv>
            </div>
        )
    }

    const coachContent = item.content as CoachResponse

    return (
        <div className="flex flex-col items-start gap-3 max-w-[95%] w-full">
            <MotionDiv
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="w-full"
            >
                <CoachMessageBody
                    content={coachContent}
                    isStreaming={item.isStreaming}
                />
            </MotionDiv>

            {/* Insights */}
            {!item.isStreaming &&
                coachContent.insights &&
                coachContent.insights.length > 0 && (
                    <div className="grid gap-3 w-full">
                        {coachContent.insights.map((insight, idx) => (
                            <InsightCard
                                key={idx}
                                insight={insight}
                                delay={0.1 + idx * 0.08}
                            />
                        ))}
                    </div>
                )}

            {/* Suggestions */}
            {!item.isStreaming &&
                coachContent.suggestions &&
                coachContent.suggestions.length > 0 && (
                    <div className="space-y-4 w-full pt-1">
                        <div className="flex items-center gap-3 px-1">
                            <div className="h-[1px] flex-1 bg-zinc-100 dark:bg-white/5" />
                            <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap">
                                Suggested Ideas
                            </span>
                            <div className="h-[1px] flex-1 bg-zinc-100 dark:bg-white/5" />
                        </div>
                        <div className="grid gap-4">
                            {coachContent.suggestions.map((s, idx) => (
                                <SuggestionCard
                                    key={idx}
                                    suggestion={s}
                                    delay={0.25 + idx * 0.08}
                                />
                            ))}
                        </div>
                    </div>
                )}
        </div>
    )
})

// ─── Main Component ──────────────────────────────────────────────────────────

export function AICoach({ draftContent }: { draftContent?: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isLimitReached, setIsLimitReached] = useState(false)
    const [inputValue, setInputValue] = useState("")
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])

    // Latest quickActions for the input bar (derived from last coach message)
    const lastCoachMsg = [...chatHistory].reverse().find((m) => m.role === "coach")
    const quickActions =
        !isLoading && !isLimitReached && lastCoachMsg
            ? (lastCoachMsg.content as CoachResponse).quickActions ?? []
            : []

    const pathname = usePathname()
    const scrollRef = useRef<HTMLDivElement>(null)
    // Streaming accumulator — lives outside React state to avoid re-render on every chunk
    const streamAccRef = useRef("")

    // ── Scroll helpers ──────────────────────────────────────────────────────
    const scrollToBottom = useCallback((force = false) => {
        const el = scrollRef.current
        if (!el) return
        const nearBottom =
            el.scrollHeight - el.scrollTop <= el.clientHeight + 120
        if (force || nearBottom) {
            el.scrollTop = el.scrollHeight
        }
    }, [])

    // ── Session loader ──────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("/api/coach")
                if (!res.ok) return
                const data = await res.json()
                if (data.success) {
                    setSessionId(data.sessionId ?? null)
                    if (Array.isArray(data.messages) && data.messages.length > 0) {
                        setChatHistory(data.messages)
                    }
                }
            } catch {
                // silently ignore
            }
        }
        load()
    }, [])

    // ── Mount guard (for portal) ────────────────────────────────────────────
    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    // ── External open event ─────────────────────────────────────────────────
    useEffect(() => {
        const handler = () => setIsOpen(true)
        window.addEventListener("open-ai-coach", handler)
        return () => window.removeEventListener("open-ai-coach", handler)
    }, [])

    // ── Auto-fetch on first open ────────────────────────────────────────────
    useEffect(() => {
        if (isOpen && chatHistory.length === 0 && !isLoading) {
            fetchAdvice()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    // ── Scroll on new content ───────────────────────────────────────────────
    useEffect(() => {
        scrollToBottom()
    }, [chatHistory, scrollToBottom])

    // ── Core fetch / stream logic ───────────────────────────────────────────
    const fetchAdvice = useCallback(
        async (query?: string) => {
            if (isLimitReached || isLoading) return

            const displayQuery =
                query ?? "Provide a strategic update based on my recent activity."

            // ── 1. Atomic state update: append user msg + coach placeholder ──
            setChatHistory((prev) => [
                ...prev,
                { role: "user", content: displayQuery },
                {
                    role: "coach",
                    content: { reply: "" } as CoachResponse,
                    isStreaming: true,
                },
            ])

            setIsLoading(true)
            streamAccRef.current = ""

            // Debounce timer for streaming updates
            let debounceTimer: ReturnType<typeof setTimeout> | null = null
            let pendingReply = ""

            const flushStreamUpdate = () => {
                const snapshot = pendingReply
                setChatHistory((prev) => {
                    const next = [...prev]
                    const lastIdx = next.length - 1
                    if (next[lastIdx]?.role === "coach") {
                        next[lastIdx] = {
                            ...next[lastIdx],
                            content: {
                                ...(next[lastIdx].content as CoachResponse),
                                reply: snapshot,
                            },
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
                    body: JSON.stringify({
                        page: pathname,
                        draftContent,
                        userQuery: query,
                        sessionId,
                    }),
                })

                // ── Rate limit ──
                if (res.status === 429) {
                    const data = await res.json()
                    setIsLimitReached(true)
                    setChatHistory((prev) => {
                        const next = [...prev]
                        next[next.length - 1] = {
                            role: "coach",
                            content: {
                                reply: data.message ?? "Daily limit reached. Upgrade to Pro!",
                            },
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

                // ── Stream loop ──
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    streamAccRef.current += decoder.decode(value, { stream: true })

                    // Extract partial reply without throwing
                    const partial = extractPartialReply(streamAccRef.current)
                    if (partial) {
                        pendingReply = partial
                        // Debounce: batch updates every ~50ms
                        if (debounceTimer) clearTimeout(debounceTimer)
                        debounceTimer = setTimeout(flushStreamUpdate, 50)
                    }
                }

                // Flush any remaining debounce
                if (debounceTimer) {
                    clearTimeout(debounceTimer)
                    flushStreamUpdate()
                }

                // ── Final parse ──
                const parsed = parseFullResponse(streamAccRef.current)
                if (parsed) {
                    // Prepend any non-JSON intro text
                    const firstBrace = streamAccRef.current.indexOf("{")
                    const intro =
                        firstBrace > 0
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
                        next[next.length - 1] = {
                            role: "coach",
                            content: finalResponse,
                            isStreaming: false,
                        }
                        return next
                    })
                } else {
                    // Fallback: use whatever we accumulated as plain text
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
            } catch {
                setChatHistory((prev) => {
                    const next = [...prev]
                    next[next.length - 1] = {
                        role: "coach",
                        content: {
                            reply: "Something went wrong on my end. Try again in a moment.",
                        },
                        isStreaming: false,
                    }
                    return next
                })
            } finally {
                setIsLoading(false)
                scrollToBottom(true)
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [pathname, draftContent, sessionId, isLimitReached, isLoading]
    )

    // ── New chat ────────────────────────────────────────────────────────────
    const startNewChat = useCallback(async () => {
        try {
            await fetch("/api/coach", { method: "DELETE" })
        } catch {
            // ignore
        }
        setChatHistory([])
        setSessionId(null)
        setIsLimitReached(false)
        streamAccRef.current = ""
        // fetchAdvice will be triggered by the empty chatHistory + isOpen effect
        // but that effect only fires once. Call directly:
        setTimeout(() => fetchAdvice(), 50)
    }, [fetchAdvice])

    // ── Send handler ────────────────────────────────────────────────────────
    const handleSend = useCallback(() => {
        const q = inputValue.trim()
        if (!q || isLoading || isLimitReached) return
        setInputValue("")
        fetchAdvice(q)
    }, [inputValue, isLoading, isLimitReached, fetchAdvice])

    // ── Render panel ────────────────────────────────────────────────────────
    const renderPanel = () => (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <MotionDiv
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998]"
                    />

                    {/* Side panel */}
                    <MotionDiv
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 26, stiffness: 190 }}
                        className="fixed inset-y-0 right-0 h-[100dvh] w-full md:w-[500px] z-[9999] flex flex-col border-l border-zinc-200 dark:border-white/5 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.12)] dark:shadow-[0_0_100px_rgba(0,0,0,0.5)]"
                        style={{ background: "var(--coach-bg, #fff)" }}
                    >
                        {/* Base background layers */}
                        <div className="absolute inset-0 bg-white dark:bg-zinc-950 pointer-events-none" />
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none [background-image:url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />

                        {/* ── Header (shrink-0 = never squishes) ── */}
                        <div className="relative shrink-0 h-20 px-6 flex items-center justify-between z-10 border-b border-zinc-200 dark:border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="relative w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center shadow-lg overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Sparkles className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                                        AI Coach
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse block" />
                                        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 underline underline-offset-4 decoration-zinc-200 dark:decoration-zinc-800 uppercase tracking-[0.2em]">
                                            Strategist Active
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <MotionDiv whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <button
                                        onClick={startNewChat}
                                        disabled={isLoading}
                                        className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black text-amber-500/80 hover:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 uppercase tracking-[0.1em] transition-all disabled:opacity-40"
                                    >
                                        <Plus className="w-3 h-3" />
                                        New Session
                                    </button>
                                </MotionDiv>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsOpen(false)}
                                    className="rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        {/* ── Messages (flex-1 = takes all remaining vertical space) ── */}
                        <div
                            ref={scrollRef}
                            className="relative flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 py-6 space-y-4 scrollbar-hide"
                        >
                            {/* Skeleton while loading and empty */}
                            {chatHistory.length === 0 && isLoading && (
                                <div className="space-y-6 animate-pulse">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex flex-col gap-2">
                                            <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                                            <div className="h-20 w-full bg-zinc-100 dark:bg-zinc-900 rounded-2xl" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {chatHistory.map((item, i) => (
                                <ChatRow key={i} item={item} />
                            ))}

                            {/* "Thinking" indicator shown only while loading and last msg isn't a streaming placeholder */}
                            {isLoading &&
                                chatHistory.length > 0 &&
                                !(chatHistory[chatHistory.length - 1] as ChatMessage)
                                    .isStreaming && (
                                    <div className="flex items-center gap-2 text-zinc-400 italic text-xs animate-pulse">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Coach is thinking…
                                    </div>
                                )}
                        </div>

                        {/* ── Input bar (shrink-0 = always visible at bottom) ── */}
                        <div className="relative shrink-0 z-20 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-white/5 px-4 md:px-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-3">
                            {/* Quick action pills */}
                            {quickActions.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                                    {quickActions.map((action, i) => (
                                        <MotionDiv
                                            key={i}
                                            whileHover={{ y: -2 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <button
                                                onClick={() => fetchAdvice(action)}
                                                disabled={isLoading}
                                                className="text-[10px] font-black px-4 py-2 rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/5 transition-all whitespace-nowrap uppercase tracking-widest disabled:opacity-40"
                                            >
                                                {action}
                                            </button>
                                        </MotionDiv>
                                    ))}
                                </div>
                            )}

                            {/* Text input */}
                            <div className="relative group/input">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-amber-500 rounded-[1.5rem] blur opacity-0 group-focus-within/input:opacity-20 transition-all duration-500 pointer-events-none" />
                                <div className="relative flex items-center">
                                    <input
                                        type="text"
                                        disabled={isLimitReached}
                                        placeholder={
                                            isLimitReached
                                                ? "Daily limit reached. Upgrade to Pro!"
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
                                            "w-full bg-zinc-50 dark:bg-black/60 border border-zinc-200 dark:border-white/10 rounded-[1.5rem] px-6 h-14 text-sm focus:outline-none focus:border-primary/50 transition-all font-medium pr-14 placeholder:text-zinc-400 text-zinc-900 dark:text-white",
                                            isLimitReached && "opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                    <MotionDiv
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="absolute right-2.5"
                                    >
                                        <button
                                            onClick={handleSend}
                                            disabled={!inputValue.trim() || isLoading || isLimitReached}
                                            className="h-10 w-10 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center hover:bg-black dark:hover:bg-amber-400 transition-colors disabled:opacity-20 disabled:grayscale shadow-lg"
                                        >
                                            <Send className="w-4 h-4 fill-current" />
                                        </button>
                                    </MotionDiv>
                                </div>
                            </div>
                        </div>
                    </MotionDiv>
                </>
            )}
        </AnimatePresence>
    )

    return (
        <>
            {/* Floating trigger button */}
            <MotionDiv
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="fixed bottom-24 right-6 z-40"
            >
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 px-6 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 border border-zinc-700/50 shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                    <div className="relative">
                        <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-ping opacity-75" />
                    </div>
                    <span className="font-bold tracking-tight">AI Coach</span>
                </Button>
            </MotionDiv>

            {/* Portal */}
            {mounted && createPortal(renderPanel(), document.body)}
        </>
    )
}
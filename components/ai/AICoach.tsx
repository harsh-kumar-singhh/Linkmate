"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
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
import { Plus, Maximize2, Minimize2, Sparkle } from "lucide-react"

// Fix for Framer Motion version 12 type errors on Vercel
const MotionDiv = motion.div as any

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

interface CoachEnvelope {
    success: boolean
    reply?: string
    data?: {
        insights: Insight[]
        suggestions: Suggestion[]
        quickActions: string[]
    }
    errorCode?: string
    message?: string
}

export function AICoach({ draftContent }: { draftContent?: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [response, setResponse] = useState<CoachResponse | null>(null)
    const [chatHistory, setChatHistory] = useState<{ role: "user" | "coach", content: string | CoachResponse, isStreaming?: boolean }[]>([])
    const [inputValue, setInputValue] = useState("")
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isLimitReached, setIsLimitReached] = useState(false);
    const pathname = usePathname()
    const scrollRef = useRef<HTMLDivElement>(null)
    const isUserMessageRef = useRef(false)

    // Load active session on mount
    useEffect(() => {
        const loadSession = async () => {
            try {
                const res = await fetch("/api/coach");
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setSessionId(data.sessionId);
                        if (data.messages && data.messages.length > 0) {
                            setChatHistory(data.messages);
                            const lastMsg = data.messages[data.messages.length - 1];
                            if (lastMsg.role === "coach") {
                                setResponse(lastMsg.content);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load session:", err);
            }
        };
        loadSession();
    }, []);

    const fetchAdvice = useCallback(async (query?: string) => {
        if (isLimitReached) return;

        setIsLoading(true)
        setResponse(null)
        
        let displayQuery = query || "Give me a quick update and some coach advice.";
        
        // Add user message to history immediately
        const newUserMessage = { role: "user" as const, content: displayQuery };
        setChatHistory(prev => [...prev, newUserMessage]);
        
        const placeholderCoachMessage: { role: "coach", content: any, isStreaming?: boolean } = { 
            role: "coach", 
            content: { reply: "" },
            isStreaming: true 
        };
        
        setChatHistory(prev => [...prev, placeholderCoachMessage]);
        isUserMessageRef.current = true;

        try {
            const res = await fetch("/api/coach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    page: pathname,
                    draftContent,
                    userQuery: query,
                    sessionId
                })
            })

            if (res.status === 429) {
                setIsLimitReached(true);
                const data = await res.json();
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1] = {
                        role: "coach",
                        content: { reply: data.message || "Limit reached", insights: [], suggestions: [] },
                    };
                    return newHistory;
                });
                return;
            }

            if (!res.ok) throw new Error("Failed to fetch advice");

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = "";

            if (!reader) throw new Error("No reader available");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                accumulatedText += chunk;

                let partialReply = "";
                const replyMatch = accumulatedText.match(/"reply":\s*"([^"]*)"/);
                if (replyMatch) {
                    partialReply = replyMatch[1];
                } else {
                    const partialMatch = accumulatedText.match(/"reply":\s*"([^"]*$)/);
                    if (partialMatch) partialReply = partialMatch[1];
                }

                setChatHistory(prev => {
                    const newHistory = [...prev];
                    const lastIndex = newHistory.length - 1;
                    if (newHistory[lastIndex].role === "coach") {
                        newHistory[lastIndex] = {
                            ...newHistory[lastIndex],
                            content: { 
                                ...(newHistory[lastIndex].content as CoachResponse),
                                reply: partialReply 
                            }
                        };
                    }
                    return newHistory;
                });
            }

            try {
                const finalData = JSON.parse(accumulatedText);
                const mappedResponse: CoachResponse = {
                    reply: finalData.reply,
                    insights: finalData.insights || [],
                    suggestions: finalData.suggestions || [],
                    quickActions: finalData.quickActions || []
                };
                
                setResponse(mappedResponse);
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1] = {
                        role: "coach",
                        content: mappedResponse,
                        isStreaming: false
                    };
                    return newHistory;
                });
            } catch (e) {}

        } catch (err) {
            setChatHistory(prev => {
                const newHistory = [...prev];
                newHistory[newHistory.length - 1] = {
                    role: "coach",
                    content: { reply: "Technical glitch. Ready to try again!", insights: [], suggestions: [] }
                };
                return newHistory;
            })
        } finally {
            setIsLoading(false)
        }
    }, [pathname, draftContent, sessionId, isLimitReached])

    const startNewChat = async () => {
        try {
            await fetch("/api/coach", { method: "DELETE" });
            setChatHistory([]);
            setResponse(null);
            setSessionId(null);
            setIsLimitReached(false);
            fetchAdvice();
        } catch (err) {
            console.error("Failed to start new chat:", err);
        }
    }

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('open-ai-coach', handleOpen);
        return () => window.removeEventListener('open-ai-coach', handleOpen);
    }, []);

    // Initial advice if needed
    useEffect(() => {
        if (isOpen && chatHistory.length === 0 && !isLoading) {
            fetchAdvice();
        }
    }, [isOpen, chatHistory.length, isLoading, fetchAdvice]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            const isAtBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop <= scrollRef.current.clientHeight + 100;
            if (isUserMessageRef.current || isAtBottom) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                if (isUserMessageRef.current) isUserMessageRef.current = false;
            }
        }
    }, [chatHistory])

    const handleSend = () => {
        if (!inputValue.trim() || isLimitReached) return
        fetchAdvice(inputValue)
        setInputValue("")
    }

    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

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

                    {/* Panel */}
                    <MotionDiv
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 180 }}
                        className="fixed inset-y-0 right-0 top-0 h-[100dvh] w-full md:w-[500px] bg-zinc-950 z-[9999] shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col border-l border-white/5 overflow-hidden"
                    >
                        {/* Background Depth Layers - SOLID DARK BG ONLY */}
                        <div className="absolute inset-0 bg-zinc-950 pointer-events-none" />
                        <div className="absolute inset-0 noise-bg opacity-[0.03] pointer-events-none" />
                        
                        {/* Header */}
                        <div className="shrink-0 relative h-20 px-6 flex items-center justify-between z-10 border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center shadow-lg dark:shadow-2xl relative group overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Sparkles className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-xl font-bold tracking-tight text-white">AI Coach</h2>
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <p className="text-[10px] font-bold text-zinc-400 underline underline-offset-4 decoration-zinc-800 uppercase tracking-[0.2em]">Strategist Active</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <MotionDiv whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <button 
                                        onClick={startNewChat}
                                        className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black text-amber-500/80 hover:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 uppercase tracking-[0.1em] transition-all"
                                    >
                                        <Plus className="w-3 h-3" />
                                        New Session
                                    </button>
                                </MotionDiv>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setIsOpen(false)} 
                                    className="rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                        
                        {/* Chat Content */}
                        <div 
                            ref={scrollRef} 
                            className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-8 scrollbar-hide overscroll-contain"
                        >
                            {chatHistory.length === 0 && isLoading && (
                                <div className="space-y-6">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex flex-col gap-2 animate-pulse">
                                            <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                                            <div className="h-20 w-full bg-zinc-100 dark:bg-zinc-900 rounded-2xl" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {chatHistory.map((item, i) => (
                                <div key={i} className={cn(
                                    "flex flex-col gap-2",
                                    item.role === "user" ? "items-end" : "items-start"
                                )}>
                                    {item.role === "user" ? (
                                        <MotionDiv 
                                            initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                            className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-5 py-3.5 rounded-2xl rounded-tr-sm text-sm font-medium max-w-[85%] shadow-xl border border-white/5"
                                        >
                                            {item.content as string}
                                        </MotionDiv>
                                    ) : (
                                        <div className="space-y-6 max-w-[95%] w-full">
                                            <MotionDiv 
                                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                className="relative group w-full"
                                            >
                                                {/* Soft Glow behind AI Message */}
                                                <div className="absolute -inset-1 bg-gradient-to-br from-amber-500/10 via-primary/5 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                                                
                                                <div className="relative bg-zinc-900/50 backdrop-blur-md p-5 rounded-3xl rounded-tl-sm text-[15px] leading-relaxed text-zinc-200 border border-white/5 shadow-2xl overflow-hidden">
                                                    {(() => {
                                                        const content = item.content as CoachResponse;
                                                        if (content.structuredReply) {
                                                            return (
                                                                <div className="space-y-4 max-w-full">
                                                                    <div className="space-y-1">
                                                                        <div className="text-[10px] font-black uppercase tracking-tighter text-amber-500/80">The Insight</div>
                                                                        <p className="text-zinc-100">{content.structuredReply.insight}</p>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="text-[10px] font-black uppercase tracking-tighter text-blue-500/80">The Strategy</div>
                                                                        <p className="text-zinc-100">{content.structuredReply.strategy}</p>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="text-[10px] font-black uppercase tracking-tighter text-emerald-500/80">The Action</div>
                                                                        <p className="font-bold text-white">{content.structuredReply.action}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        // Render as structured blocks
                                                        const rawReply = typeof item.content === 'string' ? item.content : (item.content as CoachResponse).reply || "";
                                                        
                                                        // Split into paragraphs and strip markdown
                                                        const paragraphs = rawReply
                                                            .split(/\n\n+/)
                                                            .map(p => p.replace(/[\*#_]/g, '').trim())
                                                            .filter(p => p.length > 0);

                                                        return (
                                                            <div className="space-y-4 max-w-full overflow-hidden">
                                                                {paragraphs.map((p, idx) => {
                                                                    // Check if it's a bullet point
                                                                    if (p.startsWith('-') || p.startsWith('•')) {
                                                                        const bulletItems = p.split(/\n/).map(b => b.replace(/^[-•]\s*/, '').trim());
                                                                        return (
                                                                            <ul key={idx} className="space-y-2">
                                                                                {bulletItems.map((bi, bIdx) => (
                                                                                    <li key={bIdx} className="flex gap-2 text-zinc-300">
                                                                                        <span className="text-amber-500 shrink-0">•</span>
                                                                                        <span>{bi}</span>
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        );
                                                                    }
                                                                    
                                                                    // Check for section headers (capitalized words at start)
                                                                    const sectionMatch = p.match(/^([A-Z][A-Za-z\s]{2,20}):\s*(.*)/);
                                                                    if (sectionMatch) {
                                                                        return (
                                                                            <div key={idx} className="space-y-1">
                                                                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{sectionMatch[1]}</div>
                                                                                <p className="text-zinc-100">{sectionMatch[2]}</p>
                                                                            </div>
                                                                        );
                                                                    }

                                                                    return <p key={idx} className="text-zinc-200">{p}</p>;
                                                                })}
                                                            </div>
                                                        );
                                                    })()}
                                                    {item.isStreaming && (
                                                        <div className="flex gap-1.5 mt-4 items-center">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-pulse" />
                                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-pulse delay-75" />
                                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 animate-pulse delay-150" />
                                                        </div>
                                                    )}
                                                </div>
                                            </MotionDiv>

                                            {/* Insights */}
                                            {(item.content as CoachResponse).insights && (item.content as CoachResponse).insights!.length > 0 && (
                                                <div className="grid gap-3">
                                                    {(item.content as CoachResponse).insights?.map((insight, idx) => (
                                                        <MotionDiv
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: 0.1 + idx * 0.1 }}
                                                            key={idx}
                                                            className={cn(
                                                                "p-4 rounded-2xl border flex items-start gap-4 transition-all duration-300 hover:scale-[1.02]",
                                                                insight.type === "trend" ? "bg-blue-500/5 border-blue-500/20 text-blue-400" :
                                                                    insight.type === "warning" ? "bg-amber-500/5 border-amber-500/20 text-amber-400" :
                                                                        "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg",
                                                                insight.type === "trend" ? "bg-blue-500/20" :
                                                                    insight.type === "warning" ? "bg-amber-500/20" : "bg-emerald-500/20"
                                                            )}>
                                                                {insight.type === "trend" ? <TrendingUp className="w-4 h-4" /> :
                                                                    insight.type === "warning" ? <AlertCircle className="w-4 h-4" /> :
                                                                        <CheckCircle2 className="w-4 h-4" />}
                                                            </div>
                                                            <p className="text-[13px] font-semibold leading-relaxed py-1">{insight.text}</p>
                                                        </MotionDiv>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Suggestions */}
                                            {(item.content as CoachResponse).suggestions && (item.content as CoachResponse).suggestions!.length > 0 && (
                                                <div className="space-y-4 pt-2">
                                                    <div className="flex items-center gap-3 px-1">
                                                        <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-white/5" />
                                                        <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] whitespace-nowrap">Suggested Ideas</span>
                                                        <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-white/5" />
                                                    </div>
                                                    <div className="grid gap-4">
                                                        {(item.content as CoachResponse).suggestions?.map((suggestion, idx) => (
                                                            <MotionDiv
                                                                key={idx}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: 0.3 + idx * 0.1 }}
                                                                whileHover={{ y: -5 }}
                                                                className="relative group"
                                                            >
                                                                <div className="absolute -inset-[1px] bg-gradient-to-r from-amber-500/30 via-primary/20 to-zinc-800/50 rounded-[2rem] blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                
                                                                <Card className="relative rounded-[2rem] border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-900/40 backdrop-blur-xl overflow-hidden shadow-lg dark:shadow-2xl transition-all duration-300 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-900/60">
                                                                    <CardContent className="p-6 space-y-4">
                                                                        <div className="flex justify-between items-start">
                                                                            <h4 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight leading-tight">{suggestion.title}</h4>
                                                                        </div>
                                                                        <div className="relative p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 group-hover:border-zinc-200 dark:group-hover:border-white/10 transition-colors">
                                                                            <p className="text-[13px] italic text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">&quot;{suggestion.hook}&quot;</p>
                                                                            <div className="absolute top-2 right-2 opacity-20 group-hover:opacity-40 transition-opacity">
                                                                                <Sparkles className="w-3 h-3 text-amber-500" />
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-[12px] text-zinc-500 leading-relaxed font-medium">
                                                                            <span className="text-amber-600 dark:text-amber-500/80 uppercase text-[9px] font-black tracking-widest mr-1.5">Strategy:</span> {suggestion.why}
                                                                        </p>
                                                                        <MotionDiv whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                                                            <Button 
                                                                                size="sm" 
                                                                                className="w-full rounded-2xl py-6 gap-3 text-xs font-black uppercase tracking-widest bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-amber-600 dark:to-amber-500 hover:from-black hover:to-zinc-900 dark:hover:from-amber-500 dark:hover:to-amber-400 text-white dark:text-black shadow-lg dark:shadow-[0_4px_20px_rgba(245,158,11,0.2)] border-0 transition-all duration-300" 
                                                                                onClick={() => {
                                                                                    window.location.href = `/posts/new?context=${encodeURIComponent(suggestion.title)}`
                                                                                }}
                                                                            >
                                                                                Use This Concept <ArrowRight className="w-4 h-4" />
                                                                            </Button>
                                                                        </MotionDiv>
                                                                    </CardContent>
                                                                </Card>
                                                            </MotionDiv>
                                                        ))}
                                                    </div>
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
                        <div className="shrink-0 p-4 md:p-6 bg-zinc-900 border-t border-white/5 space-y-4 z-20 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
                            {response?.quickActions && !isLoading && !isLimitReached && (
                                <div className="flex overflow-x-auto scrollbar-hide gap-3 pb-2 -mx-2 px-2">
                                    {response.quickActions.map((action, i) => (
                                        <MotionDiv key={i} whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}>
                                            <button
                                                onClick={() => fetchAdvice(action)}
                                                className="text-[10px] font-black px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 hover:border-white/10 transition-all whitespace-nowrap shadow-xl uppercase tracking-widest"
                                            >
                                                {action}
                                            </button>
                                        </MotionDiv>
                                    ))}
                                </div>
                            )}
                            
                            <div className="relative group/input">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-amber-500 rounded-[1.5rem] blur opacity-0 group-focus-within/input:opacity-20 group-hover/input:opacity-10 transition-all duration-500" />
                                
                                <MotionDiv
                                    animate={{ 
                                        scale: inputValue.length > 0 ? 1.01 : 1,
                                    }}
                                    className="relative flex items-center"
                                >
                                    <input
                                        type="text"
                                        disabled={isLimitReached}
                                        placeholder={isLimitReached ? "Daily limit reached. Upgrade to Pro!" : "Ask your coach anything..."}
                                        className={cn(
                                            "w-full bg-zinc-50 dark:bg-black/60 border border-zinc-200 dark:border-white/10 rounded-[1.5rem] px-6 h-14 text-sm focus:outline-none focus:ring-0 focus:border-primary/50 transition-all font-medium pr-14 placeholder:text-zinc-400 text-zinc-900 dark:text-white",
                                            isLimitReached && "opacity-50 cursor-not-allowed"
                                        )}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                    />
                                    <MotionDiv
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="absolute right-2.5"
                                    >
                                        <button
                                            onClick={handleSend}
                                            disabled={!inputValue.trim() || isLoading || isLimitReached}
                                            className="h-10 w-10 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center hover:bg-black dark:hover:bg-amber-400 transition-colors disabled:opacity-20 disabled:grayscale shadow-lg dark:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                        >
                                            <Send className="w-4 h-4 fill-current" />
                                        </button>
                                    </MotionDiv>
                                </MotionDiv>
                            </div>
                        </div>
                    </MotionDiv>
                </>
            )}
        </AnimatePresence>
    )

    return (
        <>
            {/* Floating Button */}
            <MotionDiv
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="fixed bottom-24 right-6 z-40"
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
            </MotionDiv>

            {/* Side Panel / Modal as Portal */}
            {mounted && createPortal(renderPanel(), document.body)}
        </>
    )
}

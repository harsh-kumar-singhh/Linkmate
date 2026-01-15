"use client"

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react"
import { AnimatedCard } from "@/components/animated/AnimatedCard"
import TextareaAutosize from "react-textarea-autosize"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar as CalendarIcon, Clock, Image as ImageIcon, Smile, X, MoreHorizontal, ThumbsUp, MessageCircle, Share2, Send, Sparkles, ArrowRight, Trash2 } from "lucide-react"
import { AIModal } from "@/components/ai-modal"
import { useSearchParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

function EditorContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [content, setContent] = useState("")
    const [showAIDialog, setShowAIDialog] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [scheduledFor, setScheduledFor] = useState<string>("")
    const [showScheduler, setShowScheduler] = useState(false)
    const [isInitialLoading, setIsInitialLoading] = useState(false)
    const postId = searchParams.get("id")

    useEffect(() => {
        const fetchPost = async () => {
            if (!postId) return
            setIsInitialLoading(true)
            try {
                const response = await fetch(`/api/posts/${postId}`)
                if (response.ok) {
                    const data = await response.json()
                    setContent(data.content)
                    if (data.scheduledFor) {
                        setScheduledFor(new Date(data.scheduledFor).toISOString().slice(0, 16))
                        setShowScheduler(true)
                    }
                }
            } catch (error) {
                console.error("Error fetching post:", error)
            } finally {
                setIsInitialLoading(false)
            }
        }

        fetchPost()

        const dateParam = searchParams.get("date")
        if (dateParam && !postId) {
            const date = new Date(dateParam)
            if (date < new Date()) {
                date.setDate(date.getDate() + 1)
            }
            setScheduledFor(date.toISOString().slice(0, 16))
            setShowScheduler(true)
        }
    }, [searchParams, postId])

    const handleGenerate = async ({ topic, style }: { topic: string; style: string }) => {
        setIsGenerating(true)
        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic, style }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate post")
            }

            if (data.content) {
                setContent(data.content)
                setShowAIDialog(false)
            }
        } catch (error) {
            console.error("Generation failed", error)
            alert(error instanceof Error ? error.message : "Failed to generate post. Please check your API key.")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleSavePost = async (status: "DRAFT" | "SCHEDULED" | "PUBLISHED") => {
        if (!content.trim()) return

        try {
            const url = postId ? `/api/posts/${postId}` : "/api/posts"
            const method = postId ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content,
                    status,
                    scheduledFor: status === "SCHEDULED" ? scheduledFor : undefined,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to save post");
            }

            if (status !== "DRAFT") {
                setContent("")
                router.push("/calendar")
            }
        } catch (error) {
            console.error("Error saving post:", error);
            alert(error instanceof Error ? error.message : "Failed to save post");
        }
    }

    const handleDelete = async () => {
        if (!postId || !confirm("Are you sure you want to delete this post?")) return

        try {
            const response = await fetch(`/api/posts/${postId}`, { method: "DELETE" })
            if (response.ok) {
                router.push("/dashboard")
            }
        } catch (error) {
            console.error("Error deleting post:", error)
            alert("Failed to delete post")
        }
    }

    if (isInitialLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 h-full py-12">
            <AIModal
                isOpen={showAIDialog}
                onClose={() => setShowAIDialog(false)}
                onGenerate={handleGenerate}
            />

            {/* Editor Column */}
            <div className="space-y-12">
                <div className="flex items-end justify-between">
                    <div className="space-y-1">
                        <h1 className="text-[12px] font-bold tracking-[0.2em] text-muted-foreground uppercase">Composition</h1>
                        <h2 className="text-4xl font-bold tracking-tight text-site-fg">
                            {postId ? "Refine publication" : "New publication"}
                        </h2>
                    </div>

                    {postId && (
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive transition-colors" onClick={handleDelete}>
                            <Trash2 className="w-5 h-5" />
                        </Button>
                    )}
                </div>

                <div className="space-y-8">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Post Content</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-2 text-blue-600 hover:bg-blue-100 rounded-full px-4"
                                onClick={() => setShowAIDialog(true)}
                                disabled={isGenerating}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span className="text-[12px] font-bold tracking-tight">AI Assistant</span>
                            </Button>
                        </div>
                        <div className="relative group">
                            <TextareaAutosize
                                minRows={10}
                                placeholder="What's worth sharing today?"
                                className="w-full resize-none text-2xl font-light leading-relaxed text-site-fg placeholder:text-muted-foreground/30 bg-transparent focus:outline-none transition-all pr-12"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                autoFocus
                            />
                            <div className="absolute right-0 bottom-0 text-[11px] font-bold text-muted-foreground/40 tabular-nums uppercase tracking-widest">
                                {content.length} / 3000
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 space-y-8">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                className={cn("h-14 px-6 rounded-2xl gap-3 transition-all", showScheduler && "border-blue-600 text-blue-600 bg-blue-100 shadow-none")}
                                onClick={() => setShowScheduler(!showScheduler)}
                            >
                                <CalendarIcon className="w-5 h-5" />
                                <span className="font-bold tracking-tight">Schedule</span>
                            </Button>

                            <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl text-muted-foreground hover:bg-secondary/50 transition-colors">
                                <Smile className="w-5 h-5" />
                            </Button>
                        </div>

                        {showScheduler && (
                            <AnimatedCard
                                animation="slide-up-sm"
                                className="p-8 bg-secondary/30 rounded-[32px] space-y-4"
                            >
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Preferred Release</label>
                                <input
                                    type="datetime-local"
                                    className="w-full h-14 bg-background border border-border rounded-xl px-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                                    value={scheduledFor}
                                    onChange={(e) => setScheduledFor(e.target.value)}
                                    min={new Date().toISOString().slice(0, 16)}
                                />
                            </AnimatedCard>
                        )}
                    </div>
                </div>

                <div className="pt-12 flex items-center justify-between border-t border-border">
                    <Button variant="ghost" className="h-12 rounded-xl px-6 text-muted-foreground font-bold text-[13px] uppercase tracking-widest hover:text-site-fg hover:bg-transparent" onClick={() => handleSavePost("DRAFT")}>
                        Hold as draft
                    </Button>
                    <div className="flex items-center gap-4">
                        {showScheduler ? (
                            <Button
                                size="lg"
                                className="h-16 px-10 rounded-2xl shadow-premium gap-3"
                                onClick={() => {
                                    if (scheduledFor) handleSavePost("SCHEDULED")
                                    else alert("Please pick a date.")
                                }}
                            >
                                <span>Schedule post</span>
                                <ArrowRight className="w-5 h-5" />
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                className="h-16 px-10 rounded-2xl shadow-premium shadow-blue-600/20 gap-3"
                                onClick={() => handleSavePost("PUBLISHED")}
                                disabled={!content.trim()}
                            >
                                <span>Publish now</span>
                                <Send className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Preview Column */}
            <div className="hidden lg:block space-y-12">
                <div className="space-y-1">
                    <h1 className="text-[12px] font-bold tracking-[0.2em] text-blue-600 uppercase">Perspective</h1>
                    <h2 className="text-4xl font-bold tracking-tight text-site-fg">Preview</h2>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-[48px] blur-3xl -z-10" />
                    <AnimatedCard
                        animation="fade-in-up"
                        className="bg-card border border-border rounded-[40px] shadow-premium overflow-hidden max-w-lg mx-auto"
                    >
                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground">
                                    <ImageIcon className="w-6 h-6" />
                                </div>
                                <div className="space-y-0.5">
                                    <div className="text-sm font-semibold text-site-fg">Your Name</div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        Posting now <span className="text-[10px]">•</span> 🌐
                                    </div>
                                </div>
                            </div>

                            <div className="min-h-[200px] mb-12">
                                <p className="text-lg font-light leading-relaxed text-site-fg whitespace-pre-wrap">
                                    {content || <span className="text-muted-foreground italic">The distribution of ideas begins with a single line...</span>}
                                </p>
                            </div>

                            <div className="flex items-center justify-between border-t border-border pt-6 text-muted-foreground/60">
                                {['Like', 'Comment', 'Share'].map((action) => (
                                    <div key={action} className="text-[13px] font-bold uppercase tracking-widest">{action}</div>
                                ))}
                            </div>
                        </div>
                    </AnimatedCard>
                </div>
            </div>
        </div>

    )
}

export default function NewPostPage() {
    return (
        <div className="max-w-7xl mx-auto px-8">
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
                <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>}>
                <EditorContent />
            </Suspense>
        </div>
    )
}

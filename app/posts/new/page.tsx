"use client"

export const dynamic = "force-dynamic";

import { useSession } from "next-auth/react"
import { useEffect, useState, Suspense } from "react"
import { AnimatedCard } from "@/components/animated/AnimatedCard"
import TextareaAutosize from "react-textarea-autosize"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Calendar,
    Clock,
    Image as ImageIcon,
    X,
    MoreHorizontal,
    Send,
    Sparkles,
    ArrowRight,
    Trash2,
    PenTool,
    Loader2,
    CheckCircle2
} from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

function EditorContent() {
    const { status, data: session } = useSession()
    const searchParams = useSearchParams()
    const router = useRouter()

    // State
    const [mode, setMode] = useState<"ai" | "manual" | "template">("ai")
    const [content, setContent] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [scheduledFor, setScheduledFor] = useState<string>("")
    const [isInitialLoading, setIsInitialLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // AI State
    const [topic, setTopic] = useState("")
    const [style, setStyle] = useState("Professional")
    const styles = ["Professional", "Casual", "Enthusiastic", "Storytelling", "Write Like Me"]

    const postId = searchParams.get("id")

    // Auth redirection
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login")
        }
    }, [status, router])

    // Fetch existing post
    useEffect(() => {
        const fetchPost = async () => {
            if (!postId || status !== "authenticated") return
            setIsInitialLoading(true)
            try {
                const response = await fetch(`/api/posts/${postId}`)
                if (response.ok) {
                    const data = await response.json()
                    setContent(data.content)
                    // If editing, switch to manual mode automatically
                    setMode("manual")

                    if (data.scheduledFor) {
                        const date = new Date(data.scheduledFor);
                        const localYMDHM = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                        setScheduledFor(localYMDHM);
                    }
                }
            } catch (error) {
                console.error("Error fetching post:", error)
            } finally {
                setIsInitialLoading(false)
            }
        }

        fetchPost()

        // Handle date param from calendar
        const dateParam = searchParams.get("date")
        if (dateParam && !postId) {
            const date = new Date(dateParam)
            if (date < new Date()) {
                date.setDate(date.getDate() + 1)
            }
            const localYMDHM = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            setScheduledFor(localYMDHM);
        }
    }, [searchParams, postId, status])

    // Handlers
    const handleGenerate = async () => {
        if (status !== "authenticated" || !topic) return

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
                setMode("manual") // Switch to manual to edit the result
            }
        } catch (error) {
            console.error("Generation failed", error)
            alert(error instanceof Error ? error.message : "Failed to generate post.")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleSavePost = async (statusArg: "DRAFT" | "SCHEDULED" | "PUBLISHED") => {
        if (!content.trim() || status !== "authenticated") return

        setIsSaving(true)
        try {
            let url = postId ? `/api/posts/${postId}` : "/api/posts"
            let method = postId ? "PUT" : "POST"

            if (statusArg === "SCHEDULED") {
                url = "/api/posts/schedule"
                method = "POST"
            }

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content,
                    status: statusArg,
                    scheduledFor: statusArg === "SCHEDULED" ? new Date(scheduledFor).toISOString() : undefined,
                    postId: statusArg === "SCHEDULED" ? postId : undefined
                }),
            })

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to save post");
            }

            if (statusArg !== "DRAFT") {
                router.push("/calendar")
            } else {
                router.push("/dashboard")
            }
        } catch (error) {
            console.error("Error saving post:", error);
            alert(error instanceof Error ? error.message : "Failed to save post");
        } finally {
            setIsSaving(false)
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

    if (status === "loading" || isInitialLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-2 gap-12">

            {/* Left Column: Composition */}
            <div className="space-y-8">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Create New Post</h1>
                        <p className="text-muted-foreground mt-1">Generate AI content or write your own</p>
                    </div>
                    {postId && (
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={handleDelete}>
                            <Trash2 className="w-5 h-5" />
                        </Button>
                    )}
                </div>

                {/* Mode Switch */}
                <div className="bg-secondary/50 p-1 rounded-xl flex items-center font-medium">
                    <button
                        onClick={() => setMode("ai")}
                        className={cn(
                            "flex-1 py-2.5 px-4 rounded-lg text-sm transition-all flex items-center justify-center gap-2",
                            mode === "ai" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Sparkles className="w-4 h-4" />
                        AI Generate
                    </button>
                    <button
                        onClick={() => setMode("manual")}
                        className={cn(
                            "flex-1 py-2.5 px-4 rounded-lg text-sm transition-all flex items-center justify-center gap-2",
                            mode === "manual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <PenTool className="w-4 h-4" />
                        Write Manually
                    </button>
                    <button disabled className="flex-1 py-2.5 px-4 rounded-lg text-sm text-muted-foreground/50 flex items-center justify-center gap-2 cursor-not-allowed">
                        Use Template
                    </button>
                </div>

                {/* Content Area */}
                <div className="space-y-6">
                    {mode === "ai" ? (
                        <AnimatedCard animation="fade-in-scale" className="space-y-6 bg-card border border-border rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-5 h-5 text-blue-500" />
                                <h3 className="font-semibold text-lg">AI Content Generator</h3>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-foreground">Topic</label>
                                <Input
                                    placeholder="e.g., Remote work productivity tips"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="bg-secondary/20"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-foreground">Tone</label>
                                <div className="flex flex-wrap gap-2">
                                    {styles.map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setStyle(s)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                                                style === s
                                                    ? "bg-blue-600 border-blue-600 text-white"
                                                    : "bg-transparent border-border text-muted-foreground hover:border-blue-500 hover:text-blue-500"
                                            )}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Button
                                className="w-full h-12 rounded-xl text-base gap-2 mt-4"
                                onClick={handleGenerate}
                                disabled={!topic || isGenerating}
                            >
                                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                Generate Content
                            </Button>
                        </AnimatedCard>
                    ) : (
                        <AnimatedCard animation="fade-in-scale" className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg">Post Content</h3>
                                <span className="text-xs text-muted-foreground font-mono">{content.length}/3000</span>
                            </div>
                            <div className="relative">
                                <TextareaAutosize
                                    minRows={12}
                                    placeholder="Start writing your post..."
                                    className="w-full resize-none p-4 rounded-2xl bg-card border border-border text-lg leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </AnimatedCard>
                    )}

                    {/* Scheduling Section */}
                    <div className="pt-4 border-t border-border/50">
                        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Clock className="w-5 h-5 text-muted-foreground" />
                                Schedule
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-muted-foreground">Post Time</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        value={scheduledFor}
                                        onChange={(e) => setScheduledFor(e.target.value)}
                                        min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                    />
                                </div>
                                <div className="bg-secondary/30 rounded-xl p-3 text-xs text-muted-foreground flex items-center">
                                    <p>
                                        <span className="font-semibold text-foreground">Best time to post:</span> Weekdays between 9-11 AM based on your audience.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-4 sticky bottom-4 md:static z-20">
                    <Button
                        variant="outline"
                        className="flex-1 h-12 rounded-xl border-border bg-background"
                        onClick={() => handleSavePost("DRAFT")}
                        disabled={!content || isSaving}
                    >
                        Save Draft
                    </Button>
                    {scheduledFor ? (
                        <Button
                            className="flex-[2] h-12 rounded-xl shadow-lg shadow-primary/20 text-base"
                            onClick={() => handleSavePost("SCHEDULED")}
                            disabled={!content || isSaving}
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5 mr-2" />}
                            Schedule Post
                        </Button>
                    ) : (
                        <Button
                            className="flex-[2] h-12 rounded-xl shadow-lg shadow-primary/20 text-base"
                            onClick={() => handleSavePost("PUBLISHED")}
                            disabled={!content || isSaving}
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
                            Publish Now
                        </Button>
                    )}
                </div>
            </div>

            {/* Right Column: Live Preview */}
            <div className="hidden lg:block space-y-6 sticky top-8 h-fit">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">Preview</h2>
                </div>

                <AnimatedCard animation="fade-in-up" className="bg-card border border-border rounded-[24px] shadow-sm overflow-hidden">
                    <div className="p-6 space-y-6">
                        {/* Fake Header */}
                        <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-bold text-muted-foreground">
                                {session?.user?.name?.[0] || "U"}
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-sm text-foreground">{session?.user?.name || "Your Name"}</p>
                                <p className="text-xs text-muted-foreground">Your Headline • Now • <span className="text-[10px]">🌐</span></p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="min-h-[160px] text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                            {content || <span className="text-muted-foreground italic">Your post content will appear here...</span>}
                        </div>

                        {/* Fake Actions */}
                        <div className="pt-4 border-t border-border flex items-center justify-between text-muted-foreground">
                            {['Like', 'Comment', 'Repost', 'Send'].map((action) => (
                                <div key={action} className="flex flex-col items-center gap-1 cursor-default hover:bg-secondary/50 p-2 rounded-lg transition-colors">
                                    <span className="text-xs font-medium">{action}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </AnimatedCard>

                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 text-sm text-blue-600 dark:text-blue-400">
                    <p className="flex gap-2">
                        <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        Preview shows how your post will look on LinkedIn Desktop.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function NewPostPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
            <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>}>
            <EditorContent />
        </Suspense>
    )
}

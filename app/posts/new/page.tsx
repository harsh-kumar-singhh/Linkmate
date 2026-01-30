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
    CheckCircle2,
    Globe
} from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { LinkedInPreview } from "@/components/posts/LinkedInPreview"
import { AICoach } from "@/components/ai/AICoach"

function EditorContent() {
    const { status, data: session } = useSession()
    const searchParams = useSearchParams()
    const router = useRouter()

    // State
    const [mode, setMode] = useState<"ai" | "manual">("ai")
    const [content, setContent] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [scheduledFor, setScheduledFor] = useState<string>("")
    const [isInitialLoading, setIsInitialLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // AI State
    const [topic, setTopic] = useState("")
    const [style, setStyle] = useState("Professional")
    const [targetLength, setTargetLength] = useState(700)
    const [context, setContext] = useState("")
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
                body: JSON.stringify({ topic, style, targetLength, context }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate post")
            }

            if (data.content) {
                setContent(data.content)
                setMode("manual")
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
        <div className="bg-background min-h-screen">
            {/* Scrollable Content Area */}
            <main className="max-w-6xl mx-auto px-4 md:px-8 pt-8 md:pt-12 pb-[160px]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                    {/* Left Column: Composition */}
                    <div className="space-y-8">

                        {/* Header */}
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-foreground">Create AI Post</h1>
                                <p className="text-muted-foreground mt-1">Smart LinkedIn content generation</p>
                            </div>
                            {postId && (
                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={handleDelete}>
                                    <Trash2 className="w-5 h-5" />
                                </Button>
                            )}
                        </div>

                        {/* Mode Switch (Subtle Segmented Control) */}
                        <div className="bg-secondary/40 p-1 rounded-xl flex items-center font-medium w-fit">
                            <button
                                onClick={() => setMode("ai")}
                                className={cn(
                                    "py-2 px-6 rounded-lg text-sm transition-all flex items-center justify-center gap-2",
                                    mode === "ai" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Sparkles className="w-4 h-4" />
                                AI Generate
                            </button>
                            <button
                                onClick={() => setMode("manual")}
                                className={cn(
                                    "py-2 px-6 rounded-lg text-sm transition-all flex items-center justify-center gap-2",
                                    mode === "manual" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <PenTool className="w-4 h-4" />
                                Manual Edit
                            </button>
                        </div>

                        {/* Content Section */}
                        <div className="space-y-6">
                            {mode === "ai" ? (
                                <AnimatedCard animation="fade-in-scale" className="space-y-6 bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="w-5 h-5 text-blue-500" />
                                        <h3 className="font-semibold text-lg">AI Content Generator</h3>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Topic</label>
                                        <Input
                                            placeholder="e.g., Remote work productivity tips"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            className="h-12 border-border/80 rounded-xl focus:ring-primary/10"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Context (Optional)</label>
                                        <TextareaAutosize
                                            minRows={3}
                                            placeholder="Any specific key points to include?"
                                            className="w-full resize-none p-4 rounded-xl bg-background border border-border/80 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-inter"
                                            value={context}
                                            onChange={(e) => setContext(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Tone</label>
                                            <select
                                                value={style}
                                                onChange={(e) => setStyle(e.target.value)}
                                                className="w-full h-12 px-3 rounded-xl border border-border/80 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all appearance-none cursor-pointer"
                                            >
                                                {styles.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex justify-between">
                                                <span>Target Length</span>
                                                <span className="text-primary font-bold">{targetLength}</span>
                                            </label>
                                            <div className="pt-4 px-2">
                                                <input
                                                    type="range"
                                                    min="300"
                                                    max="3000"
                                                    step="100"
                                                    value={targetLength}
                                                    onChange={(e) => setTargetLength(parseInt(e.target.value))}
                                                    className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full h-14 rounded-xl text-md font-bold gap-3 mt-4 shadow-lg shadow-primary/10 bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]"
                                        onClick={handleGenerate}
                                        disabled={!topic || isGenerating}
                                    >
                                        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                        Generate Post
                                    </Button>
                                </AnimatedCard>
                            ) : (
                                <AnimatedCard animation="fade-in-scale" className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-lg">Post Content</h3>
                                        <span className="text-[11px] bg-secondary/50 px-2 py-1 rounded-md text-muted-foreground font-mono">{content.length} characters</span>
                                    </div>
                                    <div className="relative group">
                                        <TextareaAutosize
                                            minRows={10}
                                            placeholder="Start writing or edit the generated content..."
                                            className="w-full resize-none p-5 rounded-2xl bg-card border border-border/80 text-lg leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all shadow-sm group-hover:border-primary/20"
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </AnimatedCard>
                            )}

                            {/* Scheduling Section */}
                            <div className="bg-card border border-border/60 rounded-[28px] p-8 space-y-8 shadow-sm">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-2xl tracking-tight text-foreground">Schedule</h3>
                                    <p className="text-muted-foreground text-sm font-medium">When should this post go live?</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Post Date</label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    placeholder="Select post date"
                                                    onFocus={(e) => (e.target.type = "date")}
                                                    onBlur={(e) => {
                                                        if (!e.target.value) e.target.type = "text";
                                                    }}
                                                    className="w-full h-14 pl-12 pr-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 shadow-sm"
                                                    value={scheduledFor ? (scheduledFor.split('T')[0] || "") : ""}
                                                    onChange={(e) => {
                                                        const timePart = scheduledFor ? (scheduledFor.split('T')[1] || "09:00") : "09:00";
                                                        setScheduledFor(`${e.target.value}T${timePart}`);
                                                    }}
                                                />
                                                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Post Time</label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    placeholder="Select post time"
                                                    onFocus={(e) => (e.target.type = "time")}
                                                    onBlur={(e) => {
                                                        if (!e.target.value) e.target.type = "text";
                                                    }}
                                                    className="w-full h-14 pl-12 pr-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 shadow-sm"
                                                    value={scheduledFor ? (scheduledFor.split('T')[1] || "") : ""}
                                                    onChange={(e) => {
                                                        const datePart = scheduledFor ? (scheduledFor.split('T')[0] || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0];
                                                        setScheduledFor(`${datePart}T${e.target.value}`);
                                                    }}
                                                />
                                                <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800/50 w-full">
                                        <p className="text-[13px] text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
                                            <span className="font-bold text-zinc-900 dark:text-zinc-200">Best time to post:</span> Weekdays between 9-11 AM based on your audience.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* LinkedIn Post Preview */}
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center gap-2">
                                <Globe className="w-5 h-5 text-primary" />
                                <h3 className="font-bold text-lg">Post Preview</h3>
                            </div>
                            <LinkedInPreview content={content} />
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-8 space-y-4">
                            <div className="flex flex-col md:flex-row gap-4">
                                <Button
                                    variant="outline"
                                    className="h-14 flex-1 border border-border/80 bg-background hover:bg-secondary/50 rounded-2xl px-6 text-[15px] font-bold transition-all active:scale-[0.98]"
                                    onClick={() => handleSavePost("DRAFT")}
                                    disabled={!content || isSaving}
                                >
                                    Save Draft
                                </Button>

                                {scheduledFor ? (
                                    <Button
                                        className="h-14 flex-[2] rounded-2xl shadow-lg shadow-primary/20 text-[15px] font-black gap-2 bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all"
                                        onClick={() => handleSavePost("SCHEDULED")}
                                        disabled={!content || isSaving}
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                                        Schedule Post
                                    </Button>
                                ) : (
                                    <Button
                                        className="h-14 flex-[2] rounded-2xl shadow-lg shadow-primary/20 text-[15px] font-black gap-2 bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all"
                                        onClick={() => handleSavePost("PUBLISHED")}
                                        disabled={!content || isSaving}
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        Publish Now
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Information/Tips */}
                    <div className="hidden lg:block space-y-6 sticky top-8 h-fit">
                        <div className="bg-background border border-border/80 rounded-[28px] p-8 space-y-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-primary" />
                                </div>
                                <h2 className="text-xl font-bold tracking-tight">Pro Tips</h2>
                            </div>
                            <div className="space-y-4">
                                {[
                                    { title: "Hashtags", desc: "Use 3-5 relevant hashtags for better reach." },
                                    { title: "Hook", desc: "The first 2 lines are critical; make them hooky." },
                                    { title: "Links", desc: "Avoid outbound links in the body; use 'link in comments'." },
                                    { title: "Tags", desc: "Only tag people if genuinely relevant." }
                                ].map((tip, i) => (
                                    <div key={i} className="space-y-1">
                                        <p className="text-sm font-bold text-foreground">{tip.title}</p>
                                        <p className="text-[13px] text-muted-foreground leading-relaxed">{tip.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <AICoach draftContent={content} />
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

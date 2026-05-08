"use client"

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef, Suspense } from "react"
import Image from "next/image"
import { AnimatedCard } from "@/components/animated/AnimatedCard"
import { IdeaVault } from "@/components/posts/IdeaVault"
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
    Globe,
    Check,
    Lightbulb
} from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { LinkedInPreview } from "@/components/posts/LinkedInPreview"
import { AICoach } from "@/components/ai/AICoach"
import { EmotiveTips } from "@/components/posts/EmotiveTips"
import { StyleSelector } from "@/components/posts/style-selector"
import { useUser } from "@/context/UserContext"
import { useTrialTrigger } from "@/context/TrialTriggerContext"
import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"

function EditorContent() {
    const { user, isPro, isLoading } = useUser()
    const { trackAction, triggerLockedModal } = useTrialTrigger()
    const searchParams = useSearchParams()
    const router = useRouter()
    const userPlan = (user?.plan || "FREE").toUpperCase()

    // State
    const [mode, setMode] = useState<"ai" | "manual">("ai")
    const [content, setContent] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [loadingPhase, setLoadingPhase] = useState("Generating...")
    const [scheduledFor, setScheduledFor] = useState<string>("")
    const [isInitialLoading, setIsInitialLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [imageData, setImageData] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isCopied, setIsCopied] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // AI State
    const [topic, setTopic] = useState("")
    const [style, setStyle] = useState("Professional")
    const [targetLength, setTargetLength] = useState(700)
    const [context, setContext] = useState("")

    // Idea Vault State
    const [isIdeaVaultOpen, setIsIdeaVaultOpen] = useState(false)
    const [quickIdea, setQuickIdea] = useState("")
    const [isSavingQuickIdea, setIsSavingQuickIdea] = useState(false)
    const [successFeedback, setSuccessFeedback] = useState(false)
    const [availableStyles, setAvailableStyles] = useState(["Professional", "Casual", "Enthusiastic", "Storytelling"]);

    const postId = searchParams.get("id")
    const dateParam = searchParams.get("date")

    // Auth redirection handled by middleware.ts

    // Load User Settings (Tone & Write Like Me Styles)
    useEffect(() => {
        if (user) {
            // 1. Set Default Tone
            if (user.defaultTone) {
                setStyle(user.defaultTone);
            }

            // 2. Populate Write Like Me Styles
            if (user.writingStyles && Array.isArray(user.writingStyles)) {
                const namedStyles = user.writingStyles
                    .filter((s: any) => s.name && s.name.trim() && s.sample && s.sample.trim())
                    .map((s: any) => `Write Like Me - ${s.name.trim()}`);

                setAvailableStyles(["Professional", "Casual", "Enthusiastic", "Storytelling", ...namedStyles]);
            }
        }
    }, [user]);

    // Fetch existing post
    useEffect(() => {
        const fetchExistingPost = async () => {
            if (!postId || !user) return
            setIsInitialLoading(true)
            try {
                const response = await fetch(`/api/posts/${postId}`)
                if (response.ok) {
                    const result = await response.json()
                    const data = result.data || result; // Handle both old and new formats for safety
                    
                    setContent(data.content)
                    setMode("manual")
                    setImageUrl(data.imageUrl || null)
                    setImageData(data.imageData || null)

                    if (data.scheduledFor) {
                        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                        const zonedDate = toZonedTime(data.scheduledFor, userTimezone);
                        
                        // Format specifically for datetime-local input (YYYY-MM-DDTHH:mm)
                        const formatted = format(zonedDate, "yyyy-MM-dd'T'HH:mm");
                        setScheduledFor(formatted);
                    }
                }
            } catch (error) {
                console.error("Error fetching post:", error)
            } finally {
                setIsInitialLoading(false)
            }
        }

        if (postId) {
            fetchExistingPost()
        }

        if (dateParam && !postId) {
            const date = new Date(dateParam)
            if (date < new Date()) {
                date.setDate(date.getDate() + 1)
            }
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const zonedDate = toZonedTime(date, userTimezone);
            
            const formatted = format(zonedDate, "yyyy-MM-dd'T'HH:mm");
            setScheduledFor(formatted);
        }
    }, [postId, dateParam, user])

    // Handlers
    const submitQuickIdea = async () => {
        if (!quickIdea.trim() || isSavingQuickIdea) return;
        setIsSavingQuickIdea(true);
        try {
            const res = await fetch("/api/ideas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: quickIdea.trim() })
            });
            if (res.ok) {
                setQuickIdea("");
                setSuccessFeedback(true);
                setTimeout(() => setSuccessFeedback(false), 2000);
            }
        } catch (error) {
            console.error("Failed to quick save idea", error);
        } finally {
            setIsSavingQuickIdea(false);
        }
    };

    const handleQuickSave = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitQuickIdea();
        }
    };

    const handleQuickSaveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitQuickIdea();
    };

    const handleGenerate = async () => {
        if (!user || !topic) return

        setIsGenerating(true)
        setLoadingPhase("Brainstorming ideas...")

        const phases = ["Brainstorming ideas...", "Drafting content...", "Polishing tone...", "Finalizing..."];
        let phaseIndex = 0;
        const phaseInterval = setInterval(() => {
            phaseIndex = (phaseIndex + 1) % phases.length;
            setLoadingPhase(phases[phaseIndex]);
        }, 1500);

        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify({ topic, style, targetLength, context }),
            })

            // Stability Fix: Validate response status and content type
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error("Non-JSON response received:", text);
                throw new Error("Server returned an invalid response format. Please try again.");
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.message || "Failed to generate post");
            }

            // Standardized format handling: result.data.content
            const contentData = result.data?.content || result.content;
            if (contentData) {
                setContent(contentData);
                setMode("manual");
                trackAction("generate_post");
            }
        } catch (error: any) {
            console.error("Generation failed", error)
            if (error.message.includes("limit") || error.message.includes("quota")) {
                triggerLockedModal("AI Daily Limit Reached")
            } else {
                alert(error instanceof Error ? error.message : "Failed to generate post.");
            }
        } finally {
            clearInterval(phaseInterval);
            setIsGenerating(false)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Image Compression Logic
        const compressImage = (file: File): Promise<File> => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = document.createElement('img');
                     // Set src AFTER onload
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 1200;
                        const MAX_HEIGHT = 1200;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0, width, height);
                        canvas.toBlob((blob) => {
                            if (blob) {
                                resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
                            } else {
                                resolve(file); // Fallback to original
                            }
                        }, 'image/jpeg', 0.7);
                    };
                    img.src = event.target?.result as string;
                };
                reader.onerror = () => resolve(file);
            });
        };

        setIsUploading(true);
        try {
            // Target < 1MB
            let processedFile = file;
            if (file.size > 1024 * 1024) {
                processedFile = await compressImage(file);
            }

            // Instant Local Preview
            const localPreviewUrl = URL.createObjectURL(processedFile);
            setImageUrl(localPreviewUrl);

            const formData = new FormData()
            formData.append("file", processedFile)

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Invalid server response");
            }

            const result = await response.json();

            if (response.ok && result.success) {
                const uploadData = result.data;
                const base64Url = `data:image/png;base64,${uploadData.imageData}`;
                setImageUrl(base64Url)
                setImageData(uploadData.imageData)
            } else {
                throw new Error(result.message || "Upload failed");
            }
        } catch (error) {
            console.error("Upload error:", error)
            alert("Upload failed. Please try a smaller image or check your connection.");
            setImageUrl(null)
            setImageData(null)
        } finally {
            setIsUploading(false)
        }
    }

    const handleRemoveImage = () => {
        setImageUrl(null)
        setImageData(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handleSavePost = async (statusArg: "DRAFT" | "SCHEDULED" | "PUBLISHED") => {
        if (!content.trim() || !user) return

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
                    postId: statusArg === "SCHEDULED" ? postId : undefined,
                    imageUrl: imageUrl || undefined,
                    imageData: imageData || undefined,
                    writingStyle: style,
                    source: mode === "ai" ? "AI" : "MANUAL"
                }),
            })

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Invalid response from server");
            }

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.message || "Failed to save post");
            }

            if (statusArg !== "DRAFT") {
                trackAction("schedule_post")
                router.push("/calendar")
            } else {
                router.push("/dashboard")
            }
        } catch (error: any) {
            console.error("Error saving post:", error);
            if (error.message.includes("limit") || error.message.includes("quota")) {
                triggerLockedModal(statusArg === "SCHEDULED" ? "Monthly Scheduling Limit Reached" : "AI Usage Limit Reached")
            } else {
                alert(error instanceof Error ? error.message : "Failed to save post");
            }
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!postId || !confirm("Are you sure you want to delete this post?")) return

        try {
            const response = await fetch(`/api/posts/${postId}`, { method: "DELETE" })
            if (response.ok) {
                const result = await response.json();
                if (result.success !== false) {
                    router.push("/dashboard")
                } else {
                    alert(result.message || "Failed to delete post")
                }
            }
        } catch (error) {
            console.error("Error deleting post:", error)
            alert("Failed to delete post")
        }
    }

    const handleCopy = async () => {
        if (!content) return
        try {
            await navigator.clipboard.writeText(content)
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
        } catch (err) {
            console.error("Failed to copy:", err)
        }
    }

    if (isLoading || isInitialLoading) {
        return (
            <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 md:pt-12 space-y-8 animate-pulse">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <div className="h-9 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                        <div className="h-4 w-64 bg-zinc-100 dark:bg-zinc-900 rounded" />
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-6">
                        <div className="h-12 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                        <div className="h-[400px] w-full bg-zinc-100 dark:bg-zinc-900 rounded-2xl" />
                    </div>
                    <div className="space-y-6">
                        <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                        <div className="h-[400px] w-full bg-zinc-100 dark:bg-zinc-900 rounded-2xl" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-transparent min-h-screen relative z-10">
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

                        <div className="flex flex-row flex-wrap items-center justify-between gap-3 sm:gap-4 overflow-hidden">
                            {/* Mode Switch (Subtle Segmented Control) */}
                            <div className="bg-secondary/40 p-1 rounded-xl flex items-center font-medium w-fit max-w-full overflow-x-auto no-scrollbar">
                                <button
                                    onClick={() => setMode("ai")}
                                    className={cn(
                                        "py-2 px-4 sm:px-6 rounded-lg text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                                        mode === "ai" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    AI Generate
                                </button>
                                <button
                                    onClick={() => setMode("manual")}
                                    className={cn(
                                        "py-2 px-4 sm:px-6 rounded-lg text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                                        mode === "manual" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <PenTool className="w-4 h-4" />
                                    Manual Edit
                                </button>
                            </div>

                            {/* Idea Vault Button - Fix Overflow */}
                            <Button 
                                variant="ghost" 
                                className="rounded-xl bg-secondary/30 hover:bg-primary/10 hover:text-primary transition-all font-medium gap-2 shrink-0 sm:shrink h-10 px-3 sm:h-11 sm:px-4"
                                onClick={() => setIsIdeaVaultOpen(true)}
                            >
                                <Lightbulb className="w-4 h-4 text-amber-500" />
                                <span>Idea Vault</span>
                            </Button>
                        </div>

                        {/* Content Section */}
                        <div className="space-y-6">
                            {mode === "ai" ? (
                                <AnimatedCard animation="fade-in-scale" className="space-y-6 bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-sm interaction-smooth">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="w-5 h-5 text-primary" />
                                        <h3 className="font-semibold text-lg">AI Content Generator</h3>
                                    </div>

                                    {/* Quick Idea Capture Inline */}
                                    <div className="space-y-2">
                                        <form onSubmit={handleQuickSaveSubmit} className="relative">
                                            <Input
                                                placeholder="Drop a raw thought... we'll shape it ✨"
                                                value={quickIdea}
                                                onChange={(e) => setQuickIdea(e.target.value)}
                                                onKeyDown={handleQuickSave}
                                                className={cn(
                                                    "h-11 pr-12 bg-secondary/20 border-border/60 rounded-xl transition-all shadow-inner focus:border-primary/50 text-sm placeholder:text-muted-foreground",
                                                    successFeedback && "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)] text-emerald-600"
                                                )}
                                                disabled={isSavingQuickIdea}
                                            />
                                            <Button 
                                                type="submit" 
                                                size="icon" 
                                                disabled={!quickIdea.trim() || isSavingQuickIdea}
                                                className={cn(
                                                    "absolute right-1 top-1 bottom-1 h-9 w-9 rounded-lg transition-all disabled:opacity-50",
                                                    successFeedback 
                                                        ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" 
                                                        : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                                                )}
                                            >
                                                {isSavingQuickIdea ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : successFeedback ? (
                                                    <Check className="w-4 h-4" />
                                                ) : (
                                                    <Send className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </form>
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

                                    <div className="flex flex-col gap-8 pt-4">
                                        <StyleSelector
                                            value={style}
                                            onChange={setStyle}
                                            styles={availableStyles}
                                        />

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
                                        {isGenerating ? loadingPhase : "Generate Post"}
                                    </Button>
                                </AnimatedCard>
                            ) : (
                                <AnimatedCard animation="fade-in-scale" className="space-y-4">




                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-lg">Post Content</h3>
                                            {content && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleCopy}
                                                    className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                                                >
                                                    {isCopied ? (
                                                        <>
                                                            <Check className="w-3.5 h-3.5" />
                                                            Copied!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                                            Copy
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                        <span className="text-[11px] bg-secondary/50 px-2 py-1 rounded-md text-muted-foreground font-mono">{content.length} characters</span>
                                    </div>
                                    <div className="relative group">
                                        <TextareaAutosize
                                            minRows={12}
                                            placeholder="Start writing or edit the generated content..."
                                            className="w-full resize-none p-5 rounded-2xl bg-card border border-border/80 text-lg leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all shadow-sm group-hover:border-primary/20 text-foreground dark:text-zinc-100"
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            autoFocus
                                        />
                                    </div>

                                    {/* Image Attachment Section */}
                                    <div className="pt-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            ref={fileInputRef}
                                            onChange={handleImageUpload}
                                        />

                                        {!imageUrl ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-xl gap-2 border-dashed border-2 bg-background hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                            >
                                                {isUploading ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <ImageIcon className="w-4 h-4" />
                                                )}
                                                Add Image (Optional)
                                            </Button>
                                        ) : (
                                            <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border border-border shadow-sm group">
                                                <Image 
                                                    src={imageUrl} 
                                                    alt="Attachment" 
                                                    width={400} 
                                                    height={256} 
                                                    className="w-full h-auto object-cover max-h-64" 
                                                    unoptimized
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="rounded-lg gap-2"
                                                        onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        <ImageIcon className="w-4 h-4" />
                                                        Replace
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        className="rounded-lg gap-2"
                                                        onClick={handleRemoveImage}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
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
                            <LinkedInPreview
                                content={content}
                                imageUrl={imageUrl}
                                onAddImage={() => {
                                    setMode("manual")
                                    // Small delay to let the file input render if switching from AI mode
                                    setTimeout(() => fileInputRef.current?.click(), 50)
                                }}
                            />
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
                        <EmotiveTips />
                    </div>
                </div>
            </main>
            <AICoach draftContent={content} />
            <IdeaVault 
                isOpen={isIdeaVaultOpen} 
                onClose={() => setIsIdeaVaultOpen(false)} 
                onSelectIdea={(ideaContent) => {
                    setTopic(ideaContent);
                    setIsIdeaVaultOpen(false);
                    // Optional toast could be added here
                }} 
            />
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

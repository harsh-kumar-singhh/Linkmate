"use client"

export const dynamic = "force-dynamic";

import React from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/context/UserContext"
import { useTrialTrigger } from "@/context/TrialTriggerContext"
import Link from "next/link"
import { useEffect, useState, useCallback } from "react"
import { AnimatedCard } from "@/components/animated/AnimatedCard"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Plus,
  Calendar,
  Eye,
  TrendingUp,
  X,
  Clock,
  CheckCircle2,
  FileEdit,
  ArrowUpRight,
  MoreVertical,
  AlertCircle,
  Zap,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { AICoach } from "@/components/ai/AICoach"
import { StatSkeleton, PostSkeleton, WelcomeSkeleton } from "@/components/dashboard/DashboardSkeletons"

interface Post {
  id: string
  content: string
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED"
  scheduledFor: string | null
  publishedAt: string | null
  notified: boolean
  failureReason: string | null
}

export default function DashboardPage() {
  const { user, isLoading: isUserLoading } = useUser()
  const { trackAction } = useTrialTrigger()
  const router = useRouter()

  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(true)
  const [notifications, setNotifications] = useState<Post[]>([])
  const [stats, setStats] = useState<any>(null)

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [isUserLoading, user, router])

  const fetchData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setIsLoading(true)

      const response = await fetch("/api/dashboard")
      if (response.ok) {
        const result = await response.json()
        const data = result.data
        
        // Update posts and stats simultaneously
        setPosts(data.posts || [])
        setStats({ stats: data.stats })

        // Cache for next time
        localStorage.setItem(`dashboard_cache_${user?.id}`, JSON.stringify({
           data,
           timestamp: Date.now()
        }));

        // Handle notifications for newly published posts
        const unnotified = (data.posts || []).filter(
          (p: Post) => p.status === "PUBLISHED" && p.notified === false
        )

        if (unnotified.length > 0) {
          setNotifications(prev => {
            const existingIds = prev.map(n => n.id);
            const newNotifications = unnotified.filter((n: Post) => !existingIds.includes(n.id));
            return [...prev, ...newNotifications];
          })
        }
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err)
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Update isConnected from user object
  useEffect(() => {
    if (user) {
      setIsConnected(user.isConnected);
    }
  }, [user]);

  // Initialize from cache if available for instant render
  useEffect(() => {
    if (!user?.id) return;
    const cachedData = localStorage.getItem(`dashboard_cache_${user.id}`);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed && Date.now() - parsed.timestamp < 3600000) { // 1 hour client cache
          setPosts(parsed.data.posts || []);
          setStats({ stats: parsed.data.stats });
          setIsLoading(false);
          // Trigger background fetch without showing skeletons
          fetchData(true);
        }
      } catch (e) {
        console.error("Cache parsing error", e);
      }
    } else {
      fetchData();
    }
  }, [user?.id, fetchData]);

  // Removed manual fetchData call here as it's now handled by the cache logic to avoid double-fetching

  // Track dashboard view only once
  useEffect(() => {
    if (user) {
      trackAction("view_dashboard")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const dismissNotification = async (postId: string) => {
    try {
      await fetch(`/api/posts/${postId}/notified`, { method: "PATCH" })
      setNotifications(prev => prev.filter(n => n.id !== postId))
    } catch (err) {
      console.error("Dismiss notification error:", err)
    }
  }

  // Only block if we are sure there is no user and we're not loading anymore
  if (!isUserLoading && !user) return null

  const scheduledPosts = posts.filter(p => p.status === "SCHEDULED")
  const publishedPosts = posts.filter(p => p.status === "PUBLISHED").slice(0, 5) // Recent 5
  const drafts = posts.filter(p => p.status === "DRAFT")

  return (
    <div className="relative min-h-screen bg-transparent">
      {/* Background Depth Layers */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] dark:bg-primary/5" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] dark:bg-blue-600/5" />
        <div className="absolute inset-0 noise-bg opacity-[0.03] dark:opacity-[0.05]" />
        <div className="absolute inset-0 vignette opacity-20 dark:opacity-40" />
      </div>

      <div className="relative z-10 space-y-6 md:space-y-12 max-w-2xl mx-auto pt-2 pb-12 px-4 md:px-0 md:pt-12">
        {/* Notifications */}
        {notifications.length > 0 && (
        <div className="fixed top-24 right-4 md:right-8 z-50 w-[calc(100%-2rem)] md:w-80 space-y-4 pointer-events-none">
          {notifications.map(n => (
            <AnimatedCard key={n.id} animation="slide-up">
              <div className="bg-white dark:bg-zinc-900 border border-emerald-500/20 shadow-2xl p-5 rounded-2xl relative pointer-events-auto overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                <button
                  onClick={() => dismissNotification(n.id)}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold">Successfully Published!</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 pr-4">{n.content}</p>
                    <p className="text-[10px] text-emerald-600 font-medium">Your scheduled post is now live on LinkedIn</p>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          ))}
        </div>
      )}

      {/* Header */}
      <AnimatedCard animation="fade-in-up" className="relative">
        {isUserLoading ? (
          <WelcomeSkeleton />
        ) : (
          <div className="space-y-3 relative">
            <div className="absolute -top-12 -left-12 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 animate-pulse" />
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground/90 to-primary/50">
              Welcome back, {user?.name?.split(' ')[0] || "there"}!
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-muted-foreground text-base font-medium">
                Your LinkedIn growth is on track. Keep the momentum!
              </p>
              {stats?.stats?.postingStreak > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-bold animate-bounce-subtle">
                  <Zap className="w-3.5 h-3.5 fill-amber-500" />
                  {stats.stats.postingStreak} Day Streak!
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatedCard>

      {/* Stats */}
      {isLoading ? (
        <StatSkeleton />
      ) : (
        <AnimatedCard animation="stagger-container" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Posting Streak"
            value={stats?.stats?.postingStreak ? `${stats.stats.postingStreak} ${stats.stats.postingStreak === 1 ? 'day' : 'days'}` : "0 days"}
            icon={<Zap className="w-5 h-5" />}
            color="text-amber-500 bg-amber-500/10"
          />
          <StatCard
            label="Posts Published"
            value={stats?.stats?.totalPostsPublished || 0}
            icon={<CheckCircle2 className="w-5 h-5" />}
            color="text-emerald-500 bg-emerald-500/10"
          />
          <StatCard
            label="Posts Queued"
            value={stats?.stats?.postsQueued || 0}
            icon={<Calendar className="w-5 h-5" />}
            color="text-primary bg-primary/10"
          />
        </AnimatedCard>
      )}

      {/* Your Posts Section */}
      <div className="space-y-8 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
            Post Manager
            <div className="h-1 w-1 rounded-full bg-primary" />
          </h2>
          <Link href="/posts/new" prefetch={false}>
            <Button className="rounded-2xl h-11 px-6 gap-2 font-black shadow-xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-primary to-blue-600 border-none group">
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
              Create Post
              <Sparkles className="w-4 h-4 text-white/50" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <PostSkeleton />
        ) : posts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-10">
            {/* AI Suggestion Card - Proactive Coach */}
            {scheduledPosts.length === 0 && (
              <CoachSuggestionCard postCount={stats?.stats?.postCount || 0} />
            )}

            {/* Scheduled Section */}
            {scheduledPosts.length > 0 && (
              <PostSection title="Scheduled Posts" icon={<Clock className="w-4 h-4 text-primary" />}>
                {scheduledPosts.map((p, i) => (
                  <PostCard key={p.id} post={p} index={i} />
                ))}
              </PostSection>
            )}

            {/* Recently Published Section */}
            {publishedPosts.length > 0 && (
              <PostSection title="Recently Published" icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}>
                {publishedPosts.map((p, i) => (
                  <PostCard key={p.id} post={p} index={i} />
                ))}
              </PostSection>
            )}

            {/* Drafts Section */}
            {drafts.length > 0 && (
              <PostSection title="Drafts" icon={<FileEdit className="w-4 h-4 text-zinc-500" />}>
                {drafts.map((p, i) => (
                  <PostCard key={p.id} post={p} index={i} />
                ))}
              </PostSection>
            )}
          </div>
        )}
      </div>

      <AICoach />
      </div>
    </div>
  )
}

function CoachSuggestionCard({ postCount }: { postCount: number }) {
  const hasHistory = postCount > 0;

  return (
    <AnimatedCard animation="fade-in-up" className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-primary rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />
      <Card className="relative rounded-2xl border-primary/20 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shrink-0 shadow-lg">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <div className="space-y-4 flex-1 w-full">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-normal">AI Strategist Recommendation</span>
                </div>
                <h3 className="text-lg md:text-xl font-bold tracking-tight leading-tight mb-2">
                  {hasHistory
                    ? "Consistent Posting is Key"
                    : "Ready to launch your LinkedIn presence?"}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {hasHistory
                    ? `You've published ${postCount} posts recently. Based on your activity, posting tomorrow morning could see a significant engagement boost.`
                    : "You haven't scheduled any posts yet. Let's create your first one using data-driven insights to maximize your reach."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  size="sm"
                  className="rounded-xl h-10 px-6 font-bold bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 shadow-md"
                  onClick={() => {
                    const event = new CustomEvent('open-ai-coach');
                    window.dispatchEvent(event);
                  }}
                >
                  Get Post Idea
                </Button>
                <Button variant="ghost" size="sm" className="rounded-xl h-10 px-4 font-bold text-muted-foreground hover:text-foreground">
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </AnimatedCard>
  )
}

const StatCard = React.memo(function StatCard({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) {
  const isStreak = label === "Posting Streak";
  const isPublished = label === "Posts Published";
  const isQueued = label === "Posts Queued";
  
  // Extract base color classes for the glow
  const glowClass = isStreak ? "from-amber-500/10 border-amber-500/20" : 
                    isPublished ? "from-emerald-500/10 border-emerald-500/20" : 
                    "from-primary/10 border-primary/20";

  return (
    <Card className={cn(
      "rounded-3xl border-border/40 bg-card/50 backdrop-blur-md shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group overflow-hidden relative",
      glowClass
    )}>
      <div className={cn("absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none opacity-50", isStreak ? "from-amber-500/5" : isPublished ? "from-emerald-500/5" : "from-primary/5")} />
      
      <CardContent className="p-6 flex items-center justify-between relative z-10">
        <div className="space-y-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
          <p className={cn(
            "text-4xl font-black tracking-tighter text-foreground drop-shadow-sm transition-transform duration-300 group-hover:scale-105 origin-left",
            isStreak && "text-amber-500",
            isPublished && "text-emerald-500",
            isQueued && "text-primary"
          )}>{value}</p>
        </div>
        <div className={cn(
          "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 shadow-lg", 
          color,
          isStreak && "shadow-amber-500/20",
          isPublished && "shadow-emerald-500/20",
          isQueued && "shadow-primary/20"
        )}>
          {React.cloneElement(icon as React.ReactElement, { 
            className: cn((icon as React.ReactElement).props.className, "w-6 h-6 animate-pulse-subtle") 
          })}
        </div>
      </CardContent>
    </Card>
  )
});

const PostSection = React.memo(function PostSection({ title, children, icon }: { title: string, children: React.ReactNode, icon: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pl-1">
        <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-border/50 shadow-sm">
          {React.cloneElement(icon as React.ReactElement, { className: cn((icon as React.ReactElement).props.className, "w-4 h-4") })}
        </div>
        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">{title}</h3>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
});

const PostCard = React.memo(function PostCard({ post, index }: { post: Post, index: number }) {
  const isScheduled = post.status === "SCHEDULED"
  const isPublished = post.status === "PUBLISHED"
  const isDraft = post.status === "DRAFT"

  return (
    <AnimatedCard animation="slide-up" index={index}>
      <Card className={cn(
        "rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-sm hover:bg-card/60 hover:border-primary/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 group relative overflow-hidden",
        isScheduled && "hover:shadow-primary/5"
      )}>
        {/* Left Accent Line */}
        <div className={cn(
          "absolute left-0 top-6 bottom-6 w-1 rounded-r-full transition-all duration-300 opacity-20 group-hover:opacity-100 group-hover:h-12 group-hover:top-1/2 group-hover:-translate-y-1/2",
          isScheduled && "bg-primary shadow-[0_0_10px_hsla(var(--primary),0.5)]",
          isPublished && "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
          isDraft && "bg-zinc-400"
        )} />

        <CardContent className="p-6 pl-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-4 flex-1">
              <p className="text-[17px] text-foreground/90 line-clamp-2 leading-relaxed font-bold tracking-tight">
                {post.content}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {isScheduled && post.scheduledFor && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 text-primary text-xs font-black border border-primary/10 shadow-sm">
                    <Clock className="w-3.5 h-3.5" />
                    {(() => {
                      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                      const zonedDate = toZonedTime(post.scheduledFor, userTimezone);
                      return `${format(zonedDate, "MMM d")} • ${format(zonedDate, "hh:mm a")}`;
                    })()}
                  </div>
                )}

                {isPublished && post.publishedAt && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/5 text-emerald-600 text-xs font-black border border-emerald-500/10 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Published {(() => {
                      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                      const zonedDate = toZonedTime(post.publishedAt!, userTimezone);
                      return format(zonedDate, "MMM d");
                    })()}
                  </div>
                )}

                {isDraft && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 text-xs font-black border border-border/50 shadow-sm">
                    <FileEdit className="w-3.5 h-3.5" />
                    Draft
                  </div>
                )}

                {post.status === "FAILED" && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/5 text-red-600 text-xs font-black border border-red-500/10 shadow-sm">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Failed
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Link href={`/posts/new?id=${post.id}`} prefetch={false}>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary hover:text-white transition-all duration-300 group/btn shadow-none hover:shadow-lg hover:shadow-primary/20">
                  {isPublished ? <ArrowUpRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" /> : <Plus className="w-5 h-5 transition-transform group-hover/btn:scale-110" />}
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </AnimatedCard>
  )
});

function EmptyState() {
  return (
    <AnimatedCard animation="fade-in-scale" className="border-2 border-dashed border-border/60 rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-4">
      <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-muted-foreground">
        <Plus className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">No posts yet</h3>
        <p className="text-muted-foreground max-w-xs mx-auto">Create your first post to get started with your consistent journey.</p>
      </div>
      <Link href="/posts/new" prefetch={false}>
        <Button variant="outline" className="rounded-full mt-2">
          Create Post
        </Button>
      </Link>
    </AnimatedCard>
  )
}

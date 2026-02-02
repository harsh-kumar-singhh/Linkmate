"use client"

export const dynamic = "force-dynamic";

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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
import { AICoach } from "@/components/ai/AICoach"

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
  const { data: session, status } = useSession()
  const router = useRouter()

  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(true)
  const [notifications, setNotifications] = useState<Post[]>([])

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // fetchData wrapped in useCallback
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)

      const [postsRes, userRes] = await Promise.all([
        fetch("/api/posts"),
        fetch("/api/user/me")
      ])

      if (postsRes.ok) {
        const data = await postsRes.json()
        const fetchedPosts: Post[] = data.posts || []
        setPosts(fetchedPosts)

        // Only show notifications for specifically scheduled posts that just went live
        // or any newly published post that hasn't been notified yet
        const unnotified = fetchedPosts.filter(
          (p) => p.status === "PUBLISHED" && p.notified === false
        )

        if (unnotified.length > 0) {
          setNotifications(prev => {
            const existingIds = prev.map(n => n.id);
            const newNotifications = unnotified.filter(n => !existingIds.includes(n.id));
            return [...prev, ...newNotifications];
          })
        }
      }

      if (userRes.ok) {
        const data = await userRes.json()
        setIsConnected(data.user.isConnected)
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch data + heartbeat
  useEffect(() => {
    if (status !== "authenticated") return

    fetchData()

    const heartbeat = setInterval(async () => {
      try {
        const res = await fetch("/api/scheduler/run", { method: "POST" })
        const data = await res.json()

        if (data.processed > 0) {
          await fetchData()
        }
      } catch (err) {
        console.error("Heartbeat error:", err)
      }
    }, 60000)

    return () => clearInterval(heartbeat)
  }, [status, fetchData])

  const dismissNotification = async (postId: string) => {
    try {
      await fetch(`/api/posts/${postId}/notified`, { method: "PATCH" })
      setNotifications(prev => prev.filter(n => n.id !== postId))
    } catch (err) {
      console.error("Dismiss notification error:", err)
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return null

  // Get first name for greeting
  const firstName = session.user?.name?.split(' ')[0] || "there"

  const scheduledPosts = posts.filter(p => p.status === "SCHEDULED")
  const publishedPosts = posts.filter(p => p.status === "PUBLISHED").slice(0, 5) // Recent 5
  const drafts = posts.filter(p => p.status === "DRAFT")

  return (
    <div className="space-y-10 max-w-2xl mx-auto py-8 px-4 md:px-0">
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
      <AnimatedCard animation="fade-in-up" className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, {firstName}!</h1>
        <p className="text-muted-foreground text-sm font-medium">
          Here&apos;s what&apos;s happening with your LinkedIn presence
        </p>
      </AnimatedCard>

      {/* Stats */}
      <AnimatedCard animation="stagger-container" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Posts Queued"
          value={scheduledPosts.length}
          icon={<Calendar className="w-5 h-5" />}
          color="text-primary bg-primary/10"
        />
        <StatCard
          label="Total Views"
          value="0"
          icon={<Eye className="w-5 h-5" />}
          color="text-blue-500 bg-blue-500/10"
        />
        <StatCard
          label="Engagement"
          value="0%"
          icon={<TrendingUp className="w-5 h-5" />}
          color="text-emerald-500 bg-emerald-500/10"
        />
      </AnimatedCard>

      {/* Your Posts Section */}
      <div className="space-y-8 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Post Manager</h2>
          <Link href="/posts/new">
            <Button className="rounded-xl h-10 px-4 gap-2 font-bold shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              Create Post
            </Button>
          </Link>
        </div>

        {posts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-10">
            {/* AI Suggestion Card - Proactive Coach */}
            {scheduledPosts.length === 0 && (
              <CoachSuggestionCard />
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

      <div className="h-24"></div>

      {/* AI Content Coach */}
      <AICoach />
    </div>
  )
}

function CoachSuggestionCard() {
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
                <h3 className="text-lg md:text-xl font-bold tracking-tight leading-tight mb-2">You haven&apos;t scheduled anything for tomorrow</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Based on your audience&apos;s active times, a post at <span className="text-foreground font-bold italic underline decoration-amber-500/30">9:30 AM tomorrow</span> could see 25% more engagement.
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

function StatCard({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) {
  return (
    <Card className="rounded-2xl border-border/50 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", color)}>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}

function PostSection({ title, children, icon }: { title: string, children: React.ReactNode, icon: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pl-1">
        {icon}
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}

function PostCard({ post, index }: { post: Post, index: number }) {
  const isScheduled = post.status === "SCHEDULED"
  const isPublished = post.status === "PUBLISHED"
  const isDraft = post.status === "DRAFT"

  return (
    <AnimatedCard animation="slide-up" index={index}>
      <Card className="rounded-2xl border-border/50 hover:border-primary/20 hover:shadow-md transition-all group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              <p className="text-[15px] text-foreground/90 line-clamp-2 leading-relaxed font-medium">
                {post.content}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {isScheduled && post.scheduledFor && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/5 text-primary text-[11px] font-bold border border-primary/10">
                    <Clock className="w-3 h-3" />
                    {format(new Date(post.scheduledFor), "MMM d, h:mm a")}
                  </div>
                )}

                {isPublished && post.publishedAt && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/5 text-emerald-600 text-[11px] font-bold border border-emerald-500/10">
                    <CheckCircle2 className="w-3 h-3" />
                    Published {format(new Date(post.publishedAt), "MMM d")}
                  </div>
                )}

                {isDraft && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[11px] font-bold">
                    <FileEdit className="w-3 h-3" />
                    Draft
                  </div>
                )}

                {post.status === "FAILED" && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/5 text-red-600 text-[11px] font-bold border border-red-500/10">
                    <AlertCircle className="w-3 h-3" />
                    Failed
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Link href={isPublished ? `/stats` : `/posts/new?id=${post.id}`}>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors">
                  {isPublished ? <ArrowUpRight className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </AnimatedCard>
  )
}

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
      <Link href="/posts/new">
        <Button variant="outline" className="rounded-full mt-2">
          Create Post
        </Button>
      </Link>
    </AnimatedCard>
  )
}

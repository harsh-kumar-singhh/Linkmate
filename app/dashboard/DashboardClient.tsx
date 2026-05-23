"use client"

// app/dashboard/DashboardClient.tsx
// ─── CLIENT SHELL ─────────────────────────────────────────────────────────────
// Receives real initialData from the Server Component — no loading skeleton
// on first render. React Query uses it as initialData (not placeholderData)
// and background-refetches after staleTime.
//
// FIXES:
// 1. queryKey includes user.id — prevents cross-account data bleed.
// 2. placeholderData → initialData + initialDataUpdatedAt for correct
//    stale/fresh semantics.
// 3. staleTime raised to 2min — prevents unnecessary refetches on PWA.
// 4. Notification effect uses a useRef to track shown IDs across refetches —
//    prevents toasts re-appearing on background data updates.
// 5. handleDeletePost no longer calls invalidateQueries on success —
//    optimistic update is sufficient, the extra refetch was wasted work.
// 6. USER_TIMEZONE moved to module scope — not re-allocated on every render.
// 7. All queryClient calls updated to use ["dashboard", user.id] key.

import React, { useEffect, useState, useRef } from "react"
import { useTrialTrigger } from "@/context/TrialTriggerContext"
import { PushPermissionPrompt } from "@/components/layout/push-permission-prompt"
import Link from "next/link"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AnimatedCard } from "@/components/animated/AnimatedCard"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  FileEdit,
  ArrowUpRight,
  Zap,
  Sparkles,
  X,
  Trash2,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { AICoach } from "@/components/ai/AICoach"
import { StatSkeleton, PostSkeleton, WelcomeSkeleton } from "@/components/dashboard/DashboardSkeletons"
import type { DashboardData } from "@/lib/data/dashboard"

// ─── Module-scope constant ────────────────────────────────────────────────────
// FIX: Moved out of PostCard render — was being re-allocated per card per
// render cycle. Intl.DateTimeFormat() is not free.
const USER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

// ─── Types ────────────────────────────────────────────────────────────────────

interface Post {
  id: string
  content: string
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED"
  scheduledFor: string | null
  publishedAt: string | null
  notified: boolean
}

interface DashboardStats {
  postingStreak: number
  totalPostsPublished: number
  postsQueued: number
  aiUsageThisWeek: number
  consistencyScore: number
  totalCount: number
}

interface SessionUser {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

interface DashboardClientProps {
  user: SessionUser
  initialData: DashboardData | null
}

// ─── Main client component ────────────────────────────────────────────────────

export default function DashboardClient({ user, initialData }: DashboardClientProps) {
  const { trackAction } = useTrialTrigger()
  const queryClient = useQueryClient()
  const [notifications, setNotifications] = useState<Post[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // FIX: Track notification IDs that have been shown in this session.
  // A plain useRef survives React Query background refetches — unlike state,
  // mutating it does not trigger a re-render, and it is not reset when
  // `data` changes. This prevents toasts re-appearing when the background
  // refetch returns posts that are still notified: false in the DB
  // (because the PATCH hasn't landed yet).
  const shownNotificationIds = useRef<Set<string>>(new Set())

  // ─── Data Fetching ─────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<DashboardData>({
    // FIX: userId in key prevents cross-account data bleed when a user
    // logs out and a different account logs in the same browser session.
    queryKey: ["dashboard", user.id],
    queryFn: async () => {
      const res = await fetch("/api/dashboard")
      if (!res.ok) throw new Error("Failed to fetch dashboard")
      const result = await res.json()
      return result.data
    },
    // FIX: initialData (not placeholderData) — React Query treats this as
    // real cached data, not a temporary stand-in. The dashboard renders
    // immediately with no skeleton.
    //
    // initialDataUpdatedAt tells React Query how old the SSR data is.
    // We treat it as 1 minute old so it background-refetches after
    // staleTime (2min) - 1min = 1 minute of idle time.
    // If initialData is null (should not happen after page.tsx fix, but
    // kept as a safety fallback), initialDataUpdatedAt is undefined and
    // React Query fetches immediately.
    initialData: initialData ?? undefined,
    initialDataUpdatedAt: initialData ? Date.now() - 60_000 : undefined,
    staleTime: 2 * 60_000,   // 2 minutes — generous for a PWA
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  // Track page view
  useEffect(() => {
    trackAction("view_dashboard")
  }, [trackAction])

  // ── Notification effect ────────────────────────────────────────────────────
  // FIX: Uses shownNotificationIds ref to deduplicate across refetches.
  // Previous implementation only checked localStorage dismissed IDs, which
  // meant a toast could re-appear between the PATCH firing and the DB
  // confirming notified: true on the next background refetch.
  useEffect(() => {
    if (!data?.posts) return

    const dismissedIds: string[] = JSON.parse(
      localStorage.getItem("dismissed_notifications") || "[]"
    )

    const unnotified = data.posts.filter(
      p =>
        p.status === "PUBLISHED" &&
        !p.notified &&
        !dismissedIds.includes(p.id) &&
        !shownNotificationIds.current.has(p.id)
    )

    if (unnotified.length === 0) return

    // Mark as shown before setting state to prevent a second render
    // from adding duplicates if the effect fires twice (React strict mode)
    unnotified.forEach(n => shownNotificationIds.current.add(n.id))
    setNotifications(prev => [...prev, ...unnotified])
  }, [data])

  const dismissNotification = async (postId: string) => {
    // Optimistic: update localStorage + UI before API call
    const dismissedIds: string[] = JSON.parse(
      localStorage.getItem("dismissed_notifications") || "[]"
    )
    if (!dismissedIds.includes(postId)) {
      localStorage.setItem(
        "dismissed_notifications",
        JSON.stringify([...dismissedIds, postId])
      )
    }
    setNotifications(prev => prev.filter(n => n.id !== postId))

    try {
      await fetch(`/api/posts/${postId}/notified`, { method: "PATCH" })
    } catch (err) {
      console.error("Dismiss notification error:", err)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (deletingId) return

    setDeletingId(postId)

    // Optimistic update — remove post from cache immediately
    // FIX: key is now ["dashboard", user.id]
    const previousData = queryClient.getQueryData<DashboardData>(["dashboard", user.id])
    if (previousData) {
      queryClient.setQueryData(["dashboard", user.id], {
        ...previousData,
        posts: previousData.posts.filter(p => p.id !== postId),
      })
    }

    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")

      // FIX: No invalidateQueries on success. The optimistic update is
      // already correct — the post is gone. Calling invalidateQueries here
      // triggered a background refetch that caused a redundant re-render.
      // Only invalidate on error (rollback path below).
    } catch (err) {
      console.error("Delete post error:", err)
      // Rollback: restore previous data on failure
      if (previousData) {
        queryClient.setQueryData(["dashboard", user.id], previousData)
      }
      alert("Failed to delete post")
    } finally {
      setDeletingId(null)
    }
  }

  const posts = data?.posts ?? []
  const stats = data?.stats
  const scheduledPosts = posts
    .filter(p => p.status === "SCHEDULED")
    .sort((a, b) => new Date(a.scheduledFor || 0).getTime() - new Date(b.scheduledFor || 0).getTime())
  const publishedPosts = posts
    .filter(p => p.status === "PUBLISHED")
    .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
    .slice(0, 7)
  const drafts = posts.filter(p => p.status === "DRAFT")

  // ── Loading State (Skeletons) ──────────────────────────────────────────────
  // After page.tsx fix this branch should never be hit on normal navigation —
  // initialData is always provided. Kept as a fallback for direct deep-links
  // or if SSR data fetch fails.
  if (isLoading && !data) {
    return (
      <div className="relative min-h-screen bg-transparent">
        <div className="relative z-10 space-y-6 md:space-y-12 max-w-2xl mx-auto pt-2 pb-12 px-4 md:px-0 md:pt-12">
          <WelcomeSkeleton />
          <StatSkeleton />
          <div className="space-y-8 pt-2">
            <div className="flex items-center justify-between">
              <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-lg" />
              <div className="h-11 w-32 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-2xl" />
            </div>
            <PostSkeleton />
          </div>
        </div>
      </div>
    )
  }

  // ── Main Render ────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-transparent">
      <div className="relative z-10 space-y-6 md:space-y-12 max-w-2xl mx-auto pt-2 pb-12 px-4 md:px-0 md:pt-12">

        {/* ── Toast notifications ──────────────────────────────────────────── */}
        {notifications.length > 0 && (
          <div className="fixed top-24 right-4 md:right-8 z-50 w-[calc(100%-2rem)] md:w-80 space-y-4 pointer-events-none">
            {notifications.map(n => (
              <AnimatedCard key={n.id} animation="slide-up">
                <div className="bg-site-bg border border-emerald-500/20 shadow-2xl p-5 rounded-2xl relative pointer-events-auto overflow-hidden">
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
                      <p className="text-xs text-muted-foreground line-clamp-2 pr-4">
                        {n.content}
                      </p>
                    </div>
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>
        )}

        {/* ── Welcome header ────────────────────────────────────────────────── */}
        <AnimatedCard animation="fade-in-up" className="relative">
          <div className="space-y-3 relative">
            <div className="absolute -top-12 -left-12 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 animate-pulse" />
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground/90 to-primary/50">
              Welcome back, {user.name?.split(" ")[0] || "there"}!
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-muted-foreground text-base font-medium">
                Your LinkedIn growth is on track.
              </p>
              {stats?.postingStreak && stats.postingStreak > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-bold animate-bounce-subtle">
                  <Zap className="w-3.5 h-3.5 fill-amber-500" />
                  {stats.postingStreak} Day Streak!
                </div>
              )}
            </div>
          </div>
        </AnimatedCard>

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Posting Streak"
            value={stats?.postingStreak ? `${stats.postingStreak} ${stats.postingStreak === 1 ? "day" : "days"}` : "0 days"}
            icon={<Zap className="w-5 h-5" />}
            color="text-amber-500 bg-amber-500/10"
          />
          <StatCard
            label="Published"
            value={stats?.totalPostsPublished ?? 0}
            icon={<CheckCircle2 className="w-5 h-5" />}
            color="text-emerald-500 bg-emerald-500/10"
          />
          <StatCard
            label="Queued"
            value={stats?.postsQueued ?? 0}
            icon={<Calendar className="w-5 h-5" />}
            color="text-primary bg-primary/10"
          />
        </div>

        {/* ── Post manager ─────────────────────────────────────────────────── */}
        <div className="space-y-8 pt-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
              Post Manager
              <div className="h-1 w-1 rounded-full bg-primary" />
            </h2>
            <Link href="/posts/new">
              <Button className="w-full md:w-auto rounded-2xl h-11 px-6 gap-2 font-black shadow-xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-primary to-blue-600 border-none group">
                <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                Create Post
              </Button>
            </Link>
          </div>

          {posts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-10">
              <PushPermissionPrompt />
              {scheduledPosts.length === 0 && (
                <CoachSuggestionCard postCount={stats?.totalCount ?? 0} />
              )}

              {scheduledPosts.length > 0 && (
                <PostSection
                  title="Scheduled Posts"
                  icon={<Clock className="w-4 h-4 text-primary" />}
                >
                  {scheduledPosts.map((p, i) => (
                    <PostCard
                      key={p.id}
                      post={p}
                      index={i}
                      onDelete={handleDeletePost}
                      isDeleting={deletingId === p.id}
                    />
                  ))}
                </PostSection>
              )}

              {publishedPosts.length > 0 && (
                <PostSection
                  title="Recently Published"
                  icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                >
                  {publishedPosts.map((p, i) => (
                    <PostCard
                      key={p.id}
                      post={p}
                      index={i}
                      onDelete={handleDeletePost}
                      isDeleting={deletingId === p.id}
                    />
                  ))}
                </PostSection>
              )}

              {drafts.length > 0 && (
                <PostSection
                  title="Drafts"
                  icon={<FileEdit className="w-4 h-4 text-zinc-500" />}
                >
                  {drafts.map((p, i) => (
                    <PostCard
                      key={p.id}
                      post={p}
                      index={i}
                      onDelete={handleDeletePost}
                      isDeleting={deletingId === p.id}
                    />
                  ))}
                </PostSection>
              )}
            </div>
          )}
        </div>

        {/* AICoach — lazy loaded, panel fetches only on open */}
        <AICoach />
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CoachSuggestionCard({ postCount }: { postCount: number }) {
  const hasHistory = postCount > 0
  return (
    <AnimatedCard animation="fade-in-up" className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-primary rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000" />
      <Card className="relative rounded-2xl border-primary/20 bg-site-bg backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-site-bg border border-white/5 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-lg md:text-xl font-bold tracking-tight mb-2">
                  {hasHistory ? "Consistent Posting is Key" : "Ready to launch your presence?"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {hasHistory
                    ? `You've published ${postCount} posts. Keep the momentum going!`
                    : "Start your journey by creating your first post."}
                </p>
              </div>
              <Button
                size="sm"
                className="rounded-xl h-10 px-6 font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                onClick={() => window.dispatchEvent(new CustomEvent("open-ai-coach"))}
              >
                Get Post Idea
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AnimatedCard>
  )
}

const StatCard = React.memo(function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}) {
  return (
    <Card className="rounded-3xl border-border/40 bg-card/50 backdrop-blur-md shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            {label}
          </p>
          <p className="text-3xl font-black tracking-tighter text-foreground group-hover:scale-105 transition-transform duration-300 origin-left">
            {value}
          </p>
        </div>
        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:rotate-12", color)}>
          {icon}
        </div>
      </CardContent>
    </Card>
  )
})

const PostSection = React.memo(function PostSection({
  title,
  children,
  icon,
}: {
  title: string
  children: React.ReactNode
  icon: React.ReactNode
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pl-1">
        <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-border/50">
          {icon}
        </div>
        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
          {title}
        </h3>
      </div>
      <div className="space-y-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {children}
        </AnimatePresence>
      </div>
    </div>
  )
})

const PostCard = React.memo(function PostCard({
  post,
  index,
  onDelete,
  isDeleting,
}: {
  post: Post
  index: number
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  const isScheduled = post.status === "SCHEDULED"
  const isPublished = post.status === "PUBLISHED"
  const isDraft = post.status === "DRAFT"

  // FIX: USER_TIMEZONE is now module-scope — not re-allocated per card per render

  return (
    <AnimatedCard
      animation="slide-up"
      index={index}
      layout
      exit={{ opacity: 0, scale: 0.9, x: -20, transition: { duration: 0.2 } }}
    >
      <Card className={cn(
        "rounded-[2rem] border-border/40 bg-card/40 backdrop-blur-sm hover:bg-card/60 hover:border-primary/30 transition-all duration-300 relative overflow-hidden group",
        isDeleting && "opacity-60 scale-[0.98] grayscale"
      )}>
        <div
          className={cn(
            "absolute left-0 top-6 bottom-6 w-1 rounded-r-full transition-all duration-300 opacity-20 group-hover:opacity-100",
            isScheduled ? "bg-primary" : isPublished ? "bg-emerald-500" : "bg-zinc-400"
          )}
        />
        <CardContent className="p-6 pl-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-4 flex-1">
              <p className="text-[17px] text-foreground/90 line-clamp-2 leading-relaxed font-bold tracking-tight">
                {post.content}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {isScheduled && post.scheduledFor && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 text-primary text-xs font-black">
                    <Clock className="w-3.5 h-3.5" />
                    {format(toZonedTime(post.scheduledFor, USER_TIMEZONE), "MMM d • hh:mm a")}
                  </div>
                )}
                {isPublished && post.publishedAt && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/5 text-emerald-600 text-xs font-black">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Published {format(toZonedTime(post.publishedAt, USER_TIMEZONE), "MMM d")}
                  </div>
                )}
                {isDraft && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-black">
                    Draft
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(post.id)}
                disabled={isDeleting}
                className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shadow-none"
              >
                {isDeleting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </Button>
              <Link href={`/posts/new?id=${post.id}`}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl hover:bg-primary hover:text-white transition-all shadow-none"
                >
                  {isPublished ? (
                    <ArrowUpRight className="w-5 h-5" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </AnimatedCard>
  )
})

function EmptyState() {
  return (
    <AnimatedCard
      animation="fade-in-scale"
      className="border-2 border-dashed border-border/60 rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-4"
    >
      <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-muted-foreground">
        <Plus className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">No posts yet</h3>
        <p className="text-muted-foreground max-w-xs mx-auto">
          Create your first post to get started.
        </p>
      </div>
      <Link href="/posts/new">
        <Button variant="outline" className="rounded-full mt-2">
          Create Post
        </Button>
      </Link>
    </AnimatedCard>
  )
}

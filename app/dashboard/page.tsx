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
  X
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // ✅ FIXED: fetchData wrapped in useCallback
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)

      const [postsRes, userRes] = await Promise.all([
        fetch("/api/posts"),
        fetch("/api/user/me")
      ])

      if (postsRes.ok) {
        const data = await postsRes.json()
        const fetchedPosts = data.posts || []
        setPosts(fetchedPosts)

        const unnotified = fetchedPosts.filter(
          (p: any) => p.status === "PUBLISHED" && p.notified === false
        )

        if (unnotified.length > 0) {
          setNotifications(prev => [...prev, ...unnotified])
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

  return (
    <div className="space-y-10 max-w-2xl mx-auto py-8 px-4 md:px-0">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-24 right-8 z-50 w-80 space-y-4 pointer-events-none">
          {notifications.map(n => (
            <AnimatedCard key={n.id} animation="slide-up">
              <div className="bg-blue-600 text-white p-4 rounded-2xl relative shadow-lg pointer-events-auto">
                <button
                  onClick={() => dismissNotification(n.id)}
                  className="absolute top-2 right-2 text-white/80 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="text-sm font-medium line-clamp-2 pr-6">{n.content}</p>
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
      <AnimatedCard animation="stagger-container" className="grid gap-4">
        {/* Scheduled */}
        <Card className="rounded-2xl border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Posts Queued</p>
              <p className="text-3xl font-bold tracking-tight text-foreground">
                {posts.filter(p => p.status === "SCHEDULED").length}
              </p>
            </div>
            <div className="h-10 w-10 text-primary bg-primary/10 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Views (Placeholder) */}
        <Card className="rounded-2xl border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Views</p>
              <p className="text-3xl font-bold tracking-tight text-foreground">0</p>
            </div>
            <div className="h-10 w-10 text-blue-500 bg-blue-500/10 rounded-full flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Engagement (Placeholder) */}
        <Card className="rounded-2xl border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Engagement</p>
              <p className="text-3xl font-bold tracking-tight text-foreground">0%</p>
            </div>
            <div className="h-10 w-10 text-green-500 bg-green-500/10 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </AnimatedCard>

      {/* Your Posts Section */}
      <div className="space-y-6 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Your Posts</h2>
          <Link href="/posts/new">
            <Button size="icon" className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
              <Plus className="w-5 h-5" />
            </Button>
          </Link>
        </div>

        {posts.length === 0 ? (
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
        ) : (
          <div className="space-y-3">
            <div className="p-6 border border-border/50 rounded-2xl bg-card/50 text-center text-muted-foreground">
              <p>Post list view coming soon.</p>
            </div>
          </div>
        )}
      </div>

      <div className="h-24"></div> {/* Bottom spacer for nav */}
    </div>
  )
}

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
  Calendar as CalendarIcon,
  FileText,
  Clock,
  CheckCircle,
  PenSquare,
  ArrowRight,
  Sparkles,
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

  const stats = [
    { title: "Total Posts", value: posts.length, icon: FileText },
    { title: "Scheduled", value: posts.filter(p => p.status === "SCHEDULED").length, icon: Clock },
    { title: "Published", value: posts.filter(p => p.status === "PUBLISHED").length, icon: CheckCircle }
  ]

  return (
    <div className="space-y-12 max-w-6xl mx-auto py-8">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-24 right-8 z-50 w-80 space-y-4">
          {notifications.map(n => (
            <AnimatedCard key={n.id} animation="slide-up">
              <div className="bg-blue-600 text-white p-4 rounded-2xl relative">
                <button
                  onClick={() => dismissNotification(n.id)}
                  className="absolute top-2 right-2"
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="text-sm font-medium line-clamp-2">{n.content}</p>
              </div>
            </AnimatedCard>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold">Overview</h1>
          <p className="text-muted-foreground">
            Your content pipeline is looking healthy.
          </p>
        </div>
        <Link href="/posts/new">
          <Button size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Create post
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <Icon className="w-6 h-6 text-blue-500" />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
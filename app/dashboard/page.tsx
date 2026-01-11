"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Calendar as CalendarIcon, FileText, Send, Clock, CheckCircle, PenSquare, ArrowRight, Sparkles } from "lucide-react"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchData()
    }
  }, [session])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [postsRes, userRes] = await Promise.all([
        fetch("/api/posts"),
        fetch("/api/user/me")
      ])

      if (postsRes.ok) {
        const data = await postsRes.json()
        setPosts(data.posts || [])
      }

      if (userRes.ok) {
        const data = await userRes.json()
        setIsConnected(data.user.isConnected)
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!session) return null

  const stats = [
    { title: "Total Posts", value: posts.length, icon: FileText },
    { title: "Scheduled", value: posts.filter((p: any) => p.status === "SCHEDULED").length, icon: Clock },
    { title: "Published", value: posts.filter((p: any) => p.status === "PUBLISHED").length, icon: CheckCircle },
  ]

  return (
    <div className="space-y-12 max-w-6xl mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="text-muted-foreground text-lg font-light leading-relaxed max-w-md">
            Your content pipeline is looking healthy. Ready for the next one?
          </p>
        </div>
        <Link href="/posts/new">
          <Button size="lg" className="h-14 px-8 rounded-2xl shadow-premium">
            <Plus className="w-5 h-5 mr-3" />
            <span>Create new post</span>
          </Button>
        </Link>
      </div>

      {!isConnected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-secondary/50 p-10 rounded-[40px] border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl transition-transform group-hover:scale-110" />
          <div className="space-y-4 text-center md:text-left relative z-10">
            <h3 className="text-3xl font-bold tracking-tight text-site-fg">Link your Identity</h3>
            <p className="text-muted-foreground text-lg font-light leading-relaxed max-w-lg">
              Authorized access is required to broadcast your thoughts to the professional world.
            </p>
          </div>
          <Link href="/settings" className="relative z-10 shrink-0">
            <Button size="lg" className="h-16 px-10 rounded-2xl shadow-premium hover:shadow-xl transition-all">
              Connect Profile
            </Button>
          </Link>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-none bg-secondary/30 shadow-none rounded-[24px] hover:bg-secondary/40 transition-colors">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">{stat.title}</p>
                      <h3 className="text-3xl font-bold text-blue-600">{stat.value}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-site-bg flex items-center justify-center text-blue-300 shadow-sm group-hover:text-blue-600 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}

        {/* Insight Moment */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-none bg-blue-100 shadow-blue-glow rounded-[24px] relative overflow-hidden group border-t-2 border-blue-600">
            <CardContent className="p-8">
              <div className="space-y-1 relative z-10">
                <p className="text-[10px] font-bold tracking-[0.2em] text-blue-600 uppercase">Network Resonance</p>
                <h3 className="text-3xl font-bold text-site-fg">Steady</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-2 max-w-[120px]">
                  Your consistency is building a compound effect.
                </p>
              </div>
              <Sparkles className="absolute -bottom-2 -right-2 w-16 h-16 text-blue-600/10 group-hover:scale-110 transition-transform" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="blue-gradient-divider opacity-50" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Recent Posts List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase">Recent drafts</h2>
            <Link href="/calendar" className="text-[11px] font-bold text-blue-600 flex items-center gap-2 hover:opacity-70 transition-opacity uppercase tracking-widest">
              <span>Explore Archive</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-20 bg-secondary/20 rounded-[32px] border-2 border-dashed border-border">
                <p className="text-muted-foreground font-light text-lg mb-6">Your feed is waiting for your first spark.</p>
                <Link href="/posts/new">
                  <Button variant="outline" size="lg" className="rounded-2xl h-14 px-8">Start writing</Button>
                </Link>
              </div>
            ) : (
              posts.slice(0, 5).map((post: any, i) => (
                <div key={post.id} className="group flex items-center justify-between p-6 bg-card border border-border rounded-[24px] hover:shadow-premium transition-all duration-300">
                  <div className="flex items-center gap-6 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-primary transition-colors">
                      {post.status === 'PUBLISHED' ? <CheckCircle className="w-5 h-5" /> :
                        post.status === 'SCHEDULED' ? <Clock className="w-5 h-5" /> :
                          <PenSquare className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-medium text-foreground truncate">{post.content}</p>
                      <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                        {post.status} — {post.scheduledFor ? new Date(post.scheduledFor).toLocaleDateString() : new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Link href={`/posts/new?id=${post.id}`}>
                    <Button variant="ghost" size="icon" className="rounded-full w-12 h-12 opacity-0 group-hover:opacity-100 transition-opacity">
                      <PenSquare className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions / Tips */}
        <div className="space-y-8">
          <div className="text-xl font-bold tracking-tight uppercase opacity-50">Pro Tip</div>
          <Card className="border-none bg-secondary/50 rounded-[32px] overflow-hidden">
            <CardContent className="p-10 space-y-6">
              <p className="text-xl font-light leading-relaxed text-foreground">
                Consistency is a superpower. Try to batch <span className="font-bold">5 posts</span> every Sunday evening.
              </p>
              <Link href="/posts/new" className="block">
                <Button className="w-full h-14 rounded-2xl">
                  Draft Batch
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}



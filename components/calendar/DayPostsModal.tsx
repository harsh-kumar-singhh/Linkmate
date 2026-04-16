"use client"

import { format } from "date-fns"
import { X, Clock, CheckCircle2, FileEdit, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Post {
  id: string
  content: string
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED"
  scheduledFor: string | null
  createdAt: string
  source?: string
}

interface DayPostsModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date | null
  posts: Post[]
}

export function DayPostsModal({ isOpen, onClose, date, posts }: DayPostsModalProps) {
  if (!date) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] rounded-[2rem] p-0 overflow-hidden border-none bg-white dark:bg-zinc-950 shadow-2xl">
        <DialogHeader className="p-6 pb-0 relative">
          <DialogTitle className="text-xl font-bold tracking-tight">
            Posts for {format(date, "MMMM d, yyyy")}
          </DialogTitle>
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 rounded-full w-8 h-8 flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 scrollbar-hide">
          {posts.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                <FileEdit className="w-6 h-6" />
              </div>
              <p className="text-sm text-muted-foreground">No posts found for this day.</p>
            </div>
          ) : (
            posts.map((post) => (
              <Link 
                key={post.id} 
                href={`/posts/new?id=${post.id}`}
                onClick={onClose}
                className="block group"
              >
                <div className="p-4 rounded-3xl border border-border bg-card/30 hover:bg-card/80 hover:border-primary/30 transition-all duration-300 relative overflow-hidden">
                   <div className={cn(
                        "absolute left-0 top-3 bottom-3 w-1 rounded-r-full opacity-40 group-hover:opacity-100 transition-opacity",
                        post.status === "PUBLISHED" ? "bg-emerald-500" : 
                        post.status === "SCHEDULED" ? "bg-blue-500" : "bg-zinc-400"
                    )} />
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-foreground/90 line-clamp-2 leading-relaxed">
                      {post.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {post.status === "PUBLISHED" ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" />
                            Published
                          </div>
                        ) : post.status === "SCHEDULED" ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-wider">
                            <Clock className="w-3 h-3" />
                            {post.scheduledFor ? format(new Date(post.scheduledFor), "hh:mm a") : "Scheduled"}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-500/10 text-zinc-500 text-[10px] font-black uppercase tracking-wider">
                            <FileEdit className="w-3 h-3" />
                            Draft
                          </div>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="p-6 pt-0">
          <Link href={`/posts/new?date=${date.toISOString()}`} onClick={onClose}>
            <Button className="w-full rounded-2xl h-12 font-bold shadow-xl shadow-primary/20">
              Create New Post
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}

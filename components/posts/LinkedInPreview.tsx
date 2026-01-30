"use client"

import { useSession } from "next-auth/react"
import { Globe, MoreHorizontal, MessageSquare, Repeat, Send, ThumbsUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface LinkedInPreviewProps {
    content: string
    className?: string
}

export function LinkedInPreview({ content, className }: LinkedInPreviewProps) {
    const { data: session } = useSession()

    return (
        <div className={cn("bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm max-w-lg mx-auto", className)}>
            {/* Header */}
            <div className="p-4 flex items-start justify-between">
                <div className="flex gap-2">
                    <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-700">
                        {session?.user?.image ? (
                            <img src={session.user.image} alt={session.user.name || "User"} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xl font-bold text-zinc-400">{session?.user?.name?.[0] || "U"}</span>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                            {session?.user?.name || "Your Name"}
                        </h4>
                        <p className="text-[12px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                            Software Engineer at TechCorp • Building the future
                        </p>
                        <div className="flex items-center gap-1 text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            <span>Now</span>
                            <span>•</span>
                            <Globe className="w-3 h-3" />
                        </div>
                    </div>
                </div>
                <button className="text-zinc-500">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="px-4 pb-4">
                <p className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words leading-relaxed font-sans">
                    {content || (
                        <span className="text-zinc-400 italic">Your post content will appear here...</span>
                    )}
                </p>
            </div>

            {/* Image Placeholder (Only if content exists or always for the requirement) */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 border-y border-zinc-100 dark:border-zinc-800 min-h-[200px] flex flex-col items-center justify-center gap-2 p-8">
                <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-zinc-400" />
                </div>
                <p className="text-xs text-zinc-400 font-medium">Image preview will appear here</p>
            </div>

            {/* Stats */}
            <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <div className="flex -space-x-1">
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center ring-1 ring-white dark:ring-zinc-900">
                            <ThumbsUp className="w-2.5 h-2.5 text-white fill-white" />
                        </div>
                    </div>
                    <span className="text-[12px] text-zinc-500 dark:text-zinc-400">0</span>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-zinc-500 dark:text-zinc-400">
                    <span>0 comments</span>
                    <span>•</span>
                    <span>0 reposts</span>
                </div>
            </div>

            {/* Actions */}
            <div className="px-2 py-1 flex items-center justify-between">
                <button className="flex items-center gap-2 px-3 py-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    <ThumbsUp className="w-5 h-5 text-zinc-500" />
                    <span className="text-sm font-semibold text-zinc-500">Like</span>
                </button>
                <button className="flex items-center gap-2 px-3 py-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    <MessageSquare className="w-5 h-5 text-zinc-500" />
                    <span className="text-sm font-semibold text-zinc-500">Comment</span>
                </button>
                <button className="flex items-center gap-2 px-3 py-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    <Repeat className="w-5 h-5 text-zinc-500" />
                    <span className="text-sm font-semibold text-zinc-500">Repost</span>
                </button>
                <button className="flex items-center gap-2 px-3 py-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    <Send className="w-5 h-5 text-zinc-500" />
                    <span className="text-sm font-semibold text-zinc-500">Send</span>
                </button>
            </div>
        </div>
    )
}

"use client"

import { useSession } from "next-auth/react"
import { Globe, MoreHorizontal, ThumbsUp, MessageSquare, Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface LinkedInPreviewProps {
    content: string
    className?: string
}

export function LinkedInPreview({ content, className }: LinkedInPreviewProps) {
    const { data: session } = useSession()

    return (
        <div className={cn("bg-white dark:bg-[#1B1F23] border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm max-w-[552px] mx-auto font-sans text-[#191919] dark:text-[#E1E1E1]", className)}>
            {/* Header */}
            <div className="p-3 pb-2 flex items-start gap-2">
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 overflow-hidden border border-zinc-200/50 dark:border-zinc-700/50">
                    {session?.user?.image ? (
                        <img src={session.user.image} alt={session.user.name || "User"} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#E5E5E5] dark:bg-[#38434F]">
                            <span className="text-xl font-bold text-[#666666] dark:text-[#A1A1A1]">{session?.user?.name?.[0] || "U"}</span>
                        </div>
                    )}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                        <h4 className="text-[14px] font-semibold hover:text-[#0A66C2] hover:underline cursor-pointer leading-tight">
                            {session?.user?.name || "Your Name"}
                        </h4>
                        <span className="text-[14px] text-zinc-500 dark:text-zinc-400 font-normal leading-tight">• 1st</span>
                    </div>
                    <p className="text-[12px] text-zinc-500 dark:text-zinc-400 line-clamp-1 leading-tight mt-0.5">
                        Professional at LinkMate • Strategy & Growth
                    </p>
                    <div className="flex items-center gap-1 text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        <span>Now</span>
                        <span>•</span>
                        <Globe className="w-3.5 h-3.5" />
                    </div>
                </div>
                <button className="text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1.5 rounded-full transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="px-4 py-2">
                <p className="text-[14px] leading-[20px] whitespace-pre-wrap break-words font-normal">
                    {content || (
                        <span className="text-zinc-400 italic">Your post content will appear here...</span>
                    )}
                </p>
            </div>

            {/* Attachment Placeholder */}
            <div className="bg-[#F8F9FA] dark:bg-[#121619] border-y border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-center p-12 mt-2 group cursor-pointer transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center mb-3">
                    <Globe className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                </div>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400 font-medium tracking-tight">Image preview will be shown here</p>
            </div>

            {/* Stats Area */}
            <div className="px-3 py-2 flex items-center justify-between border-b border-zinc-100/80 dark:border-zinc-800/80 mx-1">
                <div className="flex items-center gap-1">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full bg-[#0A66C2]">
                        <ThumbsUp className="w-2.5 h-2.5 text-white fill-white" />
                    </div>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-[#0A66C2] hover:underline cursor-pointer">0</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span className="hover:text-[#0A66C2] hover:underline cursor-pointer">0 comments</span>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center px-1">
                <button className="flex-1 flex items-center justify-center gap-1 py-3 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-semibold text-[14px]">
                    <ThumbsUp className="w-[18px] h-[18px]" />
                    <span>Like</span>
                </button>
                <button className="flex-1 flex items-center justify-center gap-1 py-3 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-semibold text-[14px]">
                    <MessageSquare className="w-[18px] h-[18px]" />
                    <span>Comment</span>
                </button>
                <button className="flex-1 flex items-center justify-center gap-1 py-3 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-semibold text-[14px]">
                    <Send className="w-[18px] h-[18px]" />
                    <span>Send</span>
                </button>
            </div>
        </div>
    )
}

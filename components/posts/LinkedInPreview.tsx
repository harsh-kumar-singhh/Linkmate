"use client"

import { useSession } from "next-auth/react"
import { Globe, MoreHorizontal, ThumbsUp, MessageSquare, Send, Image as ImageIcon, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { motion } from "framer-motion"

interface LinkedInPreviewProps {
    content: string
    imageUrl?: string | null
    className?: string
}

export function LinkedInPreview({ content, imageUrl, className }: LinkedInPreviewProps) {
    const { data: session } = useSession()

    return (
        <div className={cn("bg-white dark:bg-[#1B1F23] border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm max-w-[552px] mx-auto font-sans text-[#191919] dark:text-[#E1E1E1]", className)}>
            {/* Header */}
            <div className="p-3 pb-2 flex items-start gap-2">
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 overflow-hidden border border-zinc-200/50 dark:border-zinc-700/50">
                    {session?.user?.image ? (
                        <Image
                            src={session.user.image}
                            alt={session.user.name || "User"}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                            unoptimized
                        />
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
                    {/* Subtitle removed as requested - keeps it clean and dynamic */}
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

            {/* Attachment Preview */}
            {imageUrl ? (
                <div className="mt-2 border-y border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                    <Image
                        src={imageUrl}
                        alt="Post attachment"
                        width={552}
                        height={450}
                        className="w-full h-auto object-contain max-h-[450px]"
                        unoptimized
                    />
                </div>
            ) : (
                <div className="relative h-[280px] mt-2 overflow-hidden group cursor-pointer border-y border-zinc-100 dark:border-zinc-800">
                    {/* Dynamic Background */}
                    <div className="absolute inset-0 bg-zinc-50 dark:bg-zinc-900/50 transition-colors group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800/80" />
                    <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[radial-gradient(#0A66C2_1px,transparent_1px)] [background-size:20px_20px]" />
                    
                    <div className="relative h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                        <motion.div
                            animate={{ 
                                y: [0, -8, 0],
                                rotate: [0, 5, -5, 0]
                            }}
                            transition={{ 
                                duration: 4, 
                                repeat: Infinity, 
                                ease: "easeInOut" 
                            }}
                            className="w-16 h-16 rounded-3xl bg-white dark:bg-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none flex items-center justify-center relative"
                        >
                            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#0A66C2]/10 to-transparent opacity-50" />
                            <ImageIcon className="w-8 h-8 text-[#0A66C2] relative z-10" />
                            
                            {/* Decorative Sparks */}
                            <motion.div 
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute -top-1 -right-1 w-4 h-4 text-[#0A66C2]"
                            >
                                <Sparkles className="w-full h-full" />
                            </motion.div>
                        </motion.div>

                        <div className="space-y-1 max-w-[280px]">
                            <h5 className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                                Visuals drive 2x more reach 🚀
                            </h5>
                            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-snug">
                                Add an image or video to make your story impossible to ignore.
                            </p>
                        </div>

                        <div className="pt-2">
                             <span className="text-[11px] font-bold text-[#0A66C2] px-3 py-1 rounded-full bg-[#0A66C2]/5 border border-[#0A66C2]/10 uppercase tracking-widest">
                                Boost Engagement
                             </span>
                        </div>
                    </div>
                </div>
            )}

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

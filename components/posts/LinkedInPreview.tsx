"use client"

import { useSession } from "next-auth/react"
import { Globe, MoreHorizontal, ThumbsUp, MessageSquare, Send, Image as ImageIcon, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { motion } from "framer-motion"

interface LinkedInPreviewProps {
    content: string
    imageUrl?: string | null
    className?: string
    onAddImage?: () => void
}

export function LinkedInPreview({ content, imageUrl, className, onAddImage }: LinkedInPreviewProps) {
    const { data: session } = useSession()

    return (
        <div className={cn("bg-white dark:bg-[#1B1F23] border border-zinc-200 dark:border-zinc-800 rounded-[24px] overflow-hidden shadow-sm max-w-[552px] mx-auto font-sans text-[#191919] dark:text-[#E1E1E1]", className)}>
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
                /* Outer wrapper: gives the floating card its inset margins */
                <div className="px-3 pb-3 pt-2">
                <motion.div
                    className="relative h-[280px] overflow-hidden cursor-pointer rounded-[24px]"
                    whileHover={{ y: -4, boxShadow: "0 20px 60px rgba(10,102,194,0.22), 0 0 0 1px rgba(90,164,255,0.28)" }}
                    initial={{ boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05)" }}
                    transition={{ type: "spring", stiffness: 280, damping: 22 }}
                    style={{ willChange: "transform" }}
                >
                    {/* === LAYERED BACKGROUND SYSTEM === */}

                    {/* Base gradient: subtle depth */}
                    <div className="absolute inset-0 rounded-[24px] bg-gradient-to-br from-blue-500/[0.03] via-transparent to-zinc-500/[0.03] dark:from-primary/10 dark:via-transparent dark:to-primary/5" />

                    {/* Radial glow behind icon area */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_50%_at_50%_38%,rgba(var(--primary),0.05)_0%,transparent_70%)]" />

                    {/* Subtle noise texture via SVG filter */}
                    <svg className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.05] pointer-events-none rounded-[24px]" xmlns="http://www.w3.org/2000/svg">
                        <filter id="lm-noise">
                            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                            <feColorMatrix type="saturate" values="0" />
                        </filter>
                        <rect width="100%" height="100%" filter="url(#lm-noise)" />
                    </svg>

                    {/* Very subtle dot grid */}
                    <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.1] pointer-events-none bg-[radial-gradient(currentColor_1px,transparent_1px)] [background-size:22px_22px] text-primary/20" />

                    {/* === GRADIENT BORDER RING (always visible, premium feel) === */}
                    <div
                        className="absolute inset-0 rounded-[24px] pointer-events-none border border-primary/10 dark:border-primary/20"
                    />

                    {/* === HOVER INNER GLOW === */}
                    <motion.div
                        className="absolute inset-0 rounded-[24px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{
                            boxShadow: "inset 0 0 40px rgba(var(--primary), 0.05)"
                        }}
                    />

                    {/* === BLURRED PLACEHOLDER IMAGE SHAPES === */}
                    <div className="absolute left-3 top-6 w-24 h-18 rounded-2xl bg-secondary/50 dark:bg-primary/5 rotate-[-10deg] blur-[2px]" />
                    <div className="absolute right-4 top-5 w-18 h-22 rounded-2xl bg-secondary/40 dark:bg-primary/5 rotate-[8deg] blur-[2px]" />

                    {/* === SLOW LIGHT SWEEP === */}
                    <motion.div
                        className="absolute inset-0 pointer-events-none"
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "linear", repeatDelay: 4 }}
                        style={{
                            background: "linear-gradient(105deg, transparent 30%, rgba(var(--primary), 0.03) 50%, transparent 70%)",
                        }}
                    />

                    {/* === MAIN CONTENT === */}
                    <div className="relative h-full flex flex-col items-center justify-center p-8 text-center space-y-5">

                        {/* Floating icon with glow */}
                        <motion.div
                            animate={{ y: [0, -7, 0] }}
                            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                            className="relative flex items-center justify-center"
                        >
                            {/* Outer glow ring */}
                            <motion.div
                                className="absolute w-20 h-20 rounded-full bg-primary/5 dark:bg-primary/10"
                                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            />
                            {/* Icon container */}
                            <motion.div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center relative z-10 bg-background/80 border border-border shadow-sm dark:bg-secondary/20 dark:border-primary/30 backdrop-blur-sm"
                                whileHover={{ scale: 1.08 }}
                                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            >
                                <ImageIcon className="w-7 h-7 text-primary" />
                            </motion.div>
                        </motion.div>

                        {/* Improved copy — emotional & punchy */}
                        <div className="space-y-1.5 max-w-[260px]">
                            <h5 className="text-[15px] font-bold tracking-tight leading-tight text-foreground">
                                Your post deserves attention.
                            </h5>
                            <p className="text-[12.5px] leading-snug text-muted-foreground">
                                Add an image to make it scroll-stopping.
                            </p>
                        </div>

                        {/* Upgraded CTA button */}
                        <motion.button
                            whileHover={{ scale: 1.04, y: -1 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            onClick={onAddImage}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold mt-1 bg-primary text-primary-foreground shadow-md hover:opacity-90 transition-all tracking-wide"
                        >
                            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                            Add Image
                        </motion.button>
                    </div>
                </motion.div>
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

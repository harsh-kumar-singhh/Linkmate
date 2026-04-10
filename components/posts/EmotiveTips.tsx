"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Sparkles, 
    Zap, 
    MessageCircle, 
    Target, 
    Rocket,
    CheckCircle2,
    Heart
} from "lucide-react";

interface Tip {
    id: number;
    title: string;
    desc: string;
    icon: React.ElementType;
    color: string;
    emotion: string;
}

const TIPS: Tip[] = [
    {
        id: 1,
        title: "Hook them hard! 🎣",
        desc: "The first two lines are where you win or lose. Make them curious, bold, or slightly contrarian to stop the scroll.",
        icon: Zap,
        color: "text-amber-500",
        emotion: "High Energy"
    },
    {
        id: 2,
        title: "Be a human, not a bot 🤖",
        desc: "Write like you talk! Share a personal struggle or a lesson learned. Vulnerability drives authentic engagement.",
        icon: Heart,
        color: "text-rose-500",
        emotion: "Emotional Connection"
    },
    {
        id: 3,
        title: "Ask, don't just tell 💬",
        desc: "End with a clear, easy-to-answer question. It invites people into the conversation and boosts your algorithm reach.",
        icon: MessageCircle,
        color: "text-blue-500",
        emotion: "Community Driven"
    },
    {
        id: 4,
        title: "Give away the 'Secret' 💎",
        desc: "Don't hold back your best tips. High-value content establishes you as an authority and builds massive trust.",
        icon: Target,
        color: "text-emerald-500",
        emotion: "Authority & Trust"
    },
    {
        id: 5,
        title: "Visuals are 50% of the job 🖼️",
        desc: "A great image or carousel stops the eyes. Make sure your visuals match the 'vibe' of your writing.",
        icon: Rocket,
        color: "text-purple-500",
        emotion: "Visual Impact"
    }
];

export function EmotiveTips() {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % TIPS.length);
        }, 6000);
        return () => clearInterval(timer);
    }, []);

    const currentTip = TIPS[currentIndex];

    return (
        <div className="bg-card/40 backdrop-blur-xl border border-border/60 rounded-[32px] overflow-hidden shadow-2xl shadow-primary/5 h-full min-h-[380px] flex flex-col">
            <div className="p-8 pb-4">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">AI Strategy Coach</h2>
                    </div>
                    <div className="flex gap-1">
                        {TIPS.map((_, i) => (
                            <div 
                                key={i} 
                                className={`h-1 rounded-full transition-all duration-500 ${i === currentIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/20"}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="relative h-[180px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 1.05 }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute inset-0 space-y-4"
                        >
                            <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-lg bg-secondary/50 ${currentTip.color}`}>
                                    <currentTip.icon className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                                    {currentTip.emotion}
                                </span>
                            </div>
                            
                            <h3 className="text-2xl font-bold text-foreground leading-tight">
                                {currentTip.title}
                            </h3>
                            
                            <p className="text-[15px] text-muted-foreground leading-relaxed">
                                {currentTip.desc}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <div className="mt-auto p-4 px-8 border-t border-border/40 bg-secondary/5">
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-background bg-secondary flex items-center justify-center overflow-hidden">
                                <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/10 animate-pulse" />
                            </div>
                        ))}
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground italic">
                        "Your best post is just one click away..."
                    </p>
                </div>
            </div>
            
            {/* Animated progress bar at bottom */}
            <motion.div 
                className="h-1 bg-primary/30 origin-left"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                key={`progress-${currentIndex}`}
                transition={{ duration: 6, ease: "linear" }}
            />
        </div>
    );
}

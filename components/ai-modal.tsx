"use client";

import { useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import { X, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AIModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (data: { topic: string; style: string }) => Promise<void>;
}

const styles = ["Professional", "Casual", "Enthusiastic", "Storytelling", "Write Like Me"];

export function AIModal({ isOpen, onClose, onGenerate }: AIModalProps) {
    const [topic, setTopic] = useState("");
    const [selectedStyle, setSelectedStyle] = useState("Professional");
    const [isGenerating, setIsGenerating] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic) return;

        setIsGenerating(true);
        await onGenerate({ topic, style: selectedStyle });
        setIsGenerating(false);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <LazyMotion features={domAnimation}>
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-site-fg/20 backdrop-blur-md z-50 flex items-center justify-center p-4"
                    >
                        <m.div
                            initial={{ scale: 0.98, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.98, opacity: 0, y: 10 }}
                            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card rounded-[32px] shadow-premium w-full max-w-lg overflow-hidden border border-border transition-colors relative"
                        >
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600" />
                            <div className="p-10">
                                <div className="flex items-center justify-between mb-10">
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="w-5 h-5 text-blue-600" />
                                        <h2 className="font-bold text-2xl tracking-tight text-site-fg uppercase">Linkmate AI</h2>
                                    </div>
                                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-2">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-10">
                                    <div className="space-y-4">
                                        <label className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase">Context</label>
                                        <Input
                                            placeholder="What's the core idea?"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            className="text-lg h-16 px-6 bg-secondary/50 border-none rounded-2xl focus:ring-1 focus:ring-blue-600/30 transition-all"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase">Output Vibe</label>
                                        <div className="flex flex-wrap gap-2">
                                            {styles.map((style) => (
                                                <button
                                                    key={style}
                                                    type="button"
                                                    onClick={() => setSelectedStyle(style)}
                                                    className={cn(
                                                        "px-6 py-3 rounded-full text-[13px] font-medium transition-all duration-200 border",
                                                        selectedStyle === style
                                                            ? "bg-blue-600 text-white border-blue-600"
                                                            : "bg-transparent text-muted-foreground border-border hover:border-blue-600 hover:text-blue-600"
                                                    )}
                                                >
                                                    {style}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        <Button
                                            type="submit"
                                            disabled={!topic || isGenerating}
                                            className="w-full h-16 text-lg rounded-2xl"
                                        >
                                            {isGenerating ? (
                                                <div className="flex items-center gap-3">
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    <span>Crafting...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span>Generate Draft</span>
                                                    <ArrowRight className="w-5 h-5" />
                                                </div>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </m.div>
                    </m.div>
                </LazyMotion>
            )}
        </AnimatePresence>
    );
}

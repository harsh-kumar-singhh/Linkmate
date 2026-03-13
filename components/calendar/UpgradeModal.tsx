"use client";

import { AnimatePresence } from "framer-motion";
import { AnimatedCard } from "@/components/animated/AnimatedCard";
import { X, Lock, Zap, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
    const router = useRouter();

    const handleUpgrade = () => {
        router.push("/pricing");
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <AnimatedCard
                    animation="backdrop"
                    onClick={onClose}
                    className="fixed inset-0 bg-site-fg/20 backdrop-blur-md z-50 flex items-center justify-center p-4"
                >
                    <AnimatedCard
                        animation="modal"
                        onClick={(e) => e.stopPropagation()}
                        className="bg-card rounded-[32px] shadow-premium w-full max-w-md overflow-hidden border border-border transition-colors relative"
                    >
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
                        <div className="p-8 md:p-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 p-2 rounded-xl">
                                        <Lock className="w-5 h-5 text-primary" />
                                    </div>
                                    <h2 className="font-bold text-xl tracking-tight text-foreground uppercase">Autopilot</h2>
                                </div>
                                <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-2">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-6 text-center">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold tracking-tight">Post while you sleep.</h3>
                                    <p className="text-muted-foreground">
                                        Autopilot automatically generates and schedules posts based on your expertise. Never miss a day on LinkedIn again.
                                    </p>
                                </div>

                                <div className="bg-secondary/30 rounded-2xl p-6 space-y-4 text-left">
                                    <div className="flex items-start gap-3">
                                        <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-sm">Automated Strategy</p>
                                            <p className="text-xs text-muted-foreground leading-relaxed">AI creates a week's worth of content in seconds.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold text-sm">Full Control</p>
                                            <p className="text-xs text-muted-foreground leading-relaxed">Review and edit any post before it goes live.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <Button
                                        onClick={handleUpgrade}
                                        className="w-full h-14 text-base rounded-2xl gap-2 font-bold"
                                    >
                                        <span>Upgrade to Pro</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                    <p className="text-[10px] text-muted-foreground mt-4 font-medium uppercase tracking-widest">
                                        Unlock full automation for only ₹249/mo
                                    </p>
                                </div>
                            </div>
                        </div>
                    </AnimatedCard>
                </AnimatedCard>
            )}
        </AnimatePresence>
    );
}

"use client";

import { useState, useEffect } from "react";
import { Sparkles, Save, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import { useTrialTrigger } from "@/context/TrialTriggerContext";

interface WeeklyFocusCardProps {
    initialFocus?: string;
    onUpdate?: (result: { posts?: any[]; deletedPostIds?: string[]; focus?: string }) => void | Promise<void>;
}

export function WeeklyFocusCard({ initialFocus = "", onUpdate }: WeeklyFocusCardProps) {
    const { isPro } = useUser();
    const { triggerLockedModal } = useTrialTrigger();
    const [focus, setFocus] = useState(initialFocus);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

    useEffect(() => {
        setFocus(initialFocus);
    }, [initialFocus]);

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        setStatus("idle");

        try {
            const response = await fetch("/api/user/focus", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ focus }),
            });

            if (response.ok) {
                setStatus("success");
                if (onUpdate) await onUpdate(await response.json());
                setTimeout(() => setStatus("idle"), 3000);
            } else {
                setStatus("error");
            }
        } catch (error) {
            console.error("Failed to save focus:", error);
            setStatus("error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-card border border-border/80 rounded-[28px] overflow-hidden shadow-sm transition-all duration-500 hover:shadow-md">
            <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg tracking-tight">Weekly Focus</h3>
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold font-mono">Autopilot Context</p>
                                {!isPro && (
                                    <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[8px] font-black uppercase tracking-tighter">Pro</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 relative">
                    {!isPro && (
                        <div 
                            className="absolute inset-0 z-10 cursor-pointer flex flex-col items-center justify-center bg-background/5 rounded-2xl border border-dashed border-border/50 group/lock hover:bg-background/10 transition-all"
                            onClick={() => triggerLockedModal("Autopilot Strategy")}
                        >
                            <div className="p-3 rounded-full bg-background border border-border shadow-sm group-hover/lock:scale-110 transition-transform">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <p className="mt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Click to unlock Autopilot</p>
                        </div>
                    )}
                    <textarea
                        value={focus}
                        onChange={(e) => setFocus(e.target.value)}
                        placeholder="Add this week’s focus context so the autopilot can generate more personalized posts. E.g., 'Focusing on AI innovation and new product launches this week.'"
                        className="w-full bg-secondary/30 border border-border/50 rounded-2xl p-5 text-base md:text-sm min-h-[160px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all resize-y placeholder:text-muted-foreground/50 leading-relaxed overflow-y-auto"
                        maxLength={3000}
                    />
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                        <div className="flex items-center gap-2 px-2">
                            <div className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                focus.length > 2500 ? "bg-amber-500" : "bg-blue-600/40"
                            )} />
                            <span className={cn(
                                "text-[11px] font-bold font-mono tracking-tight",
                                focus.length > 2500 ? "text-amber-600" : "text-muted-foreground/70"
                            )}>
                                {focus.length.toLocaleString()} / 3,000 characters
                            </span>
                        </div>

                        <Button 
                            onClick={handleSave}
                            disabled={isSaving || focus === initialFocus}
                            className={cn(
                                "h-11 px-8 rounded-xl gap-2.5 font-bold shadow-sm transition-all active:scale-[0.98] w-full sm:w-auto",
                                status === "success" 
                                    ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                            )}
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                            ) : status === "success" ? (
                                <CheckCircle2 className="w-4 h-4 text-white" />
                            ) : (
                                <Save className="w-4 h-4 text-white" />
                            )}
                            {status === "success" ? "Selection Saved" : "Update Focus"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

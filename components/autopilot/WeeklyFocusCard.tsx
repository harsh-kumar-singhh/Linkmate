"use client";

import { useState, useEffect } from "react";
import { Sparkles, Save, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WeeklyFocusCardProps {
    initialFocus?: string;
    onUpdate?: () => void;
}

export function WeeklyFocusCard({ initialFocus = "", onUpdate }: WeeklyFocusCardProps) {
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
                if (onUpdate) onUpdate();
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
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold font-mono">Autopilot Context</p>
                        </div>
                    </div>
                </div>

                <div className="relative group">
                    <textarea
                        value={focus}
                        onChange={(e) => setFocus(e.target.value)}
                        placeholder="Add this week’s focus so that the autopilot can generate more personalized posts"
                        className="w-full bg-secondary/30 border border-border/50 rounded-2xl p-5 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all resize-none placeholder:text-muted-foreground/50"
                        maxLength={500}
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-3">
                         <span className={cn(
                            "text-[10px] font-bold text-muted-foreground transition-opacity",
                            focus.length > 400 ? "opacity-100" : "opacity-0"
                        )}>
                            {focus.length}/500
                        </span>
                        <Button 
                            onClick={handleSave}
                            disabled={isSaving || focus === initialFocus}
                            className={cn(
                                "h-10 px-5 rounded-xl gap-2 font-bold shadow-sm transition-all",
                                status === "success" 
                                    ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                            )}
                            size="sm"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : status === "success" ? (
                                <CheckCircle2 className="w-4 h-4" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {status === "success" ? "Saved" : "Save Focus"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

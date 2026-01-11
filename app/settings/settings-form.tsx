"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TextareaAutosize from "react-textarea-autosize";
import { Button } from "@/components/ui/button";
import { Save, Check, Sparkles } from "lucide-react";

export function SettingsForm({ initialWritingStyle }: { initialWritingStyle: string }) {
    const [writingStyle, setWritingStyle] = useState(initialWritingStyle);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const router = useRouter();

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch("/api/user/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ writingStyle }),
            });

            if (response.ok) {
                setIsSaved(true);
                setTimeout(() => setIsSaved(false), 2000);
                router.refresh();
            }
        } catch (error) {
            console.error("Failed to save", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Training Data</label>
                </div>
                <TextareaAutosize
                    minRows={8}
                    value={writingStyle}
                    onChange={(e) => setWritingStyle(e.target.value)}
                    placeholder="Paste examples of your writing or describe your tone..."
                    className="w-full resize-none text-xl font-light leading-relaxed p-8 rounded-3xl bg-secondary/20 border border-border focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all text-site-fg"
                />
            </div>

            <div className="flex justify-start">
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    size="lg"
                    className="h-14 px-8 rounded-2xl gap-3 shadow-sm hover:shadow-md transition-all duration-500"
                >
                    {isSaved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                    <span className="font-bold tracking-tight">
                        {isSaved ? "Configuration Saved" : isSaving ? "Calibrating..." : "Sync Identity"}
                    </span>
                </Button>
            </div>
        </div>
    );
}

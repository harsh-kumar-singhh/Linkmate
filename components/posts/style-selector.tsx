"use client"

import { ChevronLeft, ChevronRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface StyleSelectorProps {
    value: string;
    onChange: (style: string) => void;
    styles: string[];
}

export function StyleSelector({ value, onChange, styles }: StyleSelectorProps) {
    const currentIndex = styles.indexOf(value);

    const handlePrevious = () => {
        const newIndex = currentIndex > 0 ? currentIndex - 1 : styles.length - 1;
        onChange(styles[newIndex]);
    };

    const handleNext = () => {
        const newIndex = currentIndex < styles.length - 1 ? currentIndex + 1 : 0;
        onChange(styles[newIndex]);
    };

    return (
        <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex justify-between">
                <span>Tone</span>
                <span className="text-primary font-mono">{Math.max(0, currentIndex) + 1} / {styles.length}</span>
            </label>

            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrevious}
                    className="h-14 w-14 rounded-xl border-border/80 hover:bg-secondary/50 shrink-0"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Button>

                <div className="flex-1 min-w-0 md:w-auto md:flex-none md:min-w-[240px] min-h-[3.5rem] relative overflow-hidden bg-background border border-border/80 rounded-xl flex items-center justify-center group px-4 py-1 shrink-0 transition-all">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="font-semibold text-sm transition-all duration-300 transform whitespace-normal w-full text-center leading-tight break-words">
                        {value}
                    </span>
                    {value.startsWith("Write Like Me") && (
                        <SparklesIcon className="w-4 h-4 text-primary absolute top-2 right-2" />
                    )}
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNext}
                    className="h-14 w-14 rounded-xl border-border/80 hover:bg-secondary/50 shrink-0"
                >
                    <ChevronRight className="w-5 h-5" />
                </Button>
            </div>
        </div>
    )
}

function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21l-.394-.433a2.25 2.25 0 00-1.636-1.636l-.433-.393.433-.393a2.25 2.25 0 001.636-1.636l.394-.433.394.433a2.25 2.25 0 001.636 1.636l.433.393-.433.393a2.25 2.25 0 00-1.636 1.636z" />
        </svg>
    )
}

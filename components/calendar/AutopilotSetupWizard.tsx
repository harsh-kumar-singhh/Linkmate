"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedCard } from "@/components/animated/AnimatedCard";
import { X, Sparkles, Loader2, ArrowRight, ArrowLeft, Check, Calendar as CalendarIcon, Clock, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveAutopilotSettings } from "@/lib/actions/autopilot";

// Fix for Framer Motion version 12 type errors on Vercel
const MotionDiv = motion.div as any;

interface AutopilotSetupWizardProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: {
        topics: string[];
        frequency: string;
        days: string[];
        time: string;
    };
}

const TOPIC_EXAMPLES = ["Startups", "AI", "Productivity", "Marketing", "Career Advice", "Software Engineering", "Entrepreneurship", "Personal Branding"];
const FREQUENCY_OPTIONS = [
    { label: "2 posts per week", value: "2" },
    { label: "3 posts per week", value: "3" },
    { label: "4 posts per week", value: "4" },
];
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function AutopilotSetupWizard({ isOpen, onClose, initialData }: AutopilotSetupWizardProps) {
    const [step, setStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);

    const [topics, setTopics] = useState<string[]>(initialData?.topics || []);
    const [customTopic, setCustomTopic] = useState("");
    const [frequency, setFrequency] = useState(initialData?.frequency || "3");
    const [days, setDays] = useState<string[]>(initialData?.days || ["Monday", "Wednesday", "Friday"]);
    const [time, setTime] = useState(initialData?.time || "10:00");

    const maxDays = parseInt(frequency);

    const toggleTopic = (topic: string) => {
        if (topics.includes(topic)) {
            setTopics(topics.filter(t => t !== topic));
        } else if (topics.length < 5) {
            setTopics([...topics, topic]);
        }
    };

    const addCustomTopic = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = customTopic.trim();
        if (trimmed && !topics.includes(trimmed) && topics.length < 5) {
            setTopics([...topics, trimmed]);
            setCustomTopic("");
        }
    };

    const toggleDay = (day: string) => {
        if (days.includes(day)) {
            setDays(days.filter(d => d !== day));
        } else if (days.length < maxDays) {
            setDays([...days, day]);
        }
    };

    const handleNext = () => setStep(s => s + 1);
    const handlePrev = () => setStep(s => s - 1);

    const handleActivate = async () => {
        setIsSaving(true);
        try {
            await saveAutopilotSettings({
                topics,
                frequency,
                days,
                time,
            });
            onClose();
        } catch (error) {
            console.error("Setup error:", error);
            alert(error instanceof Error ? error.message : "Failed to activate Autopilot");
        } finally {
            setIsSaving(false);
        }
    };

    const isStep1Valid = topics.length >= 3 && topics.length <= 5;
    const isStep3Valid = days.length > 0;

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
                        className="bg-card rounded-[32px] shadow-premium w-full max-w-xl overflow-hidden border border-border transition-colors relative"
                    >
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600 flex">
                            {[1, 2, 3].map((s) => (
                                <div 
                                    key={s} 
                                    className={cn(
                                        "h-full flex-1 transition-all duration-500",
                                        s <= step ? "bg-blue-600" : "bg-secondary/50"
                                    )} 
                                />
                            ))}
                        </div>
                        
                        <div className="p-8 md:p-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-600/10 p-2 rounded-xl">
                                        <Sparkles className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <h2 className="font-bold text-xl tracking-tight text-foreground uppercase">Autopilot Setup</h2>
                                </div>
                                <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-2">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="min-h-[350px]">
                                {step === 1 && (
                                    <MotionDiv 
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-bold">What do you post about?</h3>
                                            <p className="text-sm text-muted-foreground">Select 3-5 topics to help the AI understand your niche.</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {topics.filter(t => !TOPIC_EXAMPLES.includes(t)).map((topic) => (
                                                <button
                                                    key={topic}
                                                    onClick={() => toggleTopic(topic)}
                                                    className="px-5 py-2.5 rounded-full text-sm font-medium transition-all border bg-blue-600 text-white border-blue-600 shadow-sm flex items-center gap-2"
                                                >
                                                    {topic}
                                                    <X className="w-3 h-3" />
                                                </button>
                                            ))}
                                            {TOPIC_EXAMPLES.map((topic) => (
                                                <button
                                                    key={topic}
                                                    onClick={() => toggleTopic(topic)}
                                                    className={cn(
                                                        "px-5 py-2.5 rounded-full text-sm font-medium transition-all border",
                                                        topics.includes(topic)
                                                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                            : "bg-secondary/50 text-muted-foreground border-transparent hover:border-blue-600/30 hover:text-blue-600"
                                                    )}
                                                >
                                                    {topic}
                                                </button>
                                            ))}
                                        </div>

                                        <form onSubmit={addCustomTopic} className="relative pt-4">
                                            <input
                                                type="text"
                                                placeholder="Add Custom Topic"
                                                value={customTopic}
                                                onChange={(e) => setCustomTopic(e.target.value)}
                                                disabled={topics.length >= 5}
                                                className="w-full h-12 bg-secondary/30 border-none rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-600/30"
                                            />
                                            <Button 
                                                type="submit"
                                                disabled={!customTopic.trim() || topics.length >= 5}
                                                variant="ghost" 
                                                size="icon" 
                                                className="absolute right-1 top-[1.25rem] h-10 w-10 text-blue-600"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </Button>
                                        </form>

                                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 pt-2 flex justify-between">
                                            <span>{topics.length} / 5 Selected</span>
                                            {topics.length < 3 && <span className="text-amber-500">Pick at least 3</span>}
                                        </div>
                                    </MotionDiv>
                                )}

                                {step === 2 && (
                                    <MotionDiv 
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-bold">How often should we post?</h3>
                                            <p className="text-sm text-muted-foreground">Choose your weekly post count.</p>
                                        </div>
                                        <div className="space-y-3 pt-4">
                                            {FREQUENCY_OPTIONS.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => {
                                                        setFrequency(opt.value);
                                                        // Clear excess days if frequency is reduced
                                                        const limit = parseInt(opt.value);
                                                        if (days.length > limit) {
                                                            setDays(days.slice(0, limit));
                                                        }
                                                    }}
                                                    className={cn(
                                                        "w-full p-5 rounded-2xl flex items-center justify-between transition-all border text-left",
                                                        frequency === opt.value
                                                            ? "bg-blue-600/5 border-blue-600 text-foreground ring-1 ring-blue-600"
                                                            : "bg-secondary/30 border-transparent text-muted-foreground hover:bg-secondary/50"
                                                    )}
                                                >
                                                    <span className="font-bold">{opt.label}</span>
                                                    {frequency === opt.value && (
                                                        <div className="bg-blue-600 rounded-full p-1 text-white">
                                                            <Check className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </MotionDiv>
                                )}

                                {step === 3 && (
                                    <MotionDiv 
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-8"
                                    >
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-bold">Fine-tune your schedule</h3>
                                            <p className="text-sm text-muted-foreground">Select posting days and preferred time.</p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <CalendarIcon className="w-4 h-4 text-blue-600" />
                                                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Posting Days</label>
                                                </div>
                                                <span className={cn(
                                                    "text-xs font-bold",
                                                    days.length === maxDays ? "text-emerald-500" : "text-muted-foreground"
                                                )}>
                                                    Selected days: {days.length} / {maxDays}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                                                {DAYS_OF_WEEK.map((day) => (
                                                    <button
                                                        key={day}
                                                        onClick={() => toggleDay(day)}
                                                        className={cn(
                                                            "h-10 rounded-lg text-xs font-bold transition-all border",
                                                            days.includes(day)
                                                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                                : "bg-secondary/50 text-muted-foreground border-transparent hover:border-blue-600/30"
                                                        )}
                                                    >
                                                        {day.substring(0, 3)}
                                                    </button>
                                                ))}
                                            </div>
                                            {days.length < maxDays && (
                                                <p className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Select {maxDays - days.length} more day{maxDays - days.length > 1 ? 's' : ''} to match your frequency.
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Clock className="w-4 h-4 text-blue-600" />
                                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Daily Time</label>
                                            </div>
                                            <input 
                                                type="time" 
                                                value={time}
                                                onChange={(e) => setTime(e.target.value)}
                                                className="w-full h-14 bg-secondary/30 border-none rounded-2xl px-6 font-bold text-lg focus:ring-2 focus:ring-blue-600/30"
                                            />
                                        </div>
                                    </MotionDiv>
                                )}
                            </div>

                            <div className="flex items-center gap-4 pt-10 mt-auto">
                                {step > 1 && (
                                    <Button
                                        variant="secondary"
                                        onClick={handlePrev}
                                        className="h-14 px-6 rounded-2xl"
                                        disabled={isSaving}
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </Button>
                                )}
                                
                                {step < 3 ? (
                                    <Button
                                        onClick={handleNext}
                                        className="flex-1 h-14 rounded-2xl text-base font-bold gap-2"
                                        disabled={step === 1 && !isStep1Valid}
                                    >
                                        <span>Next Step</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleActivate}
                                        className="flex-1 h-14 rounded-2xl text-base font-bold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                        disabled={days.length !== maxDays || isSaving}
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>Activating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Activate Autopilot</span>
                                                <Check className="w-5 h-5" />
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </AnimatedCard>
                </AnimatedCard>
            )}
        </AnimatePresence>
    );
}

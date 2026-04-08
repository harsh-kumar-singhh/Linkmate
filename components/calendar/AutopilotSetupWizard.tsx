"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedCard } from "@/components/animated/AnimatedCard";
import { X, Sparkles, Loader2, ArrowRight, ArrowLeft, Check, Calendar as CalendarIcon, Clock, Plus, AlertCircle, Repeat, Zap, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveAutopilotSettings } from "@/lib/actions/autopilot";
import Link from "next/link";

// Fix for Framer Motion version 12 type errors on Vercel
const MotionDiv = motion.div as any;

interface AutopilotSetupWizardProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: {
        topics: string[];
        frequency: string;
        days: string[];
        time: string; // UTC
        aboutYou?: string;
        currentFocus?: string;
        writingStyleId?: string;
        writingStyles?: Array<{ id: string; name: string }>;
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
    const [days, setDays] = useState<string[]>(initialData?.days || []);
    
    // autopilotTime is already local HH:mm
    const [time, setTime] = useState(initialData?.time || "10:00");

    const [aboutYou, setAboutYou] = useState(initialData?.aboutYou || "");
    const [currentFocus, setCurrentFocus] = useState(initialData?.currentFocus || "");
    const [writingStyleId, setWritingStyleId] = useState<string>(initialData?.writingStyleId || "default");
    const [selectionMode, setSelectionMode] = useState<"automatic" | "manual">(
        initialData?.writingStyleId && initialData.writingStyleId !== "default" ? "manual" : "automatic"
    );
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // PART 4 & 5 FIX: Sync state with initialData only when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(1); // Reset to first step when opening
            
            if (initialData) {
                console.log("[Autopilot] Prefilling wizard with initialData:", initialData);
                if (initialData.topics) setTopics(initialData.topics);
                if (initialData.frequency) setFrequency(initialData.frequency);
                if (initialData.days) setDays(initialData.days);
                if (initialData.aboutYou) setAboutYou(initialData.aboutYou);
                if (initialData.currentFocus) setCurrentFocus(initialData.currentFocus);
                if (initialData.writingStyleId) {
                    setWritingStyleId(initialData.writingStyleId);
                    setSelectionMode(initialData.writingStyleId !== "default" ? "manual" : "automatic");
                }
                
                if (initialData.time) {
                    setTime(initialData.time);
                }
            }
        }
    }, [isOpen, initialData]);

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
            // autopilotTime is saved as a local HH:mm string. 
            // The backend handles conversion for scheduling.

            const payload = {
                topics,
                frequency,
                days,
                time: time,
                aboutYou,
                currentFocus,
                writingStyleId: selectionMode === "automatic" ? "default" : writingStyleId,
            };

            console.log("[Autopilot] Saving settings with payload:", payload);

            const result = await saveAutopilotSettings(payload);
            console.log("[Autopilot] Save result:", result);
            
            onClose();
        } catch (error) {
            console.error("Setup error:", error);
            alert(error instanceof Error ? error.message : "Failed to activate Autopilot");
        } finally {
            setIsSaving(false);
        }
    };

    const isStep1Valid = topics.length >= 3 && topics.length <= 5;
    const isStep3Valid = days.length === maxDays;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-site-fg/20 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={onClose}>
                    <AnimatedCard
                        animation="modal"
                        className="w-full max-w-[500px] bg-card rounded-[40px] border border-border/50 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Floating Progress Bar - Fixed at top */}
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-secondary/30 z-10">
                            <MotionDiv
                                className="h-full bg-blue-600"
                                initial={{ width: 0 }}
                                animate={{ width: `${(step / 4) * 100}%` }}
                            />
                        </div>

                        {/* Scrollable Content Area */}
                        <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar">
                            <div className="space-y-8">
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-blue-600/10 flex items-center justify-center">
                                            {step === 1 ? <Sparkles className="w-5 h-5 text-blue-600" /> :
                                             step === 2 ? <Repeat className="w-5 h-5 text-blue-600" /> :
                                             step === 3 ? <CalendarIcon className="w-5 h-5 text-blue-600" /> :
                                             <Zap className="w-5 h-5 text-blue-600" />}
                                        </div>
                                        <div className="px-3 py-1 bg-blue-600/5 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                            Step {step} of 4
                                        </div>
                                    </div>
                                    <h2 className="text-3xl font-black tracking-tight text-foreground">
                                        {step === 1 ? "What should we write about?" :
                                         step === 2 ? "How often should we post?" :
                                         step === 3 ? "When should we post?" :
                                         "Setting your style"}
                                    </h2>
                                    <p className="text-muted-foreground text-sm font-medium leading-relaxed max-w-[320px]">
                                        {step === 1 ? "Select 3-5 topics that interest your audience." :
                                         step === 2 ? "We'll suggest the optimal posting frequency for your plan." :
                                         step === 3 ? "Pick the best days for your audience engagement." :
                                         "Fine-tune the voice and context for your AI generated content."}
                                    </p>
                                </div>

                                <div className="min-h-[300px]">
                                    <AnimatePresence mode="wait">
                                        {step === 1 && (
                                            <MotionDiv 
                                                key="step1"
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
                                                    {/* Show selected custom topics that aren't in predefined list */}
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
                                                    
                                                    {/* Show predefined topics as toggleable chips */}
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
                                                key="step2"
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
                                                                // REQUIREMENT: Reset selected days when frequency changes
                                                                setDays([]);
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
                                                key="step3"
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

                                        {step === 4 && (
                                            <MotionDiv 
                                                key="step4"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="space-y-8"
                                            >
                                                <div className="space-y-1">
                                                    <h3 className="text-xl font-bold">Personalize your AI</h3>
                                                    <p className="text-sm text-muted-foreground">Give the AI context so posts sound like you.</p>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">About You (Optional)</label>
                                                        <textarea 
                                                            value={aboutYou}
                                                            onChange={(e) => setAboutYou(e.target.value)}
                                                            placeholder="e.g., Founder building an AI SaaS called Linkmate that helps professionals grow on LinkedIn."
                                                            className="w-full h-24 bg-secondary/30 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-600/30 resize-none"
                                                        />
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Weekly Focus (Optional)</label>
                                                        <textarea 
                                                            value={currentFocus}
                                                            onChange={(e) => setCurrentFocus(e.target.value)}
                                                            placeholder="e.g., Preparing to launch Linkmate publicly and documenting the journey."
                                                            className="w-full h-24 bg-secondary/30 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-600/30 resize-none"
                                                        />
                                                    </div>

                                                    <div className="space-y-4 pt-2">
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Writing Style</label>
                                                            <div className="flex flex-col gap-2">
                                                                <button
                                                                    onClick={() => setSelectionMode("automatic")}
                                                                    className={cn(
                                                                        "w-full p-4 rounded-xl flex items-center justify-between transition-all border text-left",
                                                                        selectionMode === "automatic"
                                                                            ? "bg-blue-600/5 border-blue-600 text-foreground ring-1 ring-blue-600"
                                                                            : "bg-secondary/30 border-transparent text-muted-foreground hover:bg-secondary/50"
                                                                    )}
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-sm">Automatic Selection</span>
                                                                        <span className="text-[10px] opacity-70">Best AI style for your profile</span>
                                                                    </div>
                                                                    {selectionMode === "automatic" && <Check className="w-4 h-4 text-blue-600" />}
                                                                </button>

                                                                <button
                                                                    onClick={() => setSelectionMode("manual")}
                                                                    className={cn(
                                                                        "w-full p-4 rounded-xl flex items-center justify-between transition-all border text-left",
                                                                        selectionMode === "manual"
                                                                            ? "bg-blue-600/5 border-blue-600 text-foreground ring-1 ring-blue-600"
                                                                            : "bg-secondary/30 border-transparent text-muted-foreground hover:bg-secondary/50"
                                                                    )}
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-sm">Select Style Manually</span>
                                                                        <span className="text-[10px] opacity-70">Use a specific style you created</span>
                                                                    </div>
                                                                    {selectionMode === "manual" && <Check className="w-4 h-4 text-blue-600" />}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {selectionMode === "manual" && (
                                                            <MotionDiv
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: "auto" }}
                                                                className="space-y-2"
                                                            >
                                                                {initialData?.writingStyles && initialData.writingStyles.length > 0 ? (
                                                                    <div className="relative" ref={dropdownRef}>
                                                                        <button
                                                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                                            className="w-full h-12 bg-background border border-border rounded-xl px-4 flex items-center justify-between text-sm font-medium hover:border-blue-600/30 transition-all shadow-sm"
                                                                        >
                                                                            <span className="truncate">
                                                                                {writingStyleId === "default" 
                                                                                    ? "Select a style..." 
                                                                                    : initialData.writingStyles.find(s => s.name === writingStyleId)?.name || "Select a style..."
                                                                                }
                                                                            </span>
                                                                            <ChevronDown className={cn("w-4 h-4 transition-transform", isDropdownOpen && "rotate-180")} />
                                                                        </button>

                                                                        <AnimatePresence>
                                                                            {isDropdownOpen && (
                                                                                <MotionDiv
                                                                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                                    animate={{ opacity: 1, y: 4, scale: 1 }}
                                                                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                                    className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
                                                                                >
                                                                                    <div className="max-h-[250px] overflow-y-auto p-1 custom-scrollbar">
                                                                                        {initialData.writingStyles.map((style: any, idx: number) => (
                                                                                            <button
                                                                                                key={style.name || idx.toString()}
                                                                                                onClick={() => {
                                                                                                    setWritingStyleId(style.name);
                                                                                                    setIsDropdownOpen(false);
                                                                                                }}
                                                                                                className={cn(
                                                                                                    "w-full px-3 py-2.5 rounded-xl text-left text-sm flex items-center justify-between transition-all",
                                                                                                    writingStyleId === style.name 
                                                                                                        ? "bg-blue-600/10 text-blue-600 font-bold" 
                                                                                                        : "hover:bg-secondary/50 text-muted-foreground"
                                                                                                )}
                                                                                            >
                                                                                                <span className="truncate">{style.name}</span>
                                                                                                {writingStyleId === style.name && <Check className="w-3.5 h-3.5" />}
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                </MotionDiv>
                                                                            )}
                                                                        </AnimatePresence>
                                                                        <p className="text-[10px] text-muted-foreground px-1 pt-2">
                                                                            Choose one of your pre-defined writing personas.
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-2">
                                                                        <p className="text-[10px] text-amber-600 font-bold flex items-center gap-2">
                                                                            <AlertCircle className="w-3 h-3" />
                                                                            You haven&apos;t created any writing styles yet.
                                                                        </p>
                                                                        <Link 
                                                                            href="/settings" 
                                                                            className="inline-block text-[10px] font-black text-blue-600 hover:underline underline-offset-4"
                                                                        >
                                                                            Create a style now &rarr;
                                                                        </Link>
                                                                    </div>
                                                                )}
                                                            </MotionDiv>
                                                        )}

                                                    </div>
                                                </div>
                                            </MotionDiv>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        {/* Sticky Footer - Always visible */}
                        <div className="p-6 md:px-10 md:pb-10 bg-card border-t border-border/10">
                            <div className="flex items-center gap-4">
                                {step > 1 && (
                                    <Button
                                        variant="secondary"
                                        onClick={handlePrev}
                                        className="h-14 px-6 rounded-2xl hover:bg-secondary/80 transition-all"
                                        disabled={isSaving}
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </Button>
                                )}
                                
                                {step < 4 ? (
                                    <div className="flex-1 flex flex-col gap-2">
                                        <Button
                                            onClick={handleNext}
                                            className={cn(
                                                "w-full h-14 rounded-2xl text-base font-bold gap-2 bg-foreground text-background hover:bg-foreground/90 transition-all shadow-xl shadow-foreground/5",
                                                ((step === 1 && !isStep1Valid) || (step === 3 && !isStep3Valid)) && "opacity-50 cursor-not-allowed"
                                            )}
                                            disabled={(step === 1 && !isStep1Valid) || (step === 3 && !isStep3Valid)}
                                        >
                                            <span>Next Step</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={handleActivate}
                                        className={cn(
                                            "flex-1 h-14 rounded-2xl text-base font-bold gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20 transition-all",
                                            (days.length !== maxDays || isSaving) && "opacity-50 cursor-not-allowed"
                                        )}
                                        disabled={days.length !== maxDays || isSaving}
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Save & Generate</span>
                                                <Zap className="w-4 h-4 fill-current" />
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </AnimatedCard>
                </div>
            )}
        </AnimatePresence>
    );
}

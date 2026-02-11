"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TextareaAutosize from "react-textarea-autosize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Save,
    Check,
    Sparkles,
    User,
    Type,
    Settings2,
    Bell,
    Moon,
    Sun,
    Laptop,
    Shield,
    ChevronLeft,
    ChevronRight,
    Languages
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface SettingsFormProps {
    user: any;
}

function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
                checked ? "bg-primary" : "bg-muted-foreground/30"
            )}
        >
            <span
                className={cn(
                    "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out",
                    checked ? "translate-x-5" : "translate-x-0"
                )}
            />
        </button>
    );
}

export function SettingsForm({ user }: SettingsFormProps) {
    const [name, setName] = useState(user?.name || "");

    // Initialize writingStyles with 5 named slots
    const initialWritingStyles = user?.writingStyles && Array.isArray(user.writingStyles) && user.writingStyles.length > 0
        ? user.writingStyles
        : [
            { name: "", sample: "" },
            { name: "", sample: "" },
            { name: "", sample: "" },
            { name: "", sample: "" },
            { name: "", sample: "" }
        ];

    // Ensure we always have exactly 5 slots
    while (initialWritingStyles.length < 5) {
        initialWritingStyles.push({ name: "", sample: "" });
    }
    if (initialWritingStyles.length > 5) {
        initialWritingStyles.length = 5;
    }

    const [writingStyles, setWritingStyles] = useState<Array<{ name: string; sample: string }>>(initialWritingStyles);
    const [currentStyleIndex, setCurrentStyleIndex] = useState(0);

    const [tone, setTone] = useState(user?.defaultTone || "Professional");
    const [autoHashtags, setAutoHashtags] = useState(true);
    const [smartScheduling, setSmartScheduling] = useState(true);
    const [notifications, setNotifications] = useState({
        success: true,
        scheduled: true,
        engagement: false,
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const { setTheme, theme } = useTheme();
    const router = useRouter();

    const handleSave = async (field: string, value?: any) => {
        setIsSaving(true);
        try {
            const body: any = {};
            if (field === 'writingStyles') body.writingStyles = writingStyles;
            if (field === 'account') body.name = name;
            if (field === 'theme') body.theme = value;
            if (field === 'tone') body.defaultTone = value;

            const response = await fetch("/api/user/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
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

    const updateWritingStyle = (index: number, field: 'name' | 'sample', value: string) => {
        const newStyles = [...writingStyles];
        newStyles[index] = { ...newStyles[index], [field]: value };
        setWritingStyles(newStyles);
    };

    const updateTheme = (newTheme: string) => {
        setTheme(newTheme);
        handleSave('theme', newTheme);
    };

    const updateTone = (newTone: string) => {
        setTone(newTone);
        handleSave('tone', newTone);
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Account Information Card */}
            <div className="bg-card border border-border/60 rounded-[24px] shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Account Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Full Name</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your full name"
                                className="h-12 rounded-xl border-border/80"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email Address</label>
                            <Input
                                value={user?.email || ""}
                                readOnly
                                disabled
                                className="h-12 rounded-xl bg-secondary/30 text-muted-foreground border-border/40 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button
                            onClick={() => handleSave('account')}
                            disabled={isSaving}
                            className="h-12 px-6 rounded-xl font-bold gap-2"
                        >
                            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            Save Changes
                        </Button>
                    </div>
                </div>
            </div>

            {/* Write Like Me (5 Named Slots) */}
            <div className="bg-card border border-border/60 rounded-[24px] shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Write Like Me</h3>
                        </div>
                        <div className="flex items-center gap-2 bg-secondary/30 rounded-lg p-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={currentStyleIndex === 0}
                                onClick={() => setCurrentStyleIndex(prev => Math.max(0, prev - 1))}
                                className="h-6 w-6 p-0"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-[11px] font-mono font-bold w-16 text-center">
                                Slot {currentStyleIndex + 1} / 5
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={currentStyleIndex === 4}
                                onClick={() => setCurrentStyleIndex(prev => Math.min(4, prev + 1))}
                                className="h-6 w-6 p-0"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Save up to 5 different writing styles. Give each a name and paste a sample of that style.
                        </p>

                        <div className="space-y-3">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Style Name</label>
                                <Input
                                    value={writingStyles[currentStyleIndex].name}
                                    onChange={(e) => updateWritingStyle(currentStyleIndex, 'name', e.target.value)}
                                    placeholder={`e.g., "Personal", "Bold", "Thoughtful"`}
                                    className="h-12 rounded-xl border-border/80"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Writing Sample</label>
                                    <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                                        {writingStyles[currentStyleIndex].sample?.length || 0} chars
                                    </span>
                                </div>
                                <div className="relative group">
                                    <TextareaAutosize
                                        minRows={8}
                                        value={writingStyles[currentStyleIndex].sample}
                                        onChange={(e) => updateWritingStyle(currentStyleIndex, 'sample', e.target.value)}
                                        placeholder={`Paste a sample of your writing for this style...`}
                                        className="w-full resize-none text-base p-6 rounded-2xl bg-secondary/20 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
                                    />
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Sparkles className="w-4 h-4 text-primary/40" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button
                            onClick={() => handleSave('writingStyles')}
                            disabled={isSaving}
                            className="h-12 px-6 rounded-xl font-bold gap-2"
                        >
                            {isSaved ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                            Save All Styles
                        </Button>
                    </div>
                </div>
            </div>

            {/* Posting Preferences Card */}
            <div className="bg-card border border-border/60 rounded-[24px] shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Posting Preferences</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-secondary/10 border border-border/40">
                            <div>
                                <h4 className="font-bold text-sm">Default Post Tone</h4>
                                <p className="text-xs text-muted-foreground">The default mood for new AI generations</p>
                            </div>
                            <select
                                value={tone}
                                onChange={(e) => updateTone(e.target.value)}
                                className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none min-w-[140px]"
                            >
                                <option>Professional</option>
                                <option>Casual</option>
                                <option>Enthusiastic</option>
                                <option>Storytelling</option>
                                {writingStyles.map((style, i) => (
                                    style.name.trim() && (
                                        <option key={i} value={`Write Like Me - ${style.name.trim()}`}>
                                            Write Like Me - {style.name.trim()}
                                        </option>
                                    )
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/10 border border-border/40">
                            <div>
                                <h4 className="font-bold text-sm">Auto-Add Hashtags</h4>
                                <p className="text-xs text-muted-foreground">Automatically suggest relevant hashtags</p>
                            </div>
                            <Switch checked={autoHashtags} onChange={setAutoHashtags} />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/10 border border-border/40">
                            <div>
                                <h4 className="font-bold text-sm">Smart Scheduling</h4>
                                <p className="text-xs text-muted-foreground">Suggest optimal posting times</p>
                            </div>
                            <Switch checked={smartScheduling} onChange={setSmartScheduling} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Appearance Card */}
            <div className="bg-card border border-border/60 rounded-[24px] shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Appearance</h3>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={() => updateTheme("light")}
                            className={cn(
                                "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                                theme === "light"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                            )}
                        >
                            <Sun className="w-5 h-5" />
                            <span className="text-xs font-medium">Light</span>
                        </button>

                        <button
                            onClick={() => updateTheme("dark")}
                            className={cn(
                                "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                                theme === "dark"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                            )}
                        >
                            <Moon className="w-5 h-5" />
                            <span className="text-xs font-medium">Dark</span>
                        </button>

                        <button
                            onClick={() => updateTheme("system")}
                            className={cn(
                                "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                                theme === "system"
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                            )}
                        >
                            <Laptop className="w-5 h-5" />
                            <span className="text-xs font-medium">System</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Notifications Card */}
            <div className="bg-card border border-border/60 rounded-[24px] shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Notifications</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/10 border border-border/40">
                            <div>
                                <h4 className="font-bold text-sm">Post Published</h4>
                                <p className="text-xs text-muted-foreground">When your post goes live</p>
                            </div>
                            <Switch
                                checked={notifications.success}
                                onChange={(v) => setNotifications({ ...notifications, success: v })}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/10 border border-border/40">
                            <div>
                                <h4 className="font-bold text-sm">Scheduled Reminders</h4>
                                <p className="text-xs text-muted-foreground">Upcoming scheduled posts</p>
                            </div>
                            <Switch
                                checked={notifications.scheduled}
                                onChange={(v) => setNotifications({ ...notifications, scheduled: v })}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/10 border border-border/40">
                            <div>
                                <h4 className="font-bold text-sm">Engagement Alerts</h4>
                                <p className="text-xs text-muted-foreground">High-performing posts</p>
                            </div>
                            <Switch
                                checked={notifications.engagement}
                                onChange={(v) => setNotifications({ ...notifications, engagement: v })}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

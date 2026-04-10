"use client";

import { useState, useEffect } from "react";
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
    Languages,
    Lock,
    LogOut
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useUser } from "@/context/UserContext";

interface SettingsFormProps {
    user: any; // Initial user data from server
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

export function SettingsForm({ user: initialUser }: SettingsFormProps) {
    const { user, isPro, refreshUser } = useUser();
    const [name, setName] = useState(initialUser?.name || "");

    // Use context user if available, otherwise fallback to initialUser
    const activeUser = user || initialUser;

    // Initialize writingStyles based on activeUser
    const [writingStyles, setWritingStyles] = useState<Array<{ name: string; sample: string }>>([]);
    const [currentStyleIndex, setCurrentStyleIndex] = useState(0);

    useEffect(() => {
        if (activeUser?.writingStyles) {
            const styles = Array.isArray(activeUser.writingStyles) && activeUser.writingStyles.length > 0
                ? activeUser.writingStyles
                : [{ name: "", sample: "" }];
            
            // If free, strictly limit to 1
            setWritingStyles(isPro ? styles : [styles[0]]);
        }
    }, [activeUser, isPro]);

    const [tone, setTone] = useState(activeUser?.defaultTone || "Professional");
    const [autoHashtags, setAutoHashtags] = useState(true);
    const [smartScheduling, setSmartScheduling] = useState(true);
    const [notifications, setNotifications] = useState({
        success: true,
        scheduled: true,
        engagement: false,
    });

    const [aboutYou, setAboutYou] = useState(activeUser?.aboutYou || "");
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
            if (field === 'aboutYou') body.aboutYou = aboutYou;

            const response = await fetch("/api/user/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                setIsSaved(true);
                setTimeout(() => setIsSaved(false), 2000);
                await refreshUser();
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
                                value={activeUser?.email || ""}
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
                                Slot {currentStyleIndex + 1}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    if (!isPro) {
                                        router.push("/pricing");
                                        return;
                                    }
                                    if (currentStyleIndex === writingStyles.length - 1) {
                                        setWritingStyles([...writingStyles, { name: "", sample: "" }]);
                                    }
                                    setCurrentStyleIndex(prev => prev + 1);
                                }}
                                className="h-6 w-6 p-0"
                            >
                                {isPro ? (
                                    <ChevronRight className="w-4 h-4" />
                                ) : (
                                    <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {!isPro && (
                            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Lock className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="text-xs font-bold text-foreground">Pro Feature</div>
                                        <div className="text-[11px] text-muted-foreground">Unlimited writing style slots are exclusive to Pro members.</div>
                                    </div>
                                </div>
                                <Link href="/pricing" className="shrink-0">
                                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold px-3 rounded-lg bg-background">
                                        Unlock Pro
                                    </Button>
                                </Link>
                            </div>
                        )}

                        <p className="text-sm text-muted-foreground">
                            {isPro 
                                ? "Pro Member: Save unlimited writing styles. New slots are created as you need them."
                                : "Free Plan: You are limited to 1 writing style slot."}
                        </p>

                        <div className="space-y-3">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Style Name</label>
                                <Input
                                    value={writingStyles[currentStyleIndex]?.name || ""}
                                    onChange={(e) => updateWritingStyle(currentStyleIndex, 'name', e.target.value)}
                                    placeholder={`e.g., "Personal", "Bold", "Thoughtful"`}
                                    className="h-12 rounded-xl border-border/80"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Writing Sample</label>
                                    <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                                        {writingStyles[currentStyleIndex]?.sample?.length || 0} chars
                                    </span>
                                </div>
                                <div className="relative group">
                                    <TextareaAutosize
                                        minRows={8}
                                        value={writingStyles[currentStyleIndex]?.sample || ""}
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

            {/* Personalize AI Card (Global Context) */}
            <div className="bg-card border border-border/60 rounded-[24px] shadow-sm overflow-hidden">
                <div className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Personalize your AI</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">About You (Global Context)</label>
                            <p className="text-xs text-muted-foreground">This helps the AI understand your background, niche, and company whenever it generates content for you.</p>
                            <div className="relative group">
                                <TextareaAutosize
                                    minRows={6}
                                    value={aboutYou}
                                    onChange={(e) => setAboutYou(e.target.value)}
                                    placeholder={`e.g., "I'm a founder building LinkMate, an AI-powered SaaS for LinkedIn growth. I write about startups, AI, and productivity."`}
                                    className="w-full resize-none text-base p-6 rounded-2xl bg-secondary/20 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground"
                                />
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <User className="w-4 h-4 text-primary/40" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button
                            onClick={() => handleSave('aboutYou')}
                            disabled={isSaving}
                            className="h-12 px-6 rounded-xl font-bold gap-2"
                        >
                            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            Save AI Context
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

            {/* Logout Section */}
            <div className="pt-8 border-t border-border/40">
                <Button 
                    variant="outline" 
                    className="h-12 px-6 rounded-xl font-bold gap-2 text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20"
                    onClick={() => signOut({ callbackUrl: "/" })}
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </Button>
            </div>
        </div>
    );
}

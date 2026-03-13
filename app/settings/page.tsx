export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConnectLinkedInButton } from "./linkedin/connect-button";
import { CheckCircle2, XCircle, ArrowRight, Zap, Shield, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils"; // Added this import for 'cn'

export default async function SettingsPage() {
    const session = await auth();

    if (!session?.user?.email) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
                <p className="text-muted-foreground font-light text-xl">Access denied.</p>
                <Link href="/login">
                    <Button variant="outline">Sign in</Button>
                </Link>
            </div>
        );
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            accounts: {
                where: { provider: "linkedin" }
            }
        }
    });

    const isConnected = !!(user?.accounts && user.accounts.some(a => a.access_token));
    const userPlan = user?.plan || "free";

    return (
        <div className="max-w-4xl mx-auto py-8 md:py-12 px-4 md:px-6 space-y-12">
            <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Settings</h1>
                <p className="text-muted-foreground text-lg">Manage your account and preferences</p>
            </div>

            <div className="space-y-8">
                {/* LinkedIn Connection Section - Keeping existing logic but refining style */}
                <div className="bg-card border border-border/60 rounded-[24px] overflow-hidden shadow-sm">
                    <div className="p-6 md:p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Integrations</h3>
                            {isConnected ? (
                                <div className="flex items-center gap-1.5 text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Active
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-muted-foreground bg-secondary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                    <XCircle className="w-3.5 h-3.5" />
                                    Inactive
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pr-2 md:pr-0">
                            <div className="space-y-2 text-center md:text-left">
                                <h4 className="text-xl font-bold">LinkedIn Profile</h4>
                                <p className="text-muted-foreground text-sm max-w-sm">
                                    {isConnected
                                        ? "Your account is connected and ready to publish."
                                        : "Connect your profile to start automating your LinkedIn presence."}
                                </p>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto justify-center md:justify-end">
                                <div className="flex-1 md:w-auto">
                                    <ConnectLinkedInButton isConnected={isConnected} />
                                </div>
                                {isConnected && (
                                    <Link href="/settings/linkedin" className="shrink-0">
                                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-border/80">
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subscription Section */}
                <div className="bg-card border border-border/60 rounded-[32px] overflow-hidden shadow-sm">
                    <div className="p-8 md:p-10 space-y-10">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Subscription</h3>
                                <h4 className="text-2xl font-bold">Manage your plan</h4>
                            </div>
                            <div className={cn(
                                "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm border",
                                userPlan?.toUpperCase() === "PRO" 
                                    ? "text-blue-600 bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800" 
                                    : "text-zinc-600 bg-zinc-100 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-700 dark:border-zinc-700"
                            )}>
                                {userPlan?.toUpperCase() === "PRO" ? <Zap className="w-3.5 h-3.5 fill-current" /> : <Shield className="w-3.5 h-3.5" />}
                                {userPlan?.toUpperCase() === "PRO" ? "Pro Member" : "Free Plan"}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 pt-2">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <h5 className="text-sm font-bold text-foreground">Current Plan Details</h5>
                                    <p className="text-sm text-muted-foreground">
                                        {userPlan?.toUpperCase() === "PRO" 
                                            ? "You have full access to all premium Linkmate automation features."
                                            : "You are currently using the limited free version of Linkmate."}
                                    </p>
                                </div>
                                
                                <ul className="space-y-3">
                                    {[
                                        { text: userPlan?.toUpperCase() === "PRO" ? "Unlimited AI Generations" : "2 AI generations per day", included: true },
                                        { text: userPlan?.toUpperCase() === "PRO" ? "Unlimited Scheduled Posts" : "10 scheduled posts per month", included: true },
                                        { text: userPlan?.toUpperCase() === "PRO" ? "Unlimited Writing Styles" : "1 writing style slot", included: true },
                                        { text: "Autopilot Automation", included: userPlan?.toUpperCase() === "PRO" },
                                    ].map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm">
                                            <div className={cn(
                                                "p-0.5 rounded-full",
                                                feature.included ? "text-primary bg-primary/10" : "text-muted-foreground bg-secondary"
                                            )}>
                                                {feature.included ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                            </div>
                                            <span className={feature.included ? "text-foreground font-medium" : "text-muted-foreground/60"}>
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-primary/[0.03] rounded-2xl p-6 border border-primary/10 flex flex-col justify-between gap-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                                        <Sparkles className="w-4 h-4" />
                                        {userPlan?.toUpperCase() === "PRO" ? "Pro Benefits" : "Unlock Pro"}
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {userPlan?.toUpperCase() === "PRO"
                                            ? "Your LinkedIn performance is being optimized by our advanced AI. Keep growing!"
                                            : "Professional creators use Pro to save 10+ hours a week with Autopilot and unlimited generation."}
                                    </p>
                                </div>
                                <Link href="/pricing" className="w-full">
                                    <Button 
                                        className={cn(
                                            "h-12 px-6 rounded-xl font-bold w-full shadow-lg transition-all",
                                            userPlan?.toUpperCase() === "PRO" 
                                                ? "bg-secondary text-foreground hover:bg-secondary/80" 
                                                : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                                        )}
                                        variant={userPlan?.toUpperCase() === "PRO" ? "secondary" : "primary"}
                                    >
                                        {userPlan?.toUpperCase() === "PRO" ? "View Pricing Details" : "Upgrade to Pro"}
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Settings Form */}
                <SettingsForm user={user} />
            </div>
        </div>
    );
}

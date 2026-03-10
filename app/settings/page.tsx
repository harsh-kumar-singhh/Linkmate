export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConnectLinkedInButton } from "./linkedin/connect-button";
import { CheckCircle2, XCircle, ArrowRight, Zap, Shield } from "lucide-react";
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
                <div className="bg-card border border-border/60 rounded-[24px] overflow-hidden shadow-sm">
                    <div className="p-6 md:p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Subscription</h3>
                            <div className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5",
                                userPlan === "pro" 
                                    ? "text-blue-600 bg-blue-100 dark:bg-blue-900/30" 
                                    : "text-zinc-600 bg-zinc-100 dark:bg-zinc-800/50 dark:text-zinc-400"
                            )}>
                                {userPlan === "pro" ? <Zap className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                                {userPlan}
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pr-2 md:pr-0">
                            <div className="space-y-2 text-center md:text-left">
                                <h4 className="text-xl font-bold">
                                    {userPlan === "pro" ? "You're a Pro Creator" : "Linkmate Free"}
                                </h4>
                                <p className="text-muted-foreground text-sm max-w-sm">
                                    {userPlan === "pro"
                                        ? "Enjoy unlimited AI generation, scheduling, and autopilot mode."
                                        : "Get started with basic scheduling and AI generation limits."}
                                </p>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto justify-center md:justify-end">
                                <Link href="/pricing" className="w-full md:w-auto">
                                    <Button 
                                        className={cn(
                                            "h-12 px-6 rounded-xl font-bold w-full md:w-auto",
                                            userPlan !== "pro" ? "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 text-white" : "border-border/80"
                                        )}
                                        variant={userPlan === "pro" ? "outline" : undefined}
                                    >
                                        {userPlan === "pro" ? "View Plan Details" : "Upgrade to Pro"}
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

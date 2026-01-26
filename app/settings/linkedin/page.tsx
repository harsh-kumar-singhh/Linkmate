export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { ConnectLinkedInButton } from "./connect-button";
import { CheckCircle2, XCircle, ArrowRight, LayoutDashboard, Sparkles, Calendar, Zap, ShieldCheck, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RefreshTrigger } from "./refresh-trigger";

export default async function LinkedInSettingsPage() {
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
        where: { id: session.user.id },
        include: {
            accounts: {
                where: { provider: "linkedin" },
                select: { access_token: true }
            }
        }
    });

    const isConnected = !!(user?.accounts && user.accounts.length > 0 && user.accounts[0].access_token);

    return (
        <div className="max-w-5xl mx-auto py-12 px-8 space-y-16 mt-8">
            <RefreshTrigger />
            <div className="space-y-2">
                <h1 className="text-[12px] font-bold tracking-[0.2em] text-muted-foreground uppercase">Integration</h1>
                <h2 className="text-4xl font-bold tracking-tight text-foreground">LinkedIn Connectivity</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Status Column */}
                <div className="lg:col-span-7 space-y-12">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Connection Status</h3>
                            <div className="h-px flex-1 bg-border mx-6 opacity-50" />
                        </div>

                        <div className="bg-secondary/30 rounded-[40px] p-10 space-y-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    {isConnected ? (
                                        <div className="w-16 h-16 rounded-[20px] bg-primary/10 flex items-center justify-center text-primary">
                                            <ShieldCheck className="w-8 h-8" />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-[20px] bg-secondary flex items-center justify-center text-muted-foreground">
                                            <Zap className="w-8 h-8" />
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <h4 className="text-2xl font-bold tracking-tight">
                                            {isConnected ? "Securely Linked" : "Awaiting Connection"}
                                        </h4>
                                        <p className="text-muted-foreground font-light">
                                            {isConnected
                                                ? "Linkmate is authorized to broadcast your thoughts."
                                                : "Link your identity to enable automated distribution."}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <ConnectLinkedInButton isConnected={isConnected} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Protocol</h3>
                            <div className="h-px flex-1 bg-border mx-6 opacity-50" />
                        </div>

                        <div className="px-1 text-muted-foreground text-lg font-light leading-relaxed max-w-2xl">
                            We utilize the LinkedIn OAuth 2.0 protocol for maximum security. Linkmate never stores your password—it only maintains an encrypted token to interact with your identity.
                        </div>
                    </div>
                </div>

                {/* Benefits Column */}
                <div className="lg:col-span-5 space-y-8">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Advantages</h3>
                    </div>

                    <div className="space-y-4">
                        {[
                            { icon: Zap, title: "Autonomous Release", desc: "Publishing happens while you focus on deeper work." },
                            { icon: BarChart3, title: "Frictionless Feedback", desc: "Engagement signals piped directly to your dashboard." },
                            { icon: ShieldCheck, title: "Enterprise Security", desc: "Verified OAuth flow with zero credential persistence." }
                        ].map((item, i) => (
                            <div key={i} className="group p-6 rounded-3xl border border-border bg-site-bg hover:bg-secondary/20 transition-all duration-500">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 transition-all">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <h5 className="font-bold tracking-tight text-site-fg">{item.title}</h5>
                                        <p className="text-sm text-muted-foreground font-light leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* How it Works */}
            <div className="space-y-8 pt-8">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">The Pipeline</h3>
                    <div className="h-px flex-1 bg-border mx-6 opacity-50" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { icon: Sparkles, step: "01", title: "Refiner", text: "Draft with AI matched to your unique writing signature." },
                        { icon: Calendar, step: "02", title: "Schedule", text: "Select the optimal cadence for your audience." },
                        { icon: LayoutDashboard, step: "03", title: "Verify", text: "Track progression and resonance in real-time." }
                    ].map((item, i) => (
                        <div key={i} className="relative p-10 rounded-[40px] bg-secondary/10 border border-border group overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 text-4xl font-black text-foreground/5">{item.step}</div>
                            <item.icon className="w-10 h-10 text-primary mb-6" />
                            <h4 className="text-xl font-bold tracking-tight mb-3">{item.title}</h4>
                            <p className="text-muted-foreground font-light leading-relaxed">{item.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { SettingsForm } from "./settings-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConnectLinkedInButton } from "./linkedin/connect-button";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";

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

    return (
        <div className="max-w-4xl mx-auto py-12 px-6 space-y-16 mt-8">
            <div className="space-y-2">
                <h1 className="text-[12px] font-bold tracking-[0.2em] text-muted-foreground uppercase">Configuration</h1>
                <h2 className="text-4xl font-bold tracking-tight text-foreground">Workspace Settings</h2>
            </div>

            <div className="space-y-12">
                {/* LinkedIn Connection Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Integrations</h3>
                        <div className="h-px flex-1 bg-border mx-6 opacity-50" />
                    </div>

                    <div className="bg-secondary/30 rounded-[32px] p-10 space-y-8">
                        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
                            <div className="space-y-4 max-w-md">
                                <div className="flex items-center gap-3">
                                    <h4 className="text-2xl font-bold tracking-tight">LinkedIn</h4>
                                    {isConnected ? (
                                        <div className="flex items-center gap-1.5 text-blue-600 bg-blue-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
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
                                <p className="text-muted-foreground text-lg font-light leading-relaxed">
                                    {isConnected
                                        ? "Your identity is linked. Linkmate is ready to broadcast."
                                        : "Connect your profile to start automating your presence with Linkmate."}
                                </p>
                            </div>

                            <div className="flex gap-4 w-full md:w-auto">
                                <div className="flex-1 md:w-auto">
                                    <ConnectLinkedInButton isConnected={isConnected} />
                                </div>
                                {isConnected && (
                                    <Link href="/settings/linkedin">
                                        <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-background shadow-sm hover:shadow-md transition-all">
                                            <ArrowRight className="w-5 h-5" />
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Personalization</h3>
                        <div className="h-px flex-1 bg-border mx-6 opacity-50" />
                    </div>

                    <div className="bg-site-bg border border-border rounded-[40px] shadow-premium shadow-blue-600/5 overflow-hidden transition-all duration-500 relative group">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                        <div className="p-10 border-b border-border bg-secondary/10">
                            <h4 className="text-2xl font-bold tracking-tight text-blue-600">Writing Signature</h4>
                            <p className="text-muted-foreground text-lg font-light mt-2 max-w-xl leading-relaxed">
                                Linkmate learns from your best work. Refine your digital twin here.
                            </p>
                        </div>

                        <div className="p-10">
                            <SettingsForm initialWritingStyle={user?.writingStyle || ""} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

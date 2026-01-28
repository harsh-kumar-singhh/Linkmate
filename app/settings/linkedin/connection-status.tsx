"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ShieldCheck, Zap, Loader2 } from "lucide-react";
import { ConnectLinkedInButton } from "./connect-button";

interface LinkedInConnectionStatusProps {
    initialIsConnected: boolean;
}

export function LinkedInConnectionStatus({ initialIsConnected }: LinkedInConnectionStatusProps) {
    const [isConnected, setIsConnected] = useState(initialIsConnected);
    const [isVerifying, setIsVerifying] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const success = searchParams.get("success");

        if (success === "true" && !isConnected) {
            setIsVerifying(true);

            // Give the server a moment to settle, then verify
            // In the new architecture, the server has already written to the User table
            // so this check should be immediate and reliable.
            fetch("/api/user/me", {
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.user?.isConnected) {
                        setIsConnected(true);
                        router.refresh();
                    }
                })
                .finally(() => {
                    setIsVerifying(false);
                });
        }
    }, [searchParams, isConnected, router]);

    // Sync with server state if it changes
    useEffect(() => {
        if (initialIsConnected) {
            setIsConnected(true);
        }
    }, [initialIsConnected]);

    return (
        <div className="bg-secondary/30 rounded-[40px] p-10 space-y-8">
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    {isConnected ? (
                        <div className="w-16 h-16 rounded-[20px] bg-primary/10 flex items-center justify-center text-primary">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-[20px] bg-secondary flex items-center justify-center text-muted-foreground">
                            {isVerifying ? (
                                <Loader2 className="w-8 h-8 animate-spin" />
                            ) : (
                                <Zap className="w-8 h-8" />
                            )}
                        </div>
                    )}
                    <div className="space-y-1">
                        <h4 className="text-2xl font-bold tracking-tight">
                            {isConnected
                                ? "Securely Linked"
                                : isVerifying
                                    ? "Verifying Connection..."
                                    : "Awaiting Connection"}
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
    );
}

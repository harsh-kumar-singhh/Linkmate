"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ShieldCheck, Zap } from "lucide-react";
import { ConnectLinkedInButton } from "./connect-button";

interface LinkedInConnectionStatusProps {
    initialIsConnected: boolean;
}

export function LinkedInConnectionStatus({ initialIsConnected }: LinkedInConnectionStatusProps) {
    const [isConnected, setIsConnected] = useState(initialIsConnected);
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const success = searchParams.get("success");
        if (success === "true") {
            // Verification logic: fetch the latest user state to confirm connection
            fetch("/api/user/me", {
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache"
                }
            })
                .then((res) => {
                    if (!res.ok) throw new Error("Failed to fetch user data");
                    return res.json();
                })
                .then((data) => {
                    if (data.user?.isConnected) {
                        setIsConnected(true);
                        // Clean up the URL only after confirming connection
                        const newUrl = window.location.pathname;
                        window.history.replaceState({}, "", newUrl);
                        // Optional: Refresh the server components too so other parts of the app know
                        router.refresh();
                    }
                })
                .catch((err) => {
                    console.error("Failed to verify LinkedIn status:", err);
                });
        }
    }, [searchParams, router]);

    // Update local state if the server prop changes (e.g. after router.refresh())
    useEffect(() => {
        setIsConnected(initialIsConnected);
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
    );
}

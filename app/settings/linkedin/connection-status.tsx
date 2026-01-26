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
    // Track when we last verified a connection successfully on the client
    const [lastVerifiedTime, setLastVerifiedTime] = useState<number>(0);

    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const success = searchParams.get("success");

        if (success === "true") {
            setIsVerifying(true);

            fetch("/api/user/me", {
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache"
                }
            })
                .then((res) => {
                    if (!res.ok) throw new Error("Failed to fetch user data");
                    return res.json();
                })
                .then((data) => {
                    if (data.user?.isConnected) {
                        setIsConnected(true);
                        setLastVerifiedTime(Date.now());

                        const newUrl = window.location.pathname;
                        window.history.replaceState({}, "", newUrl);

                        router.refresh();
                    }
                })
                .catch((err) => {
                    console.error("Failed to verify LinkedIn status:", err);
                })
                .finally(() => {
                    setIsVerifying(false);
                });
        }
    }, [searchParams, router]);

    // React to server prop updates, but gracefully handle race conditions
    useEffect(() => {
        if (initialIsConnected) {
            // Server agrees we are connected. Sync state.
            setIsConnected(true);
        } else {
            // Server says NOT connected.
            // Check if we just verified a connection locally within the last 5 seconds.
            // If so, the server prop might be stale (race condition), so we ignore it.
            const timeSinceVerification = Date.now() - lastVerifiedTime;
            const isJustVerified = lastVerifiedTime > 0 && timeSinceVerification < 5000;

            if (!isJustVerified) {
                setIsConnected(false);
            }
        }
    }, [initialIsConnected, lastVerifiedTime]);

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

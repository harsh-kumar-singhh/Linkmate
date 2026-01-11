"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Linkedin, LogOut, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConnectLinkedInButton({ isConnected }: { isConnected: boolean }) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleDisconnect = async () => {
        if (!confirm("Are you sure you want to disconnect your LinkedIn account?")) return;

        setIsLoading(true);
        try {
            const response = await fetch("/api/auth/disconnect/linkedin", { method: "POST" });
            if (response.ok) {
                router.refresh();
            }
        } catch (error) {
            console.error("Disconnect failed", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isConnected) {
        return (
            <div className="space-y-3">
                <Button variant="outline" className="w-full bg-slate-50 dark:bg-slate-800/50 border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400" disabled>
                    <Linkedin className="w-4 h-4 mr-2" />
                    Account Connected
                </Button>
                <Button
                    variant="ghost"
                    className="w-full text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    onClick={handleDisconnect}
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                    Disconnect Account
                </Button>
            </div>
        )
    }

    return (
        <Button
            onClick={() => signIn("linkedin")}
            className="w-full bg-linkedin-blue hover:bg-linkedin-dark text-white font-semibold py-6 shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
        >
            <Linkedin className="w-5 h-5 mr-2" />
            Connect LinkedIn Account
        </Button>
    );
}

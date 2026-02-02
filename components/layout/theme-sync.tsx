"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";

export function ThemeSync() {
    const { setTheme, theme } = useTheme();
    const { data: session, status } = useSession();

    useEffect(() => {
        // Only run once when session is first authenticated
        if (status === "authenticated" && session?.user?.email) {
            const hasSynced = sessionStorage.getItem("theme_synced");
            if (hasSynced) return;

            const fetchTheme = async () => {
                try {
                    const res = await fetch("/api/user/me");
                    if (res.ok) {
                        const data = await res.json();
                        // Only apply server theme if it's explicitly set and different
                        if (data.user?.theme && data.user.theme !== "system") {
                            setTheme(data.user.theme);
                        }
                        sessionStorage.setItem("theme_synced", "true");
                    }
                } catch (error) {
                    console.error("Failed to sync theme from DB:", error);
                }
            };
            fetchTheme();
        }
    }, [status, session]); // Keep deps but guard inside with sessionStorage checks

    return null;
}

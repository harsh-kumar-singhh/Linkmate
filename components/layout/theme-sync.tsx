"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";

export function ThemeSync() {
    const { setTheme } = useTheme();
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === "authenticated" && session?.user?.email) {
            const fetchTheme = async () => {
                try {
                    const res = await fetch("/api/user/me");
                    if (res.ok) {
                        const data = await res.json();
                        if (data.user?.theme) {
                            setTheme(data.user.theme);
                        }
                    }
                } catch (error) {
                    console.error("Failed to sync theme from DB:", error);
                }
            };
            fetchTheme();
        }
    }, [status, session, setTheme]);

    return null;
}

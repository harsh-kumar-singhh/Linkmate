"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function RefreshTrigger() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const refreshedRef = useRef(false);

    useEffect(() => {
        const success = searchParams.get("success");

        if (success === "true" && !refreshedRef.current) {
            console.log("[LinkedIn] Connection success detected, refreshing state...");
            refreshedRef.current = true;
            router.refresh();

            // Optionally clean up the URL to prevent double refresh
            const newUrl = window.location.pathname;
            window.history.replaceState({}, "", newUrl);
        }
    }, [searchParams, router]);

    return null;
}

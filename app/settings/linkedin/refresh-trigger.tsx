"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RefreshTriggerContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const refreshedRef = useRef(false);

    const success = searchParams.get("success");

    useEffect(() => {
        if (success === "true" && !refreshedRef.current) {
            console.log("[LinkedIn] Connection success detected, refreshing state...");
            refreshedRef.current = true;
            router.refresh();

            // Optionally clean up the URL to prevent double refresh
            const newUrl = window.location.pathname;
            window.history.replaceState({}, "", newUrl);
        }
    }, [success, router]);

    return null;
}

export function RefreshTrigger() {
    return (
        <Suspense fallback={null}>
            <RefreshTriggerContent />
        </Suspense>
    );
}

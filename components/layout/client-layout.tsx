"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { useSession } from "next-auth/react";
import { AnimatedCard } from "@/components/animated/AnimatedCard";

import { DashboardHeader } from "./header";

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data: session } = useSession();

    // Define paths where sidebar should NOT be visible
    const publicPaths = ["/", "/auth/signin", "/login", "/signup", "/api/auth/signin"];
    const isPublicPath = publicPaths.includes(pathname || "") || pathname?.startsWith("/auth");

    // Show sidebar if user is authenticated and not on a public path
    // Or just check if not on public path to allow sidebar on dashboard routes
    const showSidebar = !isPublicPath;

    if (showSidebar) {
        return (
            <div className="flex h-screen bg-slate-50 dark:bg-[#020617] transition-colors duration-300">
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <DashboardHeader />
                    <main className="flex-1 overflow-y-auto p-8">
                        <AnimatedCard
                            animation="slide-up"
                            key={typeof window !== 'undefined' ? window.location.pathname : 'initial'}
                        >
                            {children}
                        </AnimatedCard>
                    </main>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

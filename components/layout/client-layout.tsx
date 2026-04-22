"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { useSession } from "next-auth/react";
import { AnimatedCard } from "@/components/animated/AnimatedCard";

import { DashboardHeader } from "./header";
import { UpgradeBanner } from "@/components/upgrade/UpgradeBanner";
import { TrialModal } from "@/components/upgrade/TrialModal";
import { LockedFeatureModal } from "@/components/upgrade/LockedFeatureModal";
import { UpgradeSuccessModal } from "@/components/upgrade/UpgradeSuccessModal";
import { DatabaseStatus } from "@/components/shared/database-status";

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
            <div className="flex h-screen bg-white dark:bg-[#09090b] transition-colors duration-300">
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-16 md:pb-0">
                    <UpgradeBanner />
                    <DashboardHeader />
                    <main className="flex-1 overflow-y-auto overflow-x-hidden p-0 md:p-8">
                        <AnimatedCard
                            animation="slide-up"
                        >
                            {children}
                        </AnimatedCard>
                    </main>
                    <MobileNav />
                    <TrialModal />
                    <LockedFeatureModal />
                    <UpgradeSuccessModal />
                    <DatabaseStatus />
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Banner removed from homepage as requested */}
            {children}
            {pathname === "/" && (
                <>
                    <TrialModal />
                    <LockedFeatureModal />
                    <UpgradeSuccessModal />
                </>
            )}
        </>
    );
}

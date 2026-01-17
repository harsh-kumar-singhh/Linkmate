"use client"

import { useSession } from "next-auth/react"
import { Bell, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { MobileNav } from "./mobile-nav"

export function DashboardHeader() {
    const { data: session } = useSession()

    return (
        <header className="h-20 border-b border-border bg-site-bg px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 transition-colors">
            <div className="flex-1 flex items-center">
                <div className="md:hidden mr-4">
                    <MobileNav />
                </div>
                <div className="flex items-center gap-3 text-muted-foreground mr-8">
                    <span className="text-[10px] md:text-[12px] font-medium tracking-tight uppercase opacity-50">Workspace</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="text-[10px] md:text-[12px] font-medium tracking-tight text-site-fg truncate max-w-[100px] md:max-w-none">
                        {session?.user?.name || "Member"}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <ModeToggle />

                <div className="h-6 w-px bg-border mx-2" />

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-[12px] font-bold tracking-tight text-site-fg leading-none">
                            {session?.user?.name || "User"}
                        </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-[11px] font-bold text-site-fg">
                        {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || "U"}
                    </div>
                </div>
            </div>
        </header>
    )
}

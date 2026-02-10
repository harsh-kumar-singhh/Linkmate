"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, PenSquare, Calendar, BarChart2, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatedCard } from "@/components/animated/AnimatedCard"

export function MobileNav() {
    const pathname = usePathname()

    const links = [
        {
            href: "/dashboard",
            label: "Home",
            icon: Home,
            match: (path: string) => path === "/dashboard"
        },
        {
            href: "/posts/new",
            label: "Create",
            icon: PenSquare,
            match: (path: string) => path === "/posts/new" || path === "/create"
        },
        {
            href: "/calendar",
            label: "Calendar",
            icon: Calendar,
            match: (path: string) => path.startsWith("/calendar")
        },
        {
            href: "/activity",
            label: "Activity",
            icon: BarChart2,
            match: (path: string) => path === "/activity"
        },
        {
            href: "/settings",
            label: "Settings",
            icon: Settings,
            match: (path: string) => path.startsWith("/settings")
        },
    ]

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-lg border-t border-border pb-safe transition-all duration-300">
            <nav className="flex items-center justify-around h-16">
                {links.map((link) => {
                    const Icon = link.icon
                    const isActive = link.match(pathname || "")

                    return (
                        <Link
                            key={link.label}
                            href={link.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors relative",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {isActive && (
                                <AnimatedCard
                                    animation="none"
                                    layoutId="mobile-nav-indicator"
                                    className="absolute top-0 w-12 h-0.5 bg-primary rounded-full"
                                />
                            )}
                            <Icon className={cn("w-6 h-6", isActive && "animate-in zoom-in-50 duration-200")} />
                            <span className="text-[10px] font-medium tracking-tight">
                                {link.label}
                            </span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}

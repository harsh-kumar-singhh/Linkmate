"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { LayoutDashboard, PenSquare, Calendar, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

export function Sidebar() {
    const pathname = usePathname()

    const links = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/posts/new", label: "Create Post", icon: PenSquare },
        { href: "/calendar", label: "Calendar", icon: Calendar },
        { href: "/settings", label: "Settings", icon: Settings },
    ]

    return (
        <motion.aside
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="hidden md:flex flex-col w-64 border-r border-border bg-site-bg h-screen sticky top-0 transition-colors"
        >
            <div className="p-8 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-12 relative group">
                    <span className="font-bold text-xl tracking-tight uppercase">Linkmate</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 absolute -right-3 top-1 animate-pulse" />
                </div>

                <nav className="space-y-1 flex-1">
                    {links.map((link) => {
                        const Icon = link.icon
                        const isActive = pathname === link.href
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-4 px-4 py-3 rounded-lg text-[13px] font-medium transition-all duration-300 group relative overflow-hidden",
                                    isActive
                                        ? "bg-blue-100 text-blue-600"
                                        : "text-muted-foreground hover:text-site-fg hover:bg-secondary/50"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="active-border"
                                        className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-600"
                                    />
                                )}
                                <Icon className={cn("w-4.5 h-4.5 transition-colors", isActive ? "text-blue-600" : "text-muted-foreground group-hover:text-site-fg")} />
                                {link.label}
                                {isActive && (
                                    <motion.div
                                        layoutId="active-dot"
                                        className="ml-auto w-1 h-1 bg-primary rounded-full"
                                    />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                <div className="mt-auto">
                    <button className="flex items-center gap-4 px-4 py-3 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all w-full group">
                        <LogOut className="w-4.5 h-4.5" />
                        Sign Out
                    </button>
                </div>
            </div>
        </motion.aside>
    )
}

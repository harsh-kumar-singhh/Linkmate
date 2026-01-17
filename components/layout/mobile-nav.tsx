"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, PenSquare, Calendar, Settings, LogOut, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"

export function MobileNav() {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()

    const links = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/posts/new", label: "Create Post", icon: PenSquare },
        { href: "/calendar", label: "Calendar", icon: Calendar },
        { href: "/settings", label: "Settings", icon: Settings },
    ]

    return (
        <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} className="rounded-full">
                <Menu className="w-6 h-6" />
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            {...({
                                initial: { opacity: 0 },
                                animate: { opacity: 1 },
                                exit: { opacity: 0 }
                            } as any)}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            {...({
                                initial: { x: "100%" },
                                animate: { x: 0 },
                                exit: { x: "100%" },
                                transition: { type: "spring", damping: 25, stiffness: 200 }
                            } as any)}
                            className="fixed right-0 top-0 bottom-0 w-[280px] bg-card border-l border-border z-50 p-6 flex flex-col shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <span className="font-bold text-xl tracking-tight uppercase">Linkmate</span>
                                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                                    <X className="w-6 h-6" />
                                </Button>
                            </div>

                            <nav className="space-y-1 flex-1">
                                {links.map((link) => {
                                    const Icon = link.icon
                                    const isActive = pathname === link.href
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setIsOpen(false)}
                                            className={cn(
                                                "flex items-center gap-4 px-4 py-4 rounded-xl text-[15px] font-medium transition-all duration-300",
                                                isActive
                                                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                                    : "text-muted-foreground hover:text-site-fg hover:bg-secondary/50"
                                            )}
                                        >
                                            <Icon className="w-5 h-5" />
                                            {link.label}
                                        </Link>
                                    )
                                })}
                            </nav>

                            <div className="mt-auto">
                                <button className="flex items-center gap-4 px-4 py-4 rounded-xl text-[15px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all w-full group">
                                    <LogOut className="w-5 h-5" />
                                    Sign Out
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

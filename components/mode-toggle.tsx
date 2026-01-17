"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function ModeToggle() {
    const { setTheme, theme } = useTheme()
    const { status } = useSession()

    const toggleTheme = async () => {
        const newTheme = theme === "light" ? "dark" : "light"
        setTheme(newTheme)

        if (status === "authenticated") {
            try {
                await fetch("/api/user/theme", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ theme: newTheme })
                })
            } catch (error) {
                console.error("Failed to persist theme:", error)
            }
        }
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full w-9 h-9 transition-all duration-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}

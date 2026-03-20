"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import { UserProvider } from "@/context/UserContext"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
        <UserProvider>{children}</UserProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}


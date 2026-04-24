"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "next-themes"
import { UserProvider } from "@/context/UserContext"
import { TrialTriggerProvider } from "@/context/TrialTriggerContext"
import { NotificationProvider } from "@/context/NotificationContext"
import { QueryProvider } from "@/components/providers/query-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
        <QueryProvider>
          <UserProvider>
            <TrialTriggerProvider>
              <NotificationProvider>
                {children}
              </NotificationProvider>
            </TrialTriggerProvider>
          </UserProvider>
        </QueryProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}


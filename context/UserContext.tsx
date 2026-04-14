"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

interface User {
    id: string;
    email: string;
    name: string;
    plan: string;
    writingStyles: any[];
    autopilotEnabled: boolean;
    autopilotTopics: string[];
    autopilotFrequency: string;
    autopilotDays: string[];
    autopilotTime: string;
    aboutYou?: string;
    autopilotCurrentFocus?: string;
    autopilotWritingStyleId?: string;
    defaultTone?: string;
    isConnected: boolean;
}

interface UserContextType {
    user: User | null;
    isPro: boolean;
    isLoading: boolean;
    isDatabaseWaking: boolean;
    refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDatabaseWaking, setIsDatabaseWaking] = useState(false);
    const isFetchingRef = React.useRef(false);

    const refreshUser = useCallback(async () => {
        if (status !== "authenticated" || isFetchingRef.current) return;
        
        isFetchingRef.current = true;
        try {
            const response = await fetch("/api/user/me");
            
            if (response.status === 503) {
                setIsDatabaseWaking(true);
                // Retry after a short delay if it's a cold start
                setTimeout(() => {
                    isFetchingRef.current = false;
                    refreshUser();
                }, 2000);
                return;
            }

            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    setUser(data.user);
                    setIsDatabaseWaking(false);
                }
            }
        } catch (error) {
            console.error("Failed to fetch user data:", error);
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, [status]);

    useEffect(() => {
        if (status === "authenticated") {
            refreshUser();
        } else if (status === "unauthenticated") {
            setUser(null);
            setIsLoading(false);
            setIsDatabaseWaking(false);
        }
    }, [status, refreshUser]);

    const isPro = user?.plan?.toUpperCase() === "PRO";

    const value = React.useMemo(() => ({
        user,
        isPro,
        isLoading,
        isDatabaseWaking,
        refreshUser
    }), [user, isPro, isLoading, isDatabaseWaking, refreshUser]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
}

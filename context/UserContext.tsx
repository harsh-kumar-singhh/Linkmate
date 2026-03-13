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
    defaultTone?: string;
    isConnected: boolean;
}

interface UserContextType {
    user: User | null;
    isPro: boolean;
    isLoading: boolean;
    refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        if (status !== "authenticated") return;
        
        try {
            const response = await fetch("/api/user/me");
            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    setUser(data.user);
                }
            }
        } catch (error) {
            console.error("Failed to fetch user data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [status]);

    useEffect(() => {
        if (status === "authenticated") {
            refreshUser();
        } else if (status === "unauthenticated") {
            setUser(null);
            setIsLoading(false);
        }
    }, [status, refreshUser]);

    const isPro = user?.plan?.toUpperCase() === "PRO";

    return (
        <UserContext.Provider value={{ user, isPro, isLoading, refreshUser }}>
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

"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
    const queryClient = useQueryClient();

    const { 
        data: user, 
        isLoading, 
        error 
    } = useQuery({
        queryKey: ["user"],
        queryFn: async () => {
            if (status !== "authenticated") return null;
            const response = await fetch("/api/user/me");
            if (!response.ok) {
                if (response.status === 503) throw new Error("WAKING_UP");
                throw new Error("UNAUTHORIZED");
            }
            const data = await response.json();
            return data.user as User;
        },
        enabled: status === "authenticated",
        staleTime: 10 * 60 * 1000, // 10 minutes cache
        gcTime: 15 * 60 * 1000,
        retry: (failureCount, error: any) => {
            if (error.message === "WAKING_UP") return failureCount < 5;
            return false;
        },
        retryDelay: (attempt) => Math.min(attempt * 2000, 10000),
    });

    const isDatabaseWaking = error instanceof Error && error.message === "WAKING_UP";

    const refreshUser = async () => {
        await queryClient.invalidateQueries({ queryKey: ["user"] });
    };

    const isPro = useMemo(() => user?.plan?.toUpperCase() === "PRO", [user?.plan]);

    const value = useMemo(() => ({
        user: user || null,
        isPro,
        isLoading: isLoading && status === "authenticated",
        isDatabaseWaking,
        refreshUser
    }), [user, isPro, isLoading, status, isDatabaseWaking]);

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

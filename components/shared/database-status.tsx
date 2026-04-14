"use client";

import { useUser } from "@/context/UserContext";
import { Loader2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function DatabaseStatus() {
  const { isDatabaseWaking } = useUser();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isDatabaseWaking) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isDatabaseWaking]);

  if (!isVisible && !isDatabaseWaking) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-[9999] p-4 rounded-2xl shadow-2xl transition-all duration-500 border backdrop-blur-xl flex items-center gap-3",
        isDatabaseWaking 
          ? "bg-amber-500/10 border-amber-500/20 translate-y-0 opacity-100" 
          : "bg-emerald-500/10 border-emerald-500/20 translate-y-2 opacity-0"
      )}
    >
      <div className="relative">
        {isDatabaseWaking ? (
          <div className="relative">
            <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
            <Zap className="w-2 h-2 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      
      <div className="flex flex-col">
        <span className={cn(
          "text-sm font-semibold tracking-tight",
          isDatabaseWaking ? "text-amber-500" : "text-emerald-500"
        )}>
          {isDatabaseWaking ? "Waking up servers..." : "Database is ready"}
        </span>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">
          {isDatabaseWaking ? "Just a sec ⚡" : "Connected"}
        </span>
      </div>
    </div>
  );
}

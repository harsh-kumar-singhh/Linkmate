"use client";

import { useUser } from "@/context/UserContext";
import { Sparkles, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function UpgradeBanner() {
  const { user, isPro } = useUser();
  const [isVisible, setIsVisible] = useState(true);

  if (isPro || !user || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="w-full bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-primary/20 relative z-50 overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1">
               <span className="text-lg">🎁</span>
            </div>
            <p className="text-sm font-medium text-foreground">
              Linkmate Pro is <span className="text-primary font-bold">free</span> for limited early users.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/upgrade">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm">
                Activate Now
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
            <button 
              onClick={() => setIsVisible(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

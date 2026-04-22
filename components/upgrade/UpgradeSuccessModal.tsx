"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2, Rocket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function UpgradeSuccessModalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("trial_activated") === "true") {
      setIsOpen(true);
      // Clean up the URL
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("trial_activated");
      const newUrl = `${window.location.pathname}${newParams.toString() ? "?" + newParams.toString() : ""}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, [searchParams]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none bg-site-bg">
        <div className="relative p-8 pt-12">
          {/* Success Background Glow */}
          <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative space-y-6 text-center"
          >
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner relative">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                >
                  <CheckCircle2 className="w-10 h-10" />
                </motion.div>
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-2 border-dashed border-emerald-500/20 rounded-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <DialogTitle className="text-3xl font-black tracking-tight">
                Welcome to Pro!
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-[16px] leading-relaxed">
                Your plan has been updated to <span className="text-primary font-bold">Linkmate Pro</span>. You&apos;ll enjoy all premium features for <span className="text-foreground font-bold">free for the next 30 days</span>.
              </DialogDescription>
            </div>

            <div className="bg-secondary/20 rounded-2xl p-4 border border-border/40 flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0 shadow-sm">
                <Rocket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">What&apos;s next?</p>
                <p className="text-sm font-medium">Start creating unlimited content and schedule your entire month!</p>
              </div>
            </div>

            <Button 
              className="w-full h-14 rounded-xl text-lg font-black shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all"
              onClick={() => setIsOpen(false)}
            >
              Let&apos;s get started
            </Button>

            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">
              You are officially a premium creator
            </p>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function UpgradeSuccessModal() {
  return (
    <Suspense fallback={null}>
      <UpgradeSuccessModalContent />
    </Suspense>
  );
}

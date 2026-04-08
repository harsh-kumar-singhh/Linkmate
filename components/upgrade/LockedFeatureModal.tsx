"use client";

import { useTrialTrigger } from "@/context/TrialTriggerContext";
import { useUser } from "@/context/UserContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export function LockedFeatureModal() {
  const { showLockedModal, setShowLockedModal, lockedFeatureName } = useTrialTrigger();
  const { isPro } = useUser();

  if (isPro) return null;

  return (
    <Dialog open={showLockedModal} onOpenChange={setShowLockedModal}>
      <DialogContent className="sm:max-w-[400px] p-8 border-none bg-site-bg">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/10">
              <Lock className="w-6 h-6" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <DialogTitle className="text-xl font-bold tracking-tight">
              🔒 {lockedFeatureName || "This is a Pro feature"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              You already qualify for free access to this feature. Unlock <span className="text-foreground font-bold">Linkmate Pro</span> for 1 month and keep building your momentum.
            </DialogDescription>
          </div>

          <div className="bg-secondary/20 rounded-2xl p-4 border border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">Linkmate Pro Free Trial</p>
                <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide">30 days • No payment needed</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link href="/upgrade" className="w-full block">
              <Button className="w-full h-12 rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all bg-primary">
                Activate Now
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              className="w-full h-11 rounded-xl text-muted-foreground text-xs font-bold"
              onClick={() => setShowLockedModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

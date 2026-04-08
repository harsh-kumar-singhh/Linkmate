"use client";

import { useTrialTrigger } from "@/context/TrialTriggerContext";
import { useUser } from "@/context/UserContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, Rocket, Zap, Clock } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export function TrialModal() {
  const { showTrialModal, setShowTrialModal } = useTrialTrigger();
  const { isPro } = useUser();

  if (isPro) return null;

  return (
    <Dialog open={showTrialModal} onOpenChange={setShowTrialModal}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none bg-site-bg">
        <div className="relative p-8 pt-12">
          {/* Decorative Background */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
          
          <div className="relative space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <Rocket className="w-8 h-8" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <DialogTitle className="text-2xl font-bold tracking-tight">
                🚀 You just created your first post.
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-[15px] leading-relaxed">
                Now imagine this running automatically every day. You've unlocked <span className="text-primary font-bold">Linkmate Pro</span> — <span className="text-foreground uppercase text-xs font-black tracking-widest px-1.5 py-0.5 rounded bg-primary/20">Free</span> for 1 month.
              </DialogDescription>
            </div>

            <div className="grid grid-cols-1 gap-3 py-4">
              <FeatureItem 
                icon={<Sparkles className="w-4 h-4" />} 
                title="AI-powered content system" 
                desc="Infinite post ideas and generations"
              />
              <FeatureItem 
                icon={<Clock className="w-4 h-4" />} 
                title="Auto scheduling" 
                desc="Set and forget your entire month"
              />
              <FeatureItem 
                icon={<Zap className="w-4 h-4" />} 
                title="Growth automation" 
                desc="Autopilot and smart strategies"
              />
            </div>

            <div className="space-y-3 pt-2">
              <Link href="/upgrade" className="w-full block">
                <Button 
                  className="w-full h-14 rounded-xl text-[15px] font-black shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all bg-primary"
                  onClick={() => setShowTrialModal(false)}
                >
                  Activate Free Pro
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="w-full h-12 rounded-xl text-muted-foreground font-bold hover:text-foreground"
                onClick={() => setShowTrialModal(false)}
              >
                Maybe later
              </Button>
            </div>
            
            <p className="text-[10px] text-center text-muted-foreground font-medium uppercase tracking-[0.2em]">
               Limited early access • No payment required
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex items-start gap-4 p-3 rounded-2xl border border-border/40 bg-secondary/5 hover:bg-secondary/10 transition-colors group">
      <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="space-y-0.5">
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

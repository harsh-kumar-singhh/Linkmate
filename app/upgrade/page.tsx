"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Sparkles, Zap, Rocket, Calendar, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function UpgradePage() {
  const { user, isPro, refreshUser } = useUser();
  const router = useRouter();
  const [isActivating, setIsActivating] = useState(false);

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      const response = await fetch("/api/user/activate-trial", {
        method: "POST",
      });

      if (response.ok) {
        await refreshUser();
        router.push("/dashboard?trial_activated=true");
      } else {
        alert("Failed to activate trial. Please try again.");
      }
    } catch (error) {
      console.error("Activation error:", error);
      alert("Something went rowng.");
    } finally {
      setIsActivating(false);
    }
  };

  if (isPro) {
    return (
      <div className="min-h-screen bg-site-bg flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
            <Rocket className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold">You're already a Pro!</h1>
          <p className="text-muted-foreground">Enjoy your premium features.</p>
          <Link href="/dashboard">
            <Button size="lg" className="rounded-xl mt-4">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-site-bg py-20 px-4 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[128px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-12 relative z-10">
        <div className="flex justify-between items-center">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Back to dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
            <Sparkles className="w-3 h-3" /> Early User Offer
          </div>
        </div>

        <div className="text-center space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black tracking-tight leading-[0.9] text-foreground"
          >
            You’ve unlocked <br /> <span className="text-primary">early access 🎁</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-muted-foreground font-medium max-w-xl mx-auto"
          >
            Get Linkmate Pro <span className="text-foreground">FREE for 1 month</span>. <br className="hidden md:block" /> No payment required today.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch pt-8">
          {/* Main Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full border-primary/20 bg-card/50 backdrop-blur-xl rounded-[32px] overflow-hidden shadow-premium flex flex-col">
              <div className="p-8 space-y-8 flex-1">
                <div>
                   <h3 className="text-2xl font-bold">Pro Trial</h3>
                   <p className="text-muted-foreground text-sm">Perfect for building momentum.</p>
                </div>

                <div className="flex items-baseline gap-2">
                   <span className="text-5xl font-black tracking-tighter">₹0</span>
                   <span className="text-muted-foreground line-through decoration-primary/40">₹249</span>
                   <span className="text-muted-foreground text-sm">/month</span>
                </div>

                <div className="space-y-4">
                   <FeatureItem text="Unlimited AI Content Generation" />
                   <FeatureItem text="Unlimited Post Scheduling" />
                   <FeatureItem text="Autopilot Growth System" />
                   <FeatureItem text="Priority AI Models" />
                </div>
              </div>

              <div className="p-8 pt-0 mt-auto">
                <Button 
                  onClick={handleActivate}
                  disabled={isActivating}
                  className="w-full h-16 rounded-2xl text-lg font-black shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all bg-primary"
                >
                  {isActivating ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    "Start Free Month"
                  )}
                </Button>
                <p className="text-[10px] text-center text-muted-foreground mt-4 uppercase tracking-[0.2em] font-medium">
                  Cancel anytime • Renews at ₹249 after 30 days
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Side Info */}
          <div className="space-y-6 flex flex-col justify-center">
            <InfoBox 
              icon={<Zap className="w-5 h-5 text-amber-500" />}
              title="Zero Friction"
              text="No credit card, no commitment. Just build."
            />
            <InfoBox 
              icon={<Rocket className="w-5 h-5 text-blue-500" />}
              title="Scale Faster"
              text="Automate your LinkedIn presence and focus on building."
            />
            <InfoBox 
              icon={<Calendar className="w-5 h-5 text-emerald-500" />}
              title="Full Access"
              text="Experience everything Linkmate Pro has to offer."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <Check className="w-3 h-3" />
      </div>
      <span className="text-sm font-medium text-foreground/80">{text}</span>
    </div>
  );
}

function InfoBox({ icon, title, text }: { icon: React.ReactNode, title: string, text: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="p-6 rounded-[24px] border border-border/40 bg-card/30 backdrop-blur-sm"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-foreground">{title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
        </div>
      </div>
    </motion.div>
  );
}

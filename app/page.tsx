"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatedCard } from "@/components/animated/AnimatedCard"
import { ArrowRight, CheckCircle2, Clock, Sparkles, User2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Home() {
  const router = useRouter()



  return (
    <main className="min-h-screen bg-site-bg selection:bg-primary/10 transition-colors duration-500 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        <div className="max-w-5xl mx-auto">
          <AnimatedCard
            animation="fade-in-up"
            className="flex flex-col items-center text-center space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-semibold tracking-wider uppercase mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Founder Built • No Hype
            </div>

            <h1 className="text-6xl md:text-[8rem] font-bold tracking-tight leading-[0.9] text-site-fg text-balance">
              Calm <br />
              <span className="text-primary italic">Consistency.</span>
            </h1>

            <p className="text-lg md:text-2xl text-muted-foreground max-w-xl mx-auto font-light leading-relaxed">
              The professional scheduler for people who value focus over noise. Show up on LinkedIn every day, without being on LinkedIn every day.
            </p>

            <AnimatedCard
              animation="fade-in-scale"
              delay={0.4}
              className="pt-8"
            >
              <Link href="/signup">
                <Button size="lg" className="h-16 px-10 text-lg rounded-full shadow-premium hover:shadow-premium-dark transition-all duration-300">
                  Start for free <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </AnimatedCard>
          </AnimatedCard>
        </div>
      </section>

      {/* Value Prop Section */}
      <section className="py-32 px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <AnimatedCard
            animation="stagger-container"
            viewport
            className="grid grid-cols-1 md:grid-cols-3 gap-16"
          >
            <AnimatedCard animation="fade-in-up" className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight">Time Recovery</h3>
              <p className="text-muted-foreground leading-relaxed">
                LinkedIn shouldn&apos;t be a daily chore. Batch your thoughts once, let us handle the delivery.
              </p>
            </AnimatedCard>

            <AnimatedCard animation="fade-in-up" className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight">Pure Reliability</h3>
              <p className="text-muted-foreground leading-relaxed">
                No complex workflows. Just a clean calendar and a dependable publishing engine that never misses.
              </p>
            </AnimatedCard>

            <AnimatedCard animation="fade-in-up" className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight">Pure Intelligence</h3>
              <p className="text-muted-foreground leading-relaxed">
                AI that learns your signature, not one that shouts over it. Refine your thoughts with a partner that understands professional nuance.
              </p>
            </AnimatedCard>
          </AnimatedCard>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto space-y-24">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">How it works.</h2>
            <p className="text-muted-foreground">Three steps to professional consistency.</p>
          </div>

          <div className="grid grid-cols-1 gap-20">
            {[
              { step: "01", title: "Connect", desc: "Link your LinkedIn account securely via OAuth in seconds." },
              { step: "02", title: "Create", desc: "Write your posts or use AI to draft content that sounds like you." },
              { step: "03", title: "Schedule", desc: "Drop posts into your calendar and focus on your actual work." }
            ].map((item, i) => (
              <AnimatedCard
                key={i}
                animation="fade-in-up"
                viewport
                className="flex flex-col md:flex-row gap-8 md:items-center"
              >
                <div className="text-6xl md:text-8xl font-bold text-primary/10 tabular-nums">
                  {item.step}
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight">{item.title}</h3>
                  <p className="text-xl text-muted-foreground leading-relaxed max-w-md">
                    {item.desc}
                  </p>
                </div>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* Why built different */}
      <section className="py-32 px-6 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none uppercase">
            Built for focus,<br />not for engagement hacks.
          </h2>
          <p className="text-xl md:text-2xl opacity-70 font-light max-w-2xl mx-auto">
            We don&apos;t use hype. We don&apos;t use gamification. We build tools for founders and builders who have better things to do than refresh their feed.
          </p>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-16">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold italic">Perfect for...</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {["Solofounders", "Technical Architects", "Quiet Builders", "Executive Leaders", "Digital Gardeners"].map((tag, i) => (
              <span key={i} className="px-6 py-3 rounded-full border border-border text-lg font-medium hover:bg-secondary transition-colors cursor-default">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-48 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-50">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]"></div>
        </div>

        <AnimatedCard
          animation="default"
          viewport
          className="max-w-xl mx-auto text-center space-y-8 relative z-10"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Ready to build your presence, calmly?</h2>
          <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="h-16 px-12 text-lg rounded-full w-full">
                Get started free
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="ghost" className="h-16 px-12 text-lg rounded-full font-medium">
                Sign in
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">No credit card required. Connect in 2 minutes.</p>
        </AnimatedCard>
      </section>

      <footer className="py-12 px-6 border-t border-border mt-20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight uppercase">
            Linkmate
          </div>
          <p className="text-sm text-muted-foreground font-light">
            © 2026 Built for builders.
          </p>
        </div>
      </footer>
    </main>
  );
}

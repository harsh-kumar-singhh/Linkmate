"use client"

import { Sparkles, Bot, Calendar, Send, Activity } from "lucide-react"
import { SplineScene } from "@/components/ui/splite"
import { Section } from "@/components/stitch/Section"
import { Container, Grid, Flex } from "@/components/stitch/Layout"
import { Heading, Text } from "@/components/stitch/Typography"
import { SmoothTransition } from "@/components/anti-gravity/SmoothTransition"
import { TiltReveal } from "@/components/anti-gravity/TiltReveal"

const steps = [
  { icon: Sparkles, title: "Idea Vault", desc: "Drop messy thoughts into your vault." },
  { icon: Bot, title: "Generate AI", desc: "AI structures it into your voice." },
  { icon: Calendar, title: "Schedule", desc: "Auto-slots into your best times." },
  { icon: Send, title: "Post", desc: "Goes live while you sleep." },
  { icon: Activity, title: "Repeat", desc: "Compound your authority." }
]

export function HowItWorks() {
  return (
    <Section padding="xl" className="relative overflow-hidden bg-white/30 dark:bg-white/5">
      <Container size="lg">
        <Grid cols={2} gap="xl" className="items-center">
          {/* Left Column: Explanation & Steps */}
          <SmoothTransition direction="up" distance={40}>
            <Flex direction="col" align="start" gap="lg" className="max-w-md">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/20 text-primary text-xs font-semibold tracking-wider uppercase mb-2">
                <Activity className="w-3.5 h-3.5" />
                The Autopilot Pipeline
              </div>
              <Heading level={2} className="text-4xl md:text-5xl font-bold tracking-tight">
                How LinkMate Works
              </Heading>
              <Text variant="lead" className="opacity-70 mt-2">
                The calmest way to build your personal monopoly. Set the trajectory, we handle the daily execution.
              </Text>

              <div className="mt-8 space-y-6 w-full">
                {steps.map((step, i) => (
                  <SmoothTransition key={i} delay={i * 0.1} direction="left" distance={20}>
                    <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/60 dark:hover:bg-white/10 transition-colors group">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                        <step.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <Heading level={6} className="font-bold underline decoration-primary/30 underline-offset-4 mb-1">
                          {step.title}
                        </Heading>
                        <Text variant="small" className="opacity-60">{step.desc}</Text>
                      </div>
                    </div>
                  </SmoothTransition>
                ))}
              </div>
            </Flex>
          </SmoothTransition>

          {/* Right Column: 3D Scene */}
          <SmoothTransition delay={0.3} direction="up" distance={60}>
            <TiltReveal depth={20} className="relative">
              <div className="relative w-full h-[400px] md:h-[500px] rounded-2xl bg-white/80 dark:bg-zinc-900/40 backdrop-blur-xl shadow-2xl border border-white/20 overflow-hidden ring-1 ring-black/5">
                <SplineScene 
                  scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                  className="w-full h-full"
                />
                
                {/* Subtle Overlay to ensure branding consistency */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-primary/5 to-transparent opacity-30" />
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl -z-10" />
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-secondary/10 rounded-full blur-3xl -z-10" />
            </TiltReveal>
          </SmoothTransition>
        </Grid>
      </Container>
    </Section>
  )
}

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

          {/* Right Column: Empty (allowing background 3D to show through) */}
          <div className="hidden md:block h-[400px] md:h-[500px]" />
        </Grid>
      </Container>
    </Section>
  )
}

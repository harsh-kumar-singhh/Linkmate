"use client"

import Link from "next/link"
import { ArrowRight, Bot, Calendar, Sparkles, Send, MoveRight, PenTool, BarChart3, Activity } from "lucide-react"

// Stitch Components
import { Section } from "@/components/stitch/Section"
import { Container, Grid, Flex } from "@/components/stitch/Layout"
import { Heading, Text } from "@/components/stitch/Typography"
import { CtaBlock } from "@/components/stitch/CtaBlock"
import { Button } from "@/components/ui/button"

// Anti-Gravity Components
import { SmoothTransition } from "@/components/anti-gravity/SmoothTransition"
import { ParallaxLayer } from "@/components/anti-gravity/ParallaxLayer"
import { TiltReveal } from "@/components/anti-gravity/TiltReveal"
import { DepthContainer, DepthLayer } from "@/components/anti-gravity/DepthContainer"
import { FloatingCard } from "@/components/anti-gravity/FloatingCard"
import { BackgroundPathsLayer } from "@/components/ui/background-paths"
import { HowItWorks } from "@/components/marketing/HowItWorks"

export default function Home() {
  return (
    <main className="dark min-h-screen bg-site-bg selection:bg-primary/10 transition-colors duration-500 overflow-x-hidden relative z-10">
      <BackgroundPathsLayer />
      
      {/* 1. Hero Section */}
      <Section padding="xl" className="pt-32 md:pt-48 pb-32 relative">
        <DepthContainer className="w-full h-full min-h-[70vh]">
          {/* Circular glows removed for cleaner visual */}
          
          <Container className="relative z-10 w-full h-full">
            <Grid cols={2} gap="xl" className="items-center">
              <SmoothTransition direction="up" distance={40} className="w-full">
                <CtaBlock
                  align="left"
                  title={
                    <Flex direction="col" align="start" gap="md">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-border text-primary text-xs font-semibold tracking-wider uppercase">
                        <Sparkles className="w-3.5 h-3.5" />
                        LinkMate Autopilot
                      </div>
                      <Heading level={1} className="leading-[0.85]">
                        Your <br/> LinkedIn <br/>
                        <span className="text-primary italic">runs itself.</span>
                      </Heading>
                    </Flex>
                  }
                  description={
                    <Text variant="lead" className="max-w-md mt-4">
                      The calmest way to build your personal monopoly. Set the trajectory, we handle the daily execution.
                    </Text>
                  }
                  actions={
                    <SmoothTransition delay={0.2} distance={20} className="w-full mt-4 flex items-center justify-start">
                      <TiltReveal>
                        <Link href="/signup">
                          <Button size="lg" className="h-16 px-10 text-lg rounded-full shadow-premium hover:shadow-premium-dark transition-all duration-300">
                            Start autopilot <ArrowRight className="ml-2 w-5 h-5" />
                          </Button>
                        </Link>
                      </TiltReveal>
                    </SmoothTransition>
                  }
                />
              </SmoothTransition>

              {/* 3D Floating Cards representing posts */}
              <div className="relative hidden md:block h-[500px] w-full perspective-[1000px]">
                <SmoothTransition delay={0.3} className="absolute inset-0">
                  {/* Card 1: Idea */}
                  <ParallaxLayer offset={30} className="absolute top-10 left-10 z-10">
                    <TiltReveal depth={15} scale={1.05}>
                      <FloatingCard yOffset={10} duration={5} className="w-64 p-6 bg-card/80 rounded-2xl shadow-premium border border-border">
                         <div className="flex items-center gap-3 mb-3">
                           <div className="p-2 bg-primary/10 rounded-lg"><Sparkles className="w-4 h-4 text-primary" /></div>
                           <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Generated</span>
                         </div>
                         <div className="space-y-2">
                           <div className="h-2 bg-secondary rounded-full w-full opacity-50"></div>
                           <div className="h-2 bg-secondary rounded-full w-5/6 opacity-50"></div>
                           <div className="h-2 bg-secondary rounded-full w-4/6 opacity-50"></div>
                         </div>
                      </FloatingCard>
                    </TiltReveal>
                  </ParallaxLayer>

                  {/* Card 2: Schedule */}
                  <ParallaxLayer offset={-20} className="absolute top-48 right-0 z-20">
                    <TiltReveal depth={20} scale={1.05}>
                      <FloatingCard delay={1.5} yOffset={15} duration={6} className="w-72 p-6 bg-card/90 rounded-2xl shadow-premium border border-border/60">
                         <div className="flex items-center justify-between gap-3 mb-4">
                           <div className="flex items-center gap-2">
                             <div className="p-2 bg-blue-500/10 rounded-lg"><Calendar className="w-4 h-4 text-blue-500" /></div>
                             <span className="text-xs font-semibold uppercase tracking-wider">Scheduled</span>
                           </div>
                           <span className="text-xs text-muted-foreground font-mono">Tomorrow 9:00 AM</span>
                         </div>
                         <div className="space-y-2">
                           <div className="h-3 bg-primary/20 rounded-full w-full"></div>
                           <div className="h-3 bg-primary/20 rounded-full w-3/4"></div>
                         </div>
                      </FloatingCard>
                    </TiltReveal>
                  </ParallaxLayer>

                  {/* Card 3: Publish */}
                  <ParallaxLayer offset={15} className="absolute bottom-10 left-20 z-0 opacity-60 blur-[1px]">
                    <TiltReveal depth={10}>
                      <FloatingCard delay={0.8} yOffset={8} duration={4.5} className="w-56 p-5 bg-secondary/40 rounded-2xl border border-border/40">
                         <div className="flex items-center gap-3 mb-3">
                           <div className="p-1.5 bg-green-500/10 rounded-lg"><Send className="w-3 h-3 text-green-500" /></div>
                           <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Live</span>
                         </div>
                         <div className="h-8 bg-secondary/50 rounded-lg w-full"></div>
                      </FloatingCard>
                    </TiltReveal>
                  </ParallaxLayer>

                </SmoothTransition>
              </div>
            </Grid>
          </Container>
        </DepthContainer>
      </Section>


      {/* 2. Problem Section */}
      <Section variant="default" padding="xl" className="bg-secondary/5 relative overflow-hidden">
        {/* Subtle glow for section separation instead of hard border */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-50" />
        <ParallaxLayer offset={-30}>
          <Container size="sm" className="text-center">
            <SmoothTransition>
              <Heading level={2} className="mx-auto text-balance leading-tight tracking-tighter opacity-90 max-w-2xl font-light italic">
                “Consistency is a trap if you have to log in every single day.”
              </Heading>
            </SmoothTransition>
            <SmoothTransition delay={0.2} className="mt-12">
              <Text variant="lead" className="mx-auto text-balance opacity-60">
                You have real work to do. Let the system handle the distribution.
              </Text>
            </SmoothTransition>
          </Container>
        </ParallaxLayer>
      </Section>

      {/* 3. System Section (How It Works) */}
      <HowItWorks />

      {/* 4. Proof / Trust Section */}
      <Section variant="subtle" padding="xl" className="relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/2 h-full bg-primary/[0.02] pointer-events-none" />
        <Container size="lg">
          <Grid cols={2} gap="xl" className="items-center">
            <SmoothTransition>
              <Flex direction="col" align="start" gap="lg" className="max-w-md">
                <Heading level={2}>Built for founders who value depth.</Heading>
                <Text variant="lead" className="opacity-80">
                  Stop playing the engagement game. Start building a compounding asset of your best thoughts.
                </Text>
                <Grid cols={2} gap="sm" className="mt-4 w-full">
                  <div className="p-4 bg-card rounded-xl border border-border">
                    <Activity className="w-5 h-5 text-green-500 mb-2" />
                    <div className="text-2xl font-bold">100%</div>
                    <Text variant="small">Uptime delivery</Text>
                  </div>
                  <div className="p-4 bg-card rounded-xl border border-border">
                    <BarChart3 className="w-5 h-5 text-blue-500 mb-2" />
                    <div className="text-2xl font-bold">0 hrs</div>
                    <Text variant="small">Wasted on scrolling</Text>
                  </div>
                </Grid>
              </Flex>
            </SmoothTransition>

            <ParallaxLayer offset={-30} className="relative h-[400px]">
               <DepthContainer className="w-full h-full">
                 <DepthLayer z={0}>
                    <div className="absolute inset-0 bg-card/60 rounded-3xl border border-border shadow-premium-dark p-8 flex flex-col justify-center gap-6">
                       <TitlePlaceholder title="CEO, Tech Startup" />
                       <TitlePlaceholder title="Lead Architect" />
                       <TitlePlaceholder title="Indie Maker" width="w-2/3" />
                       <TitlePlaceholder title="Growth Advisor" width="w-3/4" />
                    </div>
                 </DepthLayer>
               </DepthContainer>
            </ParallaxLayer>
          </Grid>
        </Container>
      </Section>

      {/* 5. Final CTA */}
      <Section padding="xl" className="relative">
        <DepthContainer className="w-full h-full">
          <Container size="sm" className="relative z-10 w-full h-full">
            <SmoothTransition>
              <CtaBlock
                title={<Heading level={2} className="text-5xl">Reclaim your calendar.</Heading>}
                description={<Text variant="lead">Join builders who automate their authority. No credit card required.</Text>}
                actions={
                  <>
                    <TiltReveal scale={1.05} depth={10}>
                      <Link href="/signup">
                        <Button size="lg" className="h-16 px-12 text-lg rounded-full w-full shadow-premium hover:shadow-premium-dark transition-all">
                          Start Engine
                        </Button>
                      </Link>
                    </TiltReveal>
                    <TiltReveal>
                      <Link href="/login">
                        <Button size="lg" variant="ghost" className="h-16 px-12 text-lg rounded-full font-medium border border-border bg-secondary/20 hover:bg-secondary/40">
                          Sign in
                        </Button>
                      </Link>
                    </TiltReveal>
                  </>
                }
              />
            </SmoothTransition>
          </Container>
        </DepthContainer>
      </Section>

      <footer className="py-12 px-6 bg-background relative">
        {/* Seamless transition instead of hard border */}
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-t from-background to-transparent -translate-y-full pointer-events-none" />
        <Container className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div className="font-bold text-xl tracking-tight uppercase flex items-center gap-2 justify-center md:justify-start">
            <div className="w-2 h-2 rounded-full bg-primary" />
            Linkmate
          </div>
          <Text variant="small">© 2026 Built for builders.</Text>
        </Container>
      </footer>
    </main>
  )
}

function TitlePlaceholder({ title, width = "w-full" }: { title: string, width?: string }) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-secondary/10 ${width}`}>
      <div className="w-10 h-10 rounded-full bg-primary/10 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-2 bg-site-fg/20 rounded-full w-1/3" />
        <div className="text-xs font-semibold tracking-wider uppercase opacity-60">{title}</div>
      </div>
    </div>
  )
}

